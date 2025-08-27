import express from 'express';
import cors from 'cors';
import boardsRouter from './routes/boards';
import columnsRouter from './routes/columns';
import cardsRouter from './routes/cards';
import usersRouter from './routes/users';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Kanban API is running' });
});

app.use('/api/boards', boardsRouter);
app.use('/api', columnsRouter);
app.use('/api', cardsRouter);
app.use('/api/users', usersRouter);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});