import { Request, Response, Router } from 'express';
import { prisma } from '../database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { activityLogger } from '../services/activityLoggerSingleton';
import { CreateBoardRequest, UpdateBoardRequest } from '../types/api';

const router = Router();

// Activity logger is shared via singleton

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const boards = await prisma.board.findMany({
    include: {
      _count: {
        select: { columns: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: boards
  });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { title, description }: CreateBoardRequest = req.body;

  if (!title) {
    throw new AppError('Título é obrigatório', 400);
  }

  const board = await prisma.board.create({
    data: {
      title,
      description
    },
    include: {
      _count: {
        select: { columns: true }
      }
    }
  });

  // Log board creation activity
  const currentUser = res.locals.user;
  if (currentUser) {
    await activityLogger.logActivity({
      entityType: 'BOARD',
      entityId: board.id,
      action: 'CREATE',
      boardId: board.id,
      userId: currentUser.id,
      meta: {
        title: board.title,
        description: board.description
      },
      priority: 'HIGH',
      broadcastRealtime: true,
      initiatorSocketId: req.get('x-socket-id')
    });
  }

  res.status(201).json({
    success: true,
    data: board,
    message: 'Quadro criado com sucesso'
  });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignee: {
                select: { id: true, name: true, email: true }
              },
              owner: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      }
    }
  });

  if (!board) {
    throw new AppError('Quadro não encontrado', 404);
  }

  res.json({
    success: true,
    data: board
  });
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const { title, description }: UpdateBoardRequest = req.body;

  const existingBoard = await prisma.board.findUnique({
    where: { id }
  });

  if (!existingBoard) {
    throw new AppError('Quadro não encontrado', 404);
  }

  // Detect changes for activity logging
  const changes: string[] = [];
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  if (title && title !== existingBoard.title) {
    changes.push('title');
    oldValues.title = existingBoard.title;
    newValues.title = title;
  }

  if (description !== undefined && description !== existingBoard.description) {
    changes.push('description');
    oldValues.description = existingBoard.description;
    newValues.description = description;
  }

  const board = await prisma.board.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description })
    },
    include: {
      _count: {
        select: { columns: true }
      }
    }
  });

  // Log board update activity only if there were actual changes
  const currentUser = res.locals.user;
  if (currentUser && changes.length > 0) {
    await activityLogger.logActivity({
      entityType: 'BOARD',
      entityId: board.id,
      action: 'UPDATE',
      boardId: board.id,
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
  }

  res.json({
    success: true,
    data: board,
    message: 'Quadro atualizado com sucesso'
  });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const existingBoard = await prisma.board.findUnique({
    where: { id },
    include: {
      columns: {
        include: {
          cards: true
        }
      }
    }
  });

  if (!existingBoard) {
    throw new AppError('Quadro não encontrado', 404);
  }

  // Count cascade deleted items for activity metadata
  const cascadeDeleted = {
    columns: existingBoard.columns.length,
    cards: existingBoard.columns.reduce((total, col) => total + col.cards.length, 0)
  };

  await prisma.board.delete({
    where: { id }
  });

  // Log board deletion activity
  const currentUser = res.locals.user;
  if (currentUser) {
    await activityLogger.logActivity({
      entityType: 'BOARD',
      entityId: id,
      action: 'DELETE',
      boardId: id,
      userId: currentUser.id,
      meta: {
        title: existingBoard.title,
        description: existingBoard.description,
        ...(cascadeDeleted.columns > 0 || cascadeDeleted.cards > 0 ? { cascadeDeleted } : {})
      },
      priority: 'HIGH',
      broadcastRealtime: true,
      initiatorSocketId: req.get('x-socket-id')
    });
  }

  res.json({
    success: true,
    message: 'Quadro excluído com sucesso'
  });
}));

// GET /api/boards/:id/activities - Get activities for a specific board with pagination
router.get('/:id/activities', asyncHandler(async (req: Request, res: Response) => {
  const boardId = req.params.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 activities per request
  const offset = (page - 1) * limit;

  // Verify board exists
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, title: true }
  });

  if (!board) {
    throw new AppError('Quadro não encontrado', 404);
  }

  // Get activities with user information, ordered by creation date (newest first)
  const activities = await prisma.activity.findMany({
    where: { boardId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    skip: offset
  });

  // Get total count for pagination metadata
  const totalCount = await prisma.activity.count({
    where: { boardId }
  });

  const hasMore = totalCount > offset + activities.length;
  const totalPages = Math.ceil(totalCount / limit);

  res.json({
    success: true,
    data: {
      activities,
      board: {
        id: board.id,
        title: board.title
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
        hasPrev: page > 1,
        nextPage: hasMore ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    }
  });
}));

export default router;
