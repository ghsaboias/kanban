import { Router, Request, Response } from 'express';
import { prisma } from '../database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { CreateColumnRequest, UpdateColumnRequest, ReorderColumnRequest } from '../types/api';
import { ColumnCreatedEvent, ColumnUpdatedEvent, ColumnDeletedEvent, ColumnReorderedEvent } from '../../../shared/realtime';

const router = Router();

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
  {
    const initiator = req.get('x-socket-id') || undefined;
    const room = `board-${boardId}`;
    const broadcaster = initiator ? global.io.to(room).except(initiator) : global.io.to(room);
    broadcaster.emit('column:created', columnCreatedEvent);
  }

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

  // Emit real-time event to all users in the board room
  const columnUpdatedEvent: ColumnUpdatedEvent = {
    boardId: existingColumn.boardId,
    column: {
      id: column.id,
      title: column.title,
      position: column.position,
      cards: column.cards
    }
  };
  {
    const initiator = req.get('x-socket-id') || undefined;
    const room = `board-${existingColumn.boardId}`;
    const broadcaster = initiator ? global.io.to(room).except(initiator) : global.io.to(room);
    broadcaster.emit('column:updated', columnUpdatedEvent);
  }

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

  // Emit real-time event to all users in the board room
  const columnDeletedEvent: ColumnDeletedEvent = {
    boardId: existingColumn.boardId,
    columnId: id
  };
  {
    const initiator = req.get('x-socket-id') || undefined;
    const room = `board-${existingColumn.boardId}`;
    const broadcaster = initiator ? global.io.to(room).except(initiator) : global.io.to(room);
    broadcaster.emit('column:deleted', columnDeletedEvent);
  }

  res.json({
    success: true,
    message: 'Coluna excluída com sucesso'
  });
}));

router.post('/columns/:id/reorder', asyncHandler(async (req: Request, res: Response) => {
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
    return res.json({
      success: true,
      data: existingColumn,
      message: 'Nenhuma alteração necessária'
    });
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
  {
    const initiator = req.get('x-socket-id') || undefined;
    const room = `board-${boardId}`;
    const broadcaster = initiator ? global.io.to(room).except(initiator) : global.io.to(room);
    broadcaster.emit('column:reordered', columnReorderedEvent);
  }

  res.json({
    success: true,
    data: column,
    message: 'Coluna reordenada com sucesso'
  });
}));

export default router;
