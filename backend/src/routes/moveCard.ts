import type { CardMovedEvent } from '@kanban/shared/realtime';
import { Request, Response } from 'express';
import { prisma } from '../database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { ActivityLogger } from '../services/activityLogger';
import { MoveCardRequest } from '../types/api';
import { toPriority } from '../utils/priority';
import { broadcastToRoom } from '../utils/socketBroadcaster';

export const moveCardHandler = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const { columnId, position }: MoveCardRequest = req.body;

    if (!columnId || position === undefined || position < 0) {
        throw new AppError('ID da coluna e posição são obrigatórios', 400);
    }

    // Use transaction for atomic card moves to prevent concurrency issues
    const result = await prisma.$transaction(async (tx) => {
        const existingCard = await tx.card.findUnique({
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

        const targetColumn = await tx.column.findUnique({
            where: { id: columnId },
            select: { id: true, title: true, boardId: true }
        });

        if (!targetColumn) {
            throw new AppError('Coluna de destino não encontrada', 404);
        }

        // Ensure both columns are on the same board
        if (existingCard.column.boardId !== targetColumn.boardId) {
            throw new AppError('Não é possível mover cards entre quadros diferentes', 400);
        }

        const oldColumnId = existingCard.columnId;
        const oldPosition = existingCard.position;

        if (oldColumnId === columnId && oldPosition === position) {
            // Need to include relations for consistent response structure
            const cardWithRelations = await tx.card.findUnique({
                where: { id },
                include: {
                    assignee: {
                        select: { id: true, name: true, email: true }
                    },
                    column: {
                        select: { id: true, title: true, boardId: true }
                    }
                }
            });
            return {
                card: cardWithRelations!,
                oldColumnId,
                targetColumn,
                existingCard,
                wasMove: false,
                oldPosition: existingCard.position
            };
        }

        // Get current max position in target column to prevent position conflicts
        const maxPosition = await tx.card.findFirst({
            where: { columnId },
            select: { position: true },
            orderBy: { position: 'desc' }
        });

        const targetPosition = Math.min(position, (maxPosition?.position ?? -1) + 1);

        if (oldColumnId === columnId) {
            // Same column reorder - use safer position adjustment
            if (targetPosition < oldPosition) {
                await tx.card.updateMany({
                    where: {
                        columnId,
                        position: {
                            gte: targetPosition,
                            lt: oldPosition
                        }
                    },
                    data: {
                        position: { increment: 1 }
                    }
                });
            } else if (targetPosition > oldPosition) {
                await tx.card.updateMany({
                    where: {
                        columnId,
                        position: {
                            gt: oldPosition,
                            lte: targetPosition
                        }
                    },
                    data: {
                        position: { decrement: 1 }
                    }
                });
            }
        } else {
            // Cross-column move
            // 1. Shift cards in source column to fill gap
            await tx.card.updateMany({
                where: {
                    columnId: oldColumnId,
                    position: { gt: oldPosition }
                },
                data: {
                    position: { decrement: 1 }
                }
            });

            // 2. Make space in target column
            await tx.card.updateMany({
                where: {
                    columnId,
                    position: { gte: targetPosition }
                },
                data: {
                    position: { increment: 1 }
                }
            });
        }

        // 3. Move the card
        const card = await tx.card.update({
            where: { id },
            data: {
                columnId,
                position: targetPosition
            },
            include: {
                assignee: {
                    select: { id: true, name: true, email: true }
                },
                column: {
                    select: { id: true, title: true, boardId: true }
                }
            }
        });

        return {
            card,
            oldColumnId,
            targetColumn,
            existingCard,
            wasMove: true,
            oldPosition
        };
    });

    const card = result.card;
    const oldColumnId = result.oldColumnId;
    const targetColumn = result.targetColumn;
    const existingCard = result.existingCard;
    const wasMove = result.wasMove;
    const oldPosition = result.oldPosition;

    // Authenticated user
    const currentUser = res.locals.user;
    if (!currentUser) {
        throw new AppError('Usuário não autenticado', 401);
    }

    // Log activity only if something actually changed
    if (wasMove) {
        if (oldColumnId === columnId) {
            // Same column = REORDER
            try {
                const activityLogger = new ActivityLogger(prisma);
                await activityLogger.logActivity({
                    entityType: 'CARD',
                    entityId: card.id,
                    action: 'REORDER',
                    boardId: card.column.boardId,
                    columnId: card.columnId,
                    userId: currentUser.id,
                    meta: {
                        title: card.title,
                        columnId: card.columnId,
                        columnTitle: card.column.title,
                        oldPosition,
                        newPosition: card.position,
                        assigneeId: card.assigneeId,
                        assigneeName: card.assignee?.name || null
                    },
                    priority: 'LOW', // REORDER actions are low priority (rate limited)
                    broadcastRealtime: true,
                    initiatorSocketId: req.get('x-socket-id')
                });
            } catch (error) {
                console.error('Failed to log card reorder activity:', error);
            }
        } else {
            // Cross-column = MOVE
            try {
                const activityLogger = new ActivityLogger(prisma);
                await activityLogger.logActivity({
                    entityType: 'CARD',
                    entityId: card.id,
                    action: 'MOVE',
                    boardId: card.column.boardId,
                    columnId: card.columnId,
                    userId: currentUser.id,
                    meta: {
                        title: card.title,
                        fromColumnId: oldColumnId,
                        fromColumnTitle: existingCard.column.title,
                        toColumnId: columnId,
                        toColumnTitle: targetColumn.title,
                        oldPosition,
                        newPosition: card.position,
                        assigneeId: card.assigneeId,
                        assigneeName: card.assignee?.name || null
                    },
                    priority: 'HIGH',
                    broadcastRealtime: true,
                    initiatorSocketId: req.get('x-socket-id')
                });
            } catch (error) {
                console.error('Failed to log card move activity:', error);
            }
        }
    }

    // Emit real-time event to all users in the board room
    const cardMovedEvent: CardMovedEvent = {
        boardId: card.column.boardId,
        card: {
            id: card.id,
            title: card.title,
            description: card.description,
            priority: toPriority(card.priority),
            position: card.position,
            assignee: card.assignee
        },
        fromColumnId: oldColumnId,
        toColumnId: columnId,
        position
    };
    // Broadcast real-time event
    broadcastToRoom(
        `board-${card.column.boardId}`,
        'card:moved',
        cardMovedEvent,
        req.get('x-socket-id') || undefined
    );

    res.json({
        success: true,
        data: card,
        message: 'Card movido com sucesso'
    });
});
