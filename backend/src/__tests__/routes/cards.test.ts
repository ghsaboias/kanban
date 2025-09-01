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

// Mock authentication middleware and ensure user
jest.mock('../../auth/clerk', () => ({
  withAuth: (req: Request, res: Response, next: NextFunction) => next(),
  requireAuthMw: (req: Request, res: Response, next: NextFunction) => next(),
  ensureUser: (req: Request, res: Response, next: NextFunction) => {
    res.locals.user = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      clerkId: 'test-clerk-id',
    }
    next()
  },
}))

describe('Cards API', () => {
  let board: { id: string; title: string; }
  let colA: { id: string; title: string; position: number; boardId: string; }
  let colB: { id: string; title: string; position: number; boardId: string; }
  let user: { id: string; name: string; email: string; clerkId: string | null; }

  beforeEach(async () => {
    board = await testPrisma.board.create({ data: { title: 'B' } })
    colA = await testPrisma.column.create({ data: { title: 'A', position: 0, boardId: board.id } })
    colB = await testPrisma.column.create({ data: { title: 'B', position: 1, boardId: board.id } })
    // Create user with the same id used by mocked ensureUser so FK createdById is valid
    user = await testPrisma.user.create({ data: { id: 'test-user-id', name: 'U', email: 'u@example.com', clerkId: 'clerk-1' } })
  })

  beforeAll(() => {
    const fakeBroadcaster: { emit: jest.Mock; except: jest.Mock } = {
      emit: jest.fn(),
      except: jest.fn(() => fakeBroadcaster)
    };
    (global as unknown as { io: { to: jest.Mock } }).io = { to: jest.fn(() => fakeBroadcaster) };
  });

  describe('POST /api/columns/:columnId/cards', () => {
    it('creates a card in a column', async () => {
      const res = await request(app)
        .post(`/api/columns/${colA.id}/cards`)
        .send({ title: 'Card 1', priority: 'LOW', assigneeId: user.id })
        .expect(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe('Card 1')
      expect(res.body.data.position).toBe(0)
    })

    it('returns 404 when column not found', async () => {
      const res = await request(app)
        .post('/api/columns/does-not-exist/cards')
        .send({ title: 'X' })
        .expect(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/cards/:id/move', () => {
    it('moves card across columns and normalizes positions', async () => {
      const c1 = await testPrisma.card.create({ data: { title: 'C1', position: 0, priority: 'LOW', columnId: colA.id, createdById: user.id } })
      await testPrisma.card.create({ data: { title: 'C2', position: 1, priority: 'LOW', columnId: colA.id, createdById: user.id } })

      const res = await request(app)
        .post(`/api/cards/${c1.id}/move`)
        .send({ columnId: colB.id, position: 0 })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.columnId).toBe(colB.id)
      expect(res.body.data.position).toBe(0)

      const aAfter = await testPrisma.card.findMany({ where: { columnId: colA.id }, orderBy: { position: 'asc' } })
      const bAfter = await testPrisma.card.findMany({ where: { columnId: colB.id }, orderBy: { position: 'asc' } })
      expect(aAfter.map(c => c.position)).toEqual([0])
      expect(bAfter.map(c => c.position)).toEqual([0])
    })
  })

  describe('DELETE /api/cards/:id', () => {
    it('deletes a card and compacts positions', async () => {
      const c1 = await testPrisma.card.create({ data: { title: 'C1', position: 0, priority: 'LOW', columnId: colA.id, createdById: user.id } })
      await testPrisma.card.create({ data: { title: 'C2', position: 1, priority: 'LOW', columnId: colA.id, createdById: user.id } })

      await request(app).delete(`/api/cards/${c1.id}`).expect(200)

      const after = await testPrisma.card.findMany({ where: { columnId: colA.id }, orderBy: { position: 'asc' } })
      expect(after.map(c => c.title)).toEqual(['C2'])
      expect(after[0].position).toBe(0)
    })

    it('returns 404 for non-existent card', async () => {
      const res = await request(app).delete('/api/cards/not-there').expect(404)
      expect(res.body.success).toBe(false)
    })
  })
})
