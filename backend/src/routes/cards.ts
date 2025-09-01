import { Router, Request, Response } from 'express';
import { prisma } from '../database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { CreateCardRequest, UpdateCardRequest, MoveCardRequest } from '../types/api';
import { sanitizeDescription } from '../utils/sanitize';
import { CardCreatedEvent, CardUpdatedEvent, CardDeletedEvent, CardMovedEvent } from '../../../shared/realtime';

const router = Router();

router.post('/columns/:columnId/cards', asyncHandler(async (req: Request, res: Response) => {
  const columnId = req.params.columnId;
  const { title, description, priority, assigneeId, position }: CreateCardRequest = req.body;

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

  // Emit real-time event to all users in the board room
  const cardCreatedEvent: CardCreatedEvent = {
    boardId: card.column.boardId,
    card: {
      id: card.id,
      title: card.title,
      description: card.description,
      priority: card.priority,
      position: card.position,
      assignee: card.assignee
    },
    columnId: card.columnId
  };
  {
    const initiator = req.get('x-socket-id') || undefined;
    const room = `board-${card.column.boardId}`;
    const broadcaster = initiator ? global.io.to(room).except(initiator) : global.io.to(room);
    broadcaster.emit('card:created', cardCreatedEvent);
  }

  res.status(201).json({
    success: true,
    data: card,
    message: 'Card criado com sucesso'
  });
}));

router.get('/cards/:id', asyncHandler(async (req: Request, res: Response) => {
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

router.put('/cards/:id', asyncHandler(async (req: Request, res: Response) => {
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
  if (description !== undefined) updateData.description = sanitizeDescription(description);
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

  // Emit real-time event to all users in the board room
  const cardUpdatedEvent: CardUpdatedEvent = {
    boardId: card.column.boardId,
    card: {
      id: card.id,
      title: card.title,
      description: card.description,
      priority: card.priority,
      position: card.position,
      assignee: card.assignee
    }
  };
  {
    const initiator = req.get('x-socket-id') || undefined;
    const room = `board-${card.column.boardId}`;
    const broadcaster = initiator ? global.io.to(room).except(initiator) : global.io.to(room);
    broadcaster.emit('card:updated', cardUpdatedEvent);
  }

  res.json({
    success: true,
    data: card,
    message: 'Card atualizado com sucesso'
  });
}));

router.delete('/cards/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const existingCard = await prisma.card.findUnique({
    where: { id },
    include: {
      column: {
        select: { boardId: true }
      }
    }
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

  // Emit real-time event to all users in the board room
  const cardDeletedEvent: CardDeletedEvent = {
    boardId: existingCard.column.boardId,
    cardId: id
  };
  {
    const initiator = req.get('x-socket-id') || undefined;
    const room = `board-${existingCard.column.boardId}`;
    const broadcaster = initiator ? global.io.to(room).except(initiator) : global.io.to(room);
    broadcaster.emit('card:deleted', cardDeletedEvent);
  }

  res.json({
    success: true,
    message: 'Card excluído com sucesso'
  });
}));

router.post('/cards/:id/move', asyncHandler(async (req: Request, res: Response) => {
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
        column: {
          select: { boardId: true }
        }
      }
    });

    if (!existingCard) {
      throw new AppError('Card não encontrado', 404);
    }

    const targetColumn = await tx.column.findUnique({
      where: { id: columnId }
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
      return { card: cardWithRelations!, oldColumnId };
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

    return { card, oldColumnId };
  });

  const card = result.card;
  const oldColumnId = result.oldColumnId;

  // Emit real-time event to all users in the board room
  const cardMovedEvent: CardMovedEvent = {
    boardId: card.column.boardId,
    card: {
      id: card.id,
      title: card.title,
      description: card.description,
      priority: card.priority,
      position: card.position,
      assignee: card.assignee
    },
    fromColumnId: oldColumnId,
    toColumnId: columnId,
    position
  };
  {
    const initiator = req.get('x-socket-id') || undefined;
    const room = `board-${card.column.boardId}`;
    const broadcaster = initiator ? global.io.to(room).except(initiator) : global.io.to(room);
    broadcaster.emit('card:moved', cardMovedEvent);
  }

  res.json({
    success: true,
    data: card,
    message: 'Card movido com sucesso'
  });
}));

export default router;
