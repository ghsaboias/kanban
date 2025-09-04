import type { CardCreatedEvent } from '@kanban/shared/realtime';
import { Request, Response } from 'express';
import { prisma } from '../database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { activityLogger } from '../services/activityLoggerSingleton';
import { CreateCardRequest } from '../types/api';
import { toPriority } from '../utils/priority';
import { sanitizeDescription } from '../utils/sanitize';
import { broadcastToRoom } from '../utils/socketBroadcaster';

// Activity logger is shared via singleton

export const createCardHandler = asyncHandler(async (req: Request, res: Response) => {
    const columnId = req.params.columnId;
    const { title, description, priority, assigneeId, position, deadline, riskLevel, ownerId }: CreateCardRequest = req.body;

    if (!title) {
        throw new AppError('Título é obrigatório', 400);
    }

    // Authenticated user is the creator
    const currentUser = res.locals.user;
    if (!currentUser) {
        throw new AppError('Usuário não autenticado', 401);
    }

    const columnExists = await prisma.column.findUnique({
        where: { id: columnId }
    });

    if (!columnExists) {
        throw new AppError('Coluna não encontrada', 404);
    }

    if (assigneeId) {
        const assigneeExists = await prisma.user.findUnique({
            where: { id: assigneeId }
        });

        if (!assigneeExists) {
            throw new AppError('Usuário responsável não encontrado', 404);
        }
    }

    if (ownerId) {
        const ownerExists = await prisma.user.findUnique({
            where: { id: ownerId }
        });

        if (!ownerExists) {
            throw new AppError('Owner não encontrado', 404);
        }
    }

    let finalPosition = position;
    if (finalPosition === undefined) {
        const lastCard = await prisma.card.findFirst({
            where: { columnId },
            orderBy: { position: 'desc' }
        });
        finalPosition = lastCard ? lastCard.position + 1 : 0;
    } else {
        await prisma.card.updateMany({
            where: {
                columnId,
                position: { gte: finalPosition }
            },
            data: {
                position: { increment: 1 }
            }
        });
    }

    const card = await prisma.card.create({
        data: {
            title,
            description: sanitizeDescription(description),
            priority: priority || 'MEDIUM',
            position: finalPosition,
            columnId,
            createdById: currentUser.id,
            ...(assigneeId && { assigneeId }),
            // M&A fields
            ...(deadline && { deadline }),
            ...(riskLevel && { riskLevel }),
            ...(ownerId && { ownerId })
        },
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

    // Log activity
    try {
        await activityLogger.logActivity({
            entityType: 'CARD',
            entityId: card.id,
            action: 'CREATE',
            boardId: card.column.boardId,
            columnId: card.columnId,
            userId: currentUser.id,
            meta: {
                title: card.title,
                description: card.description,
                priority: card.priority,
                assigneeId: card.assigneeId,
                assigneeName: card.assignee?.name || null,
                columnId: card.columnId,
                columnTitle: card.column.title,
                position: card.position
            },
            priority: 'HIGH',
            broadcastRealtime: true,
            initiatorSocketId: req.get('x-socket-id')
        });
    } catch (error) {
        console.error('Failed to log card creation activity:', error);
        // Don't fail the request if activity logging fails
    }

    // Emit real-time event to all users in the board room
    const cardCreatedEvent: CardCreatedEvent = {
        boardId: card.column.boardId,
        card: {
            id: card.id,
            title: card.title,
            description: card.description,
            priority: toPriority(card.priority),
            position: card.position,
            assignee: card.assignee
        },
        columnId: card.columnId
    };
    // Broadcast real-time event
    broadcastToRoom(
        `board-${card.column.boardId}`,
        'card:created',
        cardCreatedEvent,
        req.get('x-socket-id') || undefined
    );

    res.status(201).json({
        success: true,
        data: card,
        message: 'Card criado com sucesso'
    });
});
