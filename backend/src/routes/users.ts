import { Router } from 'express';
import { prisma } from '../database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { CreateUserRequest } from '../types/api';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          assignedCards: true,
          createdCards: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: users
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, email }: CreateUserRequest = req.body;

  if (!name || !email) {
    throw new AppError('Nome e email são obrigatórios', 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Email inválido', 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AppError('Já existe um usuário com este email', 400);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });

  res.status(201).json({
    success: true,
    data: user,
    message: 'Usuário criado com sucesso'
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      createdCards: {
        select: {
          id: true,
          title: true,
          priority: true,
          column: {
            select: {
              title: true,
              board: {
                select: {
                  title: true
                }
              }
            }
          }
        }
      },
      assignedCards: {
        select: {
          id: true,
          title: true,
          priority: true,
          column: {
            select: {
              title: true,
              board: {
                select: {
                  title: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  res.json({
    success: true,
    data: user
  });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { name, email } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { id }
  });

  if (!existingUser) {
    throw new AppError('Usuário não encontrado', 404);
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Email inválido', 400);
    }

    const emailExists = await prisma.user.findUnique({
      where: { email }
    });

    if (emailExists && emailExists.id !== id) {
      throw new AppError('Já existe um usuário com este email', 400);
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(email && { email })
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });

  res.json({
    success: true,
    data: user,
    message: 'Usuário atualizado com sucesso'
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;

  const existingUser = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          assignedCards: true,
          createdCards: true
        }
      }
    }
  });

  if (!existingUser) {
    throw new AppError('Usuário não encontrado', 404);
  }

  if (existingUser._count.createdCards > 0) {
    throw new AppError('Não é possível excluir usuário que criou cards', 400);
  }

  if (existingUser._count.assignedCards > 0) {
    await prisma.card.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: null }
    });
  }

  await prisma.user.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Usuário excluído com sucesso'
  });
}));

export default router;