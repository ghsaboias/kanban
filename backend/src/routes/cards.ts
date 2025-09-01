import { Request, Response, Router } from 'express';
import { CardCreatedEvent, CardDeletedEvent, CardMovedEvent, CardUpdatedEvent } from '../../../shared/realtime';
import { prisma } from '../database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { ActivityLogger } from '../services/activityLogger';
import { CreateCardRequest, MoveCardRequest, UpdateCardRequest } from '../types/api';
import { sanitizeDescription } from '../utils/sanitize';
import { toPriority } from '../utils/priority';
import { broadcastToRoom } from '../utils/socketBroadcaster';

const router = Router();

// Activity logger instance
const activityLogger = new ActivityLogger(prisma);

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

  // Handle position changes separately (for reorder detection)
  const isPositionChange = position !== undefined && position !== existingCard.position;

  const updateData: Record<string, unknown> = {};
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
}));

router.delete('/cards/:id', asyncHandler(async (req: Request, res: Response) => {
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
}));

export default router;
