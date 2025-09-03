import { Router } from 'express';
import { createCardHandler } from './createCard';
import { deleteCardHandler } from './deleteCard';
import { getCardHandler } from './getCard';
import { moveCardHandler } from './moveCard';
import { updateCardHandler } from './updateCard';

const router = Router();

router.post('/columns/:columnId/cards', createCardHandler);

router.get('/cards/:id', getCardHandler);

router.put('/cards/:id', updateCardHandler);

router.delete('/cards/:id', deleteCardHandler);

router.post('/cards/:id/move', moveCardHandler);

export default router;
