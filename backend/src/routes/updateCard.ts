import type { CardUpdatedEvent } from '@kanban/shared/realtime';
import { Request, Response } from 'express';
import { prisma } from '../database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { activityLogger } from '../services/activityLoggerSingleton';
import { UpdateCardRequest } from '../types/api';
import { toPriority } from '../utils/priority';
import { sanitizeDescription } from '../utils/sanitize';
import { broadcastToRoom } from '../utils/socketBroadcaster';

// Activity logger is shared via singleton

export const updateCardHandler = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const { title, description, priority, assigneeId, position, deadline, riskLevel, ownerId }: UpdateCardRequest = req.body;

    const existingCard = await prisma.card.findUnique({
        where: { id },
        include: {
            assignee: {
                select: { id: true, name: true }
            },
            column: {
                select: { id: true, title: true, boardId: true }
            }
        }
    });

    if (!existingCard) {
        throw new AppError('Card não encontrado', 404);
    }

    // Authenticated user
    const currentUser = res.locals.user;
    if (!currentUser) {
        throw new AppError('Usuário não autenticado', 401);
    }

    let assigneeUser = null;
    if (assigneeId) {
        assigneeUser = await prisma.user.findUnique({
            where: { id: assigneeId },
            select: { id: true, name: true }
        });

        if (!assigneeUser) {
            throw new AppError('Usuário responsável não encontrado', 404);
        }
    }

    let ownerUser = null;
    if (ownerId) {
        ownerUser = await prisma.user.findUnique({
            where: { id: ownerId },
            select: { id: true, name: true }
        });

        if (!ownerUser) {
            throw new AppError('Owner não encontrado', 404);
        }
    }

    if (position !== undefined && position !== existingCard.position) {
        const columnId = existingCard.columnId;
        const oldPosition = existingCard.position;
        const newPosition = position;

        if (newPosition < oldPosition) {
            await prisma.card.updateMany({
                where: {
                    columnId,
                    position: {
                        gte: newPosition,
                        lt: oldPosition
                    }
                },
                data: {
                    position: { increment: 1 }
                }
            });
        } else {
            await prisma.card.updateMany({
                where: {
                    columnId,
                    position: {
                        gt: oldPosition,
                        lte: newPosition
                    }
                },
                data: {
                    position: { decrement: 1 }
                }
            });
        }
    }

    // Track changes for activity logging
    const changes: string[] = [];
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    if (title && title !== existingCard.title) {
        changes.push('title');
        oldValues.title = existingCard.title;
        newValues.title = title;
    }

    if (description !== undefined && sanitizeDescription(description) !== existingCard.description) {
        changes.push('description');
        oldValues.description = existingCard.description;
        newValues.description = sanitizeDescription(description);
    }

    if (priority && priority !== existingCard.priority) {
        changes.push('priority');
        oldValues.priority = existingCard.priority;
        newValues.priority = priority;
    }

    if (assigneeId !== undefined && assigneeId !== existingCard.assigneeId) {
        changes.push('assigneeId');
        oldValues.assigneeId = existingCard.assigneeId;
        newValues.assigneeId = assigneeId;
    }

    // Track M&A field changes
    if (deadline !== undefined && deadline !== existingCard.deadline) {
        changes.push('deadline');
        oldValues.deadline = existingCard.deadline;
        newValues.deadline = deadline;
    }

    if (riskLevel !== undefined && riskLevel !== existingCard.riskLevel) {
        changes.push('riskLevel');
        oldValues.riskLevel = existingCard.riskLevel;
        newValues.riskLevel = riskLevel;
    }

    if (ownerId !== undefined && ownerId !== existingCard.ownerId) {
        changes.push('ownerId');
        oldValues.ownerId = existingCard.ownerId;
        newValues.ownerId = ownerId;
    }

    // Handle position changes separately (for reorder detection)
    const isPositionChange = position !== undefined && position !== existingCard.position;

    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = sanitizeDescription(description);
    if (priority) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (position !== undefined) updateData.position = position;
    // M&A fields
    if (deadline !== undefined) updateData.deadline = deadline;
    if (riskLevel !== undefined) updateData.riskLevel = riskLevel;
    if (ownerId !== undefined) updateData.ownerId = ownerId;

    const card = await prisma.card.update({
        where: { id },
        data: updateData,
        include: {
            assignee: {
                select: { id: true, name: true, email: true }
            },
            owner: {
                select: { id: true, name: true, email: true }
            },
            column: {
                select: { id: true, title: true, boardId: true }
            }
        }
    });

    // Log activity based on what changed
    if (isPositionChange && changes.length === 0) {
        // Pure position change = REORDER
        try {
            await activityLogger.logActivity({
                entityType: 'CARD',
                entityId: card.id,
                action: 'REORDER',
                boardId: card.column.boardId,
                columnId: card.columnId,
                userId: currentUser.id,
                meta: {
                    oldPosition: existingCard.position,
                    newPosition: position,
                    columnId: card.columnId,
                    columnTitle: card.column.title
                },
                priority: 'LOW', // REORDER actions are low priority (rate limited)
                broadcastRealtime: true,
                initiatorSocketId: req.get('x-socket-id')
            });
        } catch (error) {
            console.error('Failed to log card reorder activity:', error);
        }
    } else if (changes.length > 0) {
        // Field changes = UPDATE
        try {
            const meta: Record<string, unknown> = {
                changes,
                oldValues,
                newValues
            };

            // Add assignee name if assignee was changed
            if (changes.includes('assigneeId') && assigneeUser) {
                meta.assigneeName = assigneeUser.name;
            }

            await activityLogger.logActivity({
                entityType: 'CARD',
                entityId: card.id,
                action: 'UPDATE',
                boardId: card.column.boardId,
                columnId: card.columnId,
                userId: currentUser.id,
                meta,
                priority: 'HIGH',
                broadcastRealtime: true,
                initiatorSocketId: req.get('x-socket-id')
            });
        } catch (error) {
            console.error('Failed to log card update activity:', error);
        }
    }

    // Emit real-time event to all users in the board room
    const cardUpdatedEvent: CardUpdatedEvent = {
        boardId: card.column.boardId,
        card: {
            id: card.id,
            title: card.title,
            description: card.description,
            priority: toPriority(card.priority),
            position: card.position,
            assignee: card.assignee
        }
    };
    // Broadcast real-time event
    broadcastToRoom(
        `board-${card.column.boardId}`,
        'card:updated',
        cardUpdatedEvent,
        req.get('x-socket-id') || undefined
    );

    res.json({
        success: true,
        data: card,
        message: 'Card atualizado com sucesso'
    });
});
