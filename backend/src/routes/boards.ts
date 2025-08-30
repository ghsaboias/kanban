import { Router, Request, Response } from 'express';
import { prisma } from '../database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { CreateBoardRequest, UpdateBoardRequest, ApiResponse } from '../types/api';

const router = Router();

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

  res.json({
    success: true,
    data: board,
    message: 'Quadro atualizado com sucesso'
  });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const existingBoard = await prisma.board.findUnique({
    where: { id }
  });

  if (!existingBoard) {
    throw new AppError('Quadro não encontrado', 404);
  }

  await prisma.board.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Quadro excluído com sucesso'
  });
}));

export default router;
