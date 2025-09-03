import { Request, Response } from 'express';
import { prisma } from '../database';
import { AppError, asyncHandler } from '../middleware/errorHandler';

export const getCardHandler = asyncHandler(async (req: Request, res: Response) => {
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
});
