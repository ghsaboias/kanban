import type { CardDeletedEvent } from '@kanban/shared/realtime';
import { Request, Response } from 'express';
import { prisma } from '../database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { activityLogger } from '../services/activityLoggerSingleton';
import { broadcastToRoom } from '../utils/socketBroadcaster';

// Activity logger is shared via singleton

export const deleteCardHandler = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;

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

    await prisma.card.delete({
        where: { id }
    });

    await prisma.card.updateMany({
        where: {
            columnId: existingCard.columnId,
            position: { gt: existingCard.position }
        },
        data: {
            position: { decrement: 1 }
        }
    });

    // Log activity
    try {
        await activityLogger.logActivity({
            entityType: 'CARD',
            entityId: id,
            action: 'DELETE',
            boardId: existingCard.column.boardId,
            columnId: existingCard.columnId,
            userId: currentUser.id,
            meta: {
                title: existingCard.title,
                description: existingCard.description,
                priority: existingCard.priority,
                assigneeId: existingCard.assigneeId,
                assigneeName: existingCard.assignee?.name || null,
                columnId: existingCard.columnId,
                columnTitle: existingCard.column.title,
                position: existingCard.position
            },
            priority: 'HIGH',
            broadcastRealtime: true,
            initiatorSocketId: req.get('x-socket-id')
        });
    } catch (error) {
        console.error('Failed to log card deletion activity:', error);
    }

    // Emit real-time event to all users in the board room
    const cardDeletedEvent: CardDeletedEvent = {
        boardId: existingCard.column.boardId,
        cardId: id
    };
    // Broadcast real-time event
    broadcastToRoom(
        `board-${existingCard.column.boardId}`,
        'card:deleted',
        cardDeletedEvent,
        req.get('x-socket-id') || undefined
    );

    res.json({
        success: true,
        message: 'Card excluído com sucesso'
    });
});
