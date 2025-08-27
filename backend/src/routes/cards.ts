import { Router } from 'express';
import { prisma } from '../database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { CreateCardRequest, UpdateCardRequest, MoveCardRequest } from '../types/api';

const router = Router();

router.post('/columns/:columnId/cards', asyncHandler(async (req, res) => {
  const columnId = req.params.columnId;
  const { title, description, priority, assigneeId, createdById, position }: CreateCardRequest = req.body;

  if (!title || !createdById) {
    throw new AppError('Título e ID do criador são obrigatórios', 400);
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
      description,
      priority: priority || 'MEDIUM',
      position: finalPosition,
      columnId,
      createdById,
      ...(assigneeId && { assigneeId })
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

  res.status(201).json({
    success: true,
    data: card,
    message: 'Card criado com sucesso'
  });
}));

router.get('/cards/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;

  const card = await prisma.card.findUnique({
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

  if (!card) {
    throw new AppError('Card não encontrado', 404);
  }

  res.json({
    success: true,
    data: card
  });
}));

router.put('/cards/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { title, description, priority, assigneeId, position }: UpdateCardRequest = req.body;

  const existingCard = await prisma.card.findUnique({
    where: { id }
  });

  if (!existingCard) {
    throw new AppError('Card não encontrado', 404);
  }

  if (assigneeId) {
    const assigneeExists = await prisma.user.findUnique({
      where: { id: assigneeId }
    });

    if (!assigneeExists) {
      throw new AppError('Usuário responsável não encontrado', 404);
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

  const updateData: any = {};
  if (title) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (priority) updateData.priority = priority;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
  if (position !== undefined) updateData.position = position;

  const card = await prisma.card.update({
    where: { id },
    data: updateData,
    include: {
      assignee: {
        select: { id: true, name: true, email: true }
      },
      column: {
        select: { id: true, title: true, boardId: true }
      }
    }
  });

  res.json({
    success: true,
    data: card,
    message: 'Card atualizado com sucesso'
  });
}));

router.delete('/cards/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;

  const existingCard = await prisma.card.findUnique({
    where: { id }
  });

  if (!existingCard) {
    throw new AppError('Card não encontrado', 404);
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

  res.json({
    success: true,
    message: 'Card excluído com sucesso'
  });
}));

router.post('/cards/:id/move', asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { columnId, position }: MoveCardRequest = req.body;

  if (!columnId || position === undefined || position < 0) {
    throw new AppError('ID da coluna e posição são obrigatórios', 400);
  }

  const existingCard = await prisma.card.findUnique({
    where: { id }
  });

  if (!existingCard) {
    throw new AppError('Card não encontrado', 404);
  }

  const targetColumn = await prisma.column.findUnique({
    where: { id: columnId }
  });

  if (!targetColumn) {
    throw new AppError('Coluna de destino não encontrada', 404);
  }

  const oldColumnId = existingCard.columnId;
  const oldPosition = existingCard.position;

  if (oldColumnId === columnId) {
    if (oldPosition === position) {
      return res.json({
        success: true,
        data: existingCard,
        message: 'Nenhuma alteração necessária'
      });
    }

    if (position < oldPosition) {
      await prisma.card.updateMany({
        where: {
          columnId,
          position: {
            gte: position,
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
            lte: position
          }
        },
        data: {
          position: { decrement: 1 }
        }
      });
    }
  } else {
    await prisma.card.updateMany({
      where: {
        columnId: oldColumnId,
        position: { gt: oldPosition }
      },
      data: {
        position: { decrement: 1 }
      }
    });

    await prisma.card.updateMany({
      where: {
        columnId,
        position: { gte: position }
      },
      data: {
        position: { increment: 1 }
      }
    });
  }

  const card = await prisma.card.update({
    where: { id },
    data: {
      columnId,
      position
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

  res.json({
    success: true,
    data: card,
    message: 'Card movido com sucesso'
  });
}));

export default router;