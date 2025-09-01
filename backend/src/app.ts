import cors from 'cors';
import express from 'express';
import { ensureUser, requireAuthMw, withAuth } from './auth/clerk';
import { errorHandler, notFound } from './middleware/errorHandler';
import boardsRouter from './routes/boards';
import cardsRouter from './routes/cards';
import columnsRouter from './routes/columns';
import usersRouter from './routes/users';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Socket-Id']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(withAuth);

// Routes
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Kanban API is running', timestamp: new Date().toISOString() });
});

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
