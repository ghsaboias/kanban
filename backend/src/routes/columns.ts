import { Request, Response, Router } from 'express';
import type { ColumnCreatedEvent, ColumnDeletedEvent, ColumnReorderedEvent, ColumnUpdatedEvent } from '@kanban/shared/realtime';
import { prisma } from '../database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { ActivityLogger } from '../services/activityLogger';
import { toPriority } from '../utils/priority';
import { CreateColumnRequest, ReorderColumnRequest, UpdateColumnRequest } from '../types/api';
import { broadcastToRoom } from '../utils/socketBroadcaster';

const router = Router();

// Activity logger instance
const activityLogger = new ActivityLogger(prisma);

router.post('/boards/:boardId/columns', asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.boardId;
  const { title, position }: CreateColumnRequest = req.body;

  if (!title) {
    throw new AppError('Título é obrigatório', 400);
  }

  const boardExists = await prisma.board.findUnique({
    where: { id: boardId }
  });

  if (!boardExists) {
    throw new AppError('Quadro não encontrado', 404);
  }

  let finalPosition = position;
  if (finalPosition === undefined) {
    const lastColumn = await prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' }
    });
    finalPosition = lastColumn ? lastColumn.position + 1 : 0;
  } else {
    await prisma.column.updateMany({
      where: {
        boardId,
        position: { gte: finalPosition }
      },
      data: {
        position: { increment: 1 }
      }
    });
  }

  const column = await prisma.column.create({
    data: {
      title,
      position: finalPosition,
      boardId
    },
    include: {
      _count: {
        select: { cards: true }
      }
    }
  });

  // Authenticated user
  const currentUser = res.locals.user;

  // Log activity
  if (currentUser) {
    try {
      await activityLogger.logActivity({
        entityType: 'COLUMN',
        entityId: column.id,
        action: 'CREATE',
        boardId: column.boardId,
        userId: currentUser.id,
        meta: {
          title: column.title,
          position: column.position
        },
        priority: 'HIGH',
        broadcastRealtime: true,
        initiatorSocketId: req.get('x-socket-id')
      });
    } catch (error) {
      console.error('Failed to log column creation activity:', error);
      // Don't fail the request if activity logging fails
    }
  }

  // Emit real-time event to all users in the board room
  const columnCreatedEvent: ColumnCreatedEvent = {
    boardId,
    column: {
      id: column.id,
      title: column.title,
      position: column.position,
      cards: []
    }
  };
  // Broadcast real-time event
  broadcastToRoom(
    `board-${boardId}`,
    'column:created',
    columnCreatedEvent,
    req.get('x-socket-id') || undefined
  );

  res.status(201).json({
    success: true,
    data: column,
    message: 'Coluna criada com sucesso'
  });
}));

router.put('/columns/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const { title, position }: UpdateColumnRequest = req.body;

  const existingColumn = await prisma.column.findUnique({
    where: { id }
  });

  if (!existingColumn) {
    throw new AppError('Coluna não encontrada', 404);
  }

  if (position !== undefined && position !== existingColumn.position) {
    const boardId = existingColumn.boardId;
    const oldPosition = existingColumn.position;
    const newPosition = position;

    if (newPosition < oldPosition) {
      await prisma.column.updateMany({
        where: {
          boardId,
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
      await prisma.column.updateMany({
        where: {
          boardId,
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

  if (title && title !== existingColumn.title) {
    changes.push('title');
    oldValues.title = existingColumn.title;
    newValues.title = title;
  }

  // Handle position changes separately (for reorder detection)
  const isPositionChange = position !== undefined && position !== existingColumn.position;

  const column = await prisma.column.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(position !== undefined && { position })
    },
    include: {
      cards: {
        include: {
          assignee: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { position: 'asc' }
      }
    }
  });

  // Authenticated user
  const currentUser = res.locals.user;

  // Log activity based on what changed
  if (currentUser) {
    if (changes.length > 0) {
      // Field changes = UPDATE
      try {
        await activityLogger.logActivity({
          entityType: 'COLUMN',
          entityId: column.id,
          action: 'UPDATE',
          boardId: column.boardId,
          userId: currentUser.id,
          meta: {
            changes,
            oldValues,
            newValues
          },
          priority: 'HIGH',
          broadcastRealtime: true,
          initiatorSocketId: req.get('x-socket-id')
        });
      } catch (error) {
        console.error('Failed to log column update activity:', error);
      }
    }

    if (isPositionChange) {
      // Position change = REORDER (can happen together with UPDATE)
      try {
        await activityLogger.logActivity({
          entityType: 'COLUMN',
          entityId: column.id,
          action: 'REORDER',
          boardId: column.boardId,
          userId: currentUser.id,
          meta: {
            oldPosition: existingColumn.position,
            newPosition: position
          },
          priority: 'LOW', // REORDER actions are low priority (rate limited)
          broadcastRealtime: true,
          initiatorSocketId: req.get('x-socket-id')
        });
      } catch (error) {
        console.error('Failed to log column reorder activity:', error);
      }
    }
  }

  // Emit real-time event to all users in the board room
  const columnUpdatedEvent: ColumnUpdatedEvent = {
    boardId: existingColumn.boardId,
    column: {
      id: column.id,
      title: column.title,
      position: column.position,
      cards: column.cards.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        priority: toPriority(c.priority),
        position: c.position,
        assignee: c.assignee
      }))
    }
  };
  // Broadcast real-time event
  broadcastToRoom(
    `board-${existingColumn.boardId}`,
    'column:updated',
    columnUpdatedEvent,
    req.get('x-socket-id') || undefined
  );

  res.json({
    success: true,
    data: column,
    message: 'Coluna atualizada com sucesso'
  });
}));

router.delete('/columns/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const existingColumn = await prisma.column.findUnique({
    where: { id },
    include: {
      _count: {
        select: { cards: true }
      }
    }
  });

  if (!existingColumn) {
    throw new AppError('Coluna não encontrada', 404);
  }

  if (existingColumn._count.cards > 0) {
    throw new AppError('Não é possível excluir uma coluna que contém cards', 400);
  }

  await prisma.column.delete({
    where: { id }
  });

  await prisma.column.updateMany({
    where: {
      boardId: existingColumn.boardId,
      position: { gt: existingColumn.position }
    },
    data: {
      position: { decrement: 1 }
    }
  });

  // Authenticated user
  const currentUser = res.locals.user;

  // Log activity
  if (currentUser) {
    try {
      await activityLogger.logActivity({
        entityType: 'COLUMN',
        entityId: id,
        action: 'DELETE',
        boardId: existingColumn.boardId,
        userId: currentUser.id,
        meta: {
          title: existingColumn.title,
          position: existingColumn.position
        },
        priority: 'HIGH',
        broadcastRealtime: true,
        initiatorSocketId: req.get('x-socket-id')
      });
    } catch (error) {
      console.error('Failed to log column deletion activity:', error);
    }
  }

  // Emit real-time event to all users in the board room
  const columnDeletedEvent: ColumnDeletedEvent = {
    boardId: existingColumn.boardId,
    columnId: id
  };
  // Broadcast real-time event
  broadcastToRoom(
    `board-${existingColumn.boardId}`,
    'column:deleted',
    columnDeletedEvent,
    req.get('x-socket-id') || undefined
  );

  res.json({
    success: true,
    message: 'Coluna excluída com sucesso'
  });
}));

router.post('/columns/:id/reorder', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  const { position }: ReorderColumnRequest = req.body;

  if (position === undefined || position < 0) {
    throw new AppError('Posição é obrigatória e deve ser maior ou igual a 0', 400);
  }

  const existingColumn = await prisma.column.findUnique({
    where: { id }
  });

  if (!existingColumn) {
    throw new AppError('Coluna não encontrada', 404);
  }

  const boardId = existingColumn.boardId;
  const oldPosition = existingColumn.position;
  const newPosition = position;

  if (oldPosition === newPosition) {
    res.json({
      success: true,
      data: existingColumn,
      message: 'Nenhuma alteração necessária'
    });
    return;
  }

  if (newPosition < oldPosition) {
    await prisma.column.updateMany({
      where: {
        boardId,
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
    await prisma.column.updateMany({
      where: {
        boardId,
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

  const column = await prisma.column.update({
    where: { id },
    data: { position: newPosition },
    include: {
      _count: {
        select: { cards: true }
      }
    }
  });

  // Authenticated user
  const currentUser = res.locals.user;

  // Log activity
  if (currentUser) {
    try {
      await activityLogger.logActivity({
        entityType: 'COLUMN',
        entityId: id,
        action: 'REORDER',
        boardId: column.boardId,
        userId: currentUser.id,
        meta: {
          oldPosition,
          newPosition
        },
        priority: 'LOW', // REORDER actions are low priority (rate limited)
        broadcastRealtime: true,
        initiatorSocketId: req.get('x-socket-id')
      });
    } catch (error) {
      console.error('Failed to log column reorder activity:', error);
    }
  }

  // Emit real-time event to all users in the board room
  const columnReorderedEvent: ColumnReorderedEvent = {
    boardId,
    column: {
      id: column.id,
      title: column.title,
      position: column.position,
      cards: []
    }
  };
  // Broadcast real-time event
  broadcastToRoom(
    `board-${boardId}`,
    'column:reordered',
    columnReorderedEvent,
    req.get('x-socket-id') || undefined
  );

  res.json({
    success: true,
    data: column,
    message: 'Coluna reordenada com sucesso'
  });
}));

export default router;
