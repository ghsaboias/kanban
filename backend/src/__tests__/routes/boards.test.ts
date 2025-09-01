import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import app from '../../app';
import { testPrisma } from '../setup';

// Mock ActivityLogger to prevent foreign key constraint issues in route tests
jest.mock('../../services/activityLogger', () => ({
  ActivityLogger: jest.fn(() => ({
    logActivity: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    getQueueSize: jest.fn().mockReturnValue(0)
  }))
}));

// Mock authentication middleware
jest.mock('../../auth/clerk', () => ({
  withAuth: (req: Request, res: Response, next: NextFunction) => next(),
  requireAuthMw: (req: Request, res: Response, next: NextFunction) => next(),
  ensureUser: (req: Request, res: Response, next: NextFunction) => {
    res.locals.user = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      clerkId: 'test-clerk-id',
    };
    next();
  },
}));

describe('Boards API', () => {
  let testUser: { id: string; name: string; email: string; clerkId: string | null; };

  beforeEach(async () => {
    // Create a test user with the same ID used by the mock so FK constraints work
    testUser = await testPrisma.user.create({
      data: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        clerkId: 'test-clerk-id',
      },
    });
  });

  describe('GET /api/boards', () => {
    it('should return empty array when no boards exist', async () => {
      const response = await request(app)
        .get('/api/boards')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
      });
    });

    it('should return all boards with column count', async () => {
      // Create test boards
      const board1 = await testPrisma.board.create({
        data: { title: 'Board 1', description: 'First board' },
      });

      const board2 = await testPrisma.board.create({
        data: { title: 'Board 2', description: 'Second board' },
      });

      // Add columns to board1
      await testPrisma.column.createMany({
        data: [
          { title: 'Column 1', position: 0, boardId: board1.id },
          { title: 'Column 2', position: 1, boardId: board1.id },
        ],
      });

      const response = await request(app)
        .get('/api/boards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      const boardWithColumns = response.body.data.find((b: { id: string; _count: { columns: number } }) => b.id === board1.id);
      expect(boardWithColumns._count.columns).toBe(2);

      const boardWithoutColumns = response.body.data.find((b: { id: string; _count: { columns: number } }) => b.id === board2.id);
      expect(boardWithoutColumns._count.columns).toBe(0);
    });

    it('should return boards ordered by creation date (newest first)', async () => {
      const board1 = await testPrisma.board.create({
        data: { title: 'Older Board' },
      });

      // Add delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const board2 = await testPrisma.board.create({
        data: { title: 'Newer Board' },
      });

      const response = await request(app)
        .get('/api/boards')
        .expect(200);

      expect(response.body.data[0].id).toBe(board2.id);
      expect(response.body.data[1].id).toBe(board1.id);
    });
  });

  describe('POST /api/boards', () => {
    it('should create a new board successfully', async () => {
      const boardData = {
        title: 'New Board',
        description: 'A test board',
      };

      const response = await request(app)
        .post('/api/boards')
        .send(boardData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(boardData.title);
      expect(response.body.data.description).toBe(boardData.description);
      expect(response.body.message).toBe('Quadro criado com sucesso');
      expect(response.body.data._count.columns).toBe(0);

      // Verify board was created in database
      const dbBoard = await testPrisma.board.findUnique({
        where: { id: response.body.data.id },
      });
      expect(dbBoard).not.toBeNull();
      expect(dbBoard?.title).toBe(boardData.title);
    });

    it('should create board without description', async () => {
      const boardData = {
        title: 'Board without description',
      };

      const response = await request(app)
        .post('/api/boards')
        .send(boardData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(boardData.title);
      expect(response.body.data.description).toBeNull();
    });

    it('should return 400 when title is missing', async () => {
      const boardData = {
        description: 'Board without title',
      };

      const response = await request(app)
        .post('/api/boards')
        .send(boardData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Título é obrigatório');
    });

    it('should return 400 when title is empty string', async () => {
      const boardData = {
        title: '',
        description: 'Board with empty title',
      };

      const response = await request(app)
        .post('/api/boards')
        .send(boardData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Título é obrigatório');
    });
  });

  describe('GET /api/boards/:id', () => {
    it('should return board with columns and cards', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Test Board',
          description: 'Test Description',
          columns: {
            create: {
              title: 'Test Column',
              position: 0,
              cards: {
                create: {
                  title: 'Test Card',
                  position: 0,
                  priority: 'HIGH',
                  createdById: testUser.id,
                  assigneeId: testUser.id,
                },
              },
            },
          },
        },
      });

      const response = await request(app)
        .get(`/api/boards/${board.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(board.id);
      expect(response.body.data.title).toBe('Test Board');
      expect(response.body.data.columns).toHaveLength(1);
      expect(response.body.data.columns[0].cards).toHaveLength(1);
      expect(response.body.data.columns[0].cards[0].assignee.id).toBe(testUser.id);
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .get('/api/boards/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quadro não encontrado');
    });

    it('should return columns and cards in correct order', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Ordered Board',
          columns: {
            create: [
              {
                title: 'Column 2',
                position: 1,
                cards: {
                  create: [
                    { title: 'Card B', position: 1, priority: 'LOW', createdById: testUser.id },
                    { title: 'Card A', position: 0, priority: 'HIGH', createdById: testUser.id },
                  ],
                },
              },
              {
                title: 'Column 1',
                position: 0,
              },
            ],
          },
        },
      });

      const response = await request(app)
        .get(`/api/boards/${board.id}`)
        .expect(200);

      // Columns should be ordered by position
      expect(response.body.data.columns[0].title).toBe('Column 1');
      expect(response.body.data.columns[1].title).toBe('Column 2');

      // Cards should be ordered by position
      expect(response.body.data.columns[1].cards[0].title).toBe('Card A');
      expect(response.body.data.columns[1].cards[1].title).toBe('Card B');
    });
  });

  describe('PUT /api/boards/:id', () => {
    it('should update board title and description', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Original Title',
          description: 'Original Description',
        },
      });

      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const response = await request(app)
        .put(`/api/boards/${board.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.message).toBe('Quadro atualizado com sucesso');

      // Verify update in database
      const updatedBoard = await testPrisma.board.findUnique({
        where: { id: board.id },
      });
      expect(updatedBoard?.title).toBe(updateData.title);
      expect(updatedBoard?.description).toBe(updateData.description);
    });

    it('should update only title', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Original Title',
          description: 'Original Description',
        },
      });

      const updateData = {
        title: 'New Title Only',
      };

      const response = await request(app)
        .put(`/api/boards/${board.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe('Original Description');
    });

    it('should set description to null when explicitly provided', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Title',
          description: 'Original Description',
        },
      });

      const updateData = {
        description: null,
      };

      const response = await request(app)
        .put(`/api/boards/${board.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.description).toBeNull();
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .put('/api/boards/non-existent-id')
        .send({ title: 'New Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quadro não encontrado');
    });
  });

  describe('DELETE /api/boards/:id', () => {
    it('should delete board successfully', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Board to Delete',
        },
      });

      const response = await request(app)
        .delete(`/api/boards/${board.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Quadro excluído com sucesso');

      // Verify deletion in database
      const deletedBoard = await testPrisma.board.findUnique({
        where: { id: board.id },
      });
      expect(deletedBoard).toBeNull();
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .delete('/api/boards/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quadro não encontrado');
    });

    it('should cascade delete columns and cards', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Board with nested data',
          columns: {
            create: {
              title: 'Column to delete',
              position: 0,
              cards: {
                create: {
                  title: 'Card to delete',
                  position: 0,
                  priority: 'MEDIUM',
                  createdById: testUser.id,
                },
              },
            },
          },
        },
        include: {
          columns: {
            include: {
              cards: true,
            },
          },
        },
      });

      const columnId = board.columns[0].id;
      const cardId = board.columns[0].cards[0].id;

      await request(app)
        .delete(`/api/boards/${board.id}`)
        .expect(200);

      // Verify cascade deletion
      const remainingColumn = await testPrisma.column.findUnique({
        where: { id: columnId },
      });
      const remainingCard = await testPrisma.card.findUnique({
        where: { id: cardId },
      });

      expect(remainingColumn).toBeNull();
      expect(remainingCard).toBeNull();
    });
  });
});