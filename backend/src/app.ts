import express from 'express';
import cors from 'cors';
import boardsRouter from './routes/boards';
import columnsRouter from './routes/columns';
import cardsRouter from './routes/cards';
import usersRouter from './routes/users';
import { errorHandler, notFound } from './middleware/errorHandler';
import { withAuth, requireAuthMw, ensureUser } from './auth/clerk';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(withAuth);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Kanban API is running' });
});

// Authenticated routes
app.get('/api/auth/me', requireAuthMw, ensureUser, (req, res) => {
  res.json({ success: true, data: res.locals.user });
});

app.use('/api/boards', requireAuthMw, ensureUser, boardsRouter);
app.use('/api', requireAuthMw, ensureUser, columnsRouter);
app.use('/api', requireAuthMw, ensureUser, cardsRouter);
app.use('/api/users', requireAuthMw, ensureUser, usersRouter);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;
