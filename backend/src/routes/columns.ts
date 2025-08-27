import { Router } from 'express';
import { prisma } from '../database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { CreateColumnRequest, UpdateColumnRequest, ReorderColumnRequest } from '../types/api';

const router = Router();

router.post('/boards/:boardId/columns', asyncHandler(async (req, res) => {
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

  res.status(201).json({
    success: true,
    data: column,
    message: 'Coluna criada com sucesso'
  });
}));

router.put('/columns/:id', asyncHandler(async (req, res) => {
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
      _count: {
        select: { cards: true }
      }
    }
  });

  res.json({
    success: true,
    data: column,
    message: 'Coluna atualizada com sucesso'
  });
}));

router.delete('/columns/:id', asyncHandler(async (req, res) => {
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

  res.json({
    success: true,
    message: 'Coluna excluída com sucesso'
  });
}));

router.post('/columns/:id/reorder', asyncHandler(async (req, res) => {
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

  res.json({
    success: true,
    data: column,
    message: 'Coluna reordenada com sucesso'
  });
}));

export default router;