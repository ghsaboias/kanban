import request from 'supertest'
import app from '../../app'
import { testPrisma } from '../setup'

// Mock ActivityLogger to prevent foreign key constraint issues in route tests
jest.mock('../../services/activityLogger', () => ({
  ActivityLogger: jest.fn(() => ({
    logActivity: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    getQueueSize: jest.fn().mockReturnValue(0)
  }))
}));

// Mock authentication middleware (pass-through) and ensure user in locals
jest.mock('../../auth/clerk', () => ({
  withAuth: (req: any, res: any, next: any) => next(),
  requireAuthMw: (req: any, res: any, next: any) => next(),
  ensureUser: (req: any, res: any, next: any) => {
    res.locals.user = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      clerkId: 'test-clerk-id',
    }
    next()
  },
}))

describe('Columns API', () => {
  let board: any

  beforeEach(async () => {
    board = await testPrisma.board.create({ data: { title: 'Board X' } })
  })

  beforeAll(() => {
    const fakeBroadcaster: any = { emit: jest.fn(), except: jest.fn(() => fakeBroadcaster) }
    ;(global as any).io = { to: jest.fn(() => fakeBroadcaster) }
  })

  describe('POST /api/boards/:boardId/columns', () => {
    it('creates a column with auto-incremented position', async () => {
      const res1 = await request(app)
        .post(`/api/boards/${board.id}/columns`)
        .send({ title: 'Col A' })
        .expect(201)
      expect(res1.body.success).toBe(true)
      expect(res1.body.data.title).toBe('Col A')
      expect(res1.body.data.position).toBe(0)

      const res2 = await request(app)
        .post(`/api/boards/${board.id}/columns`)
        .send({ title: 'Col B' })
        .expect(201)
      expect(res2.body.data.position).toBe(1)
    })

    it('inserts at a given position and shifts others', async () => {
      const c1 = await testPrisma.column.create({ data: { title: 'C1', position: 0, boardId: board.id } })
      const c2 = await testPrisma.column.create({ data: { title: 'C2', position: 1, boardId: board.id } })

      const res = await request(app)
        .post(`/api/boards/${board.id}/columns`)
        .send({ title: 'Inserted', position: 1 })
        .expect(201)
      expect(res.body.data.position).toBe(1)

      const after = await testPrisma.column.findMany({ where: { boardId: board.id }, orderBy: { position: 'asc' } })
      expect(after.map(c => c.title)).toEqual(['C1', 'Inserted', 'C2'])
    })

    it('returns 404 for non-existent board', async () => {
      const res = await request(app)
        .post(`/api/boards/non-existent/columns`)
        .send({ title: 'X' })
        .expect(404)
      expect(res.body.success).toBe(false)
    })

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post(`/api/boards/${board.id}/columns`)
        .send({})
        .expect(400)
      expect(res.body.error).toBe('Título é obrigatório')
    })
  })

  describe('PUT /api/columns/:id', () => {
    it('updates title and reorders positions moving down', async () => {
      const c1 = await testPrisma.column.create({ data: { title: 'C1', position: 0, boardId: board.id } })
      const c2 = await testPrisma.column.create({ data: { title: 'C2', position: 1, boardId: board.id } })

      const res = await request(app)
        .put(`/api/columns/${c1.id}`)
        .send({ title: 'C1*', position: 1 })
        .expect(200)
      expect(res.body.data.title).toBe('C1*')

      const after = await testPrisma.column.findMany({ where: { boardId: board.id }, orderBy: { position: 'asc' } })
      expect(after.map(c => c.title)).toEqual(['C2', 'C1*'])
    })

    it('returns 404 for unknown column', async () => {
      const res = await request(app)
        .put('/api/columns/non-existent')
        .send({ title: 'Nope' })
        .expect(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('DELETE /api/columns/:id', () => {
    it('prevents deleting a column with cards', async () => {
      const user = await testPrisma.user.create({ data: { name: 'U', email: 'u@example.com', clerkId: 'c1' } })
      const col = await testPrisma.column.create({ data: { title: 'C', position: 0, boardId: board.id } })
      await testPrisma.card.create({ data: { title: 'Card', position: 0, priority: 'LOW', columnId: col.id, createdById: user.id } })

      const res = await request(app)
        .delete(`/api/columns/${col.id}`)
        .expect(400)
      expect(res.body.error).toContain('Não é possível excluir')
    })

    it('deletes empty column and shifts positions', async () => {
      const c1 = await testPrisma.column.create({ data: { title: 'C1', position: 0, boardId: board.id } })
      const c2 = await testPrisma.column.create({ data: { title: 'C2', position: 1, boardId: board.id } })

      await request(app).delete(`/api/columns/${c1.id}`).expect(200)

      const after = await testPrisma.column.findMany({ where: { boardId: board.id }, orderBy: { position: 'asc' } })
      expect(after.map(c => c.title)).toEqual(['C2'])
      expect(after[0].position).toBe(0)
    })
  })
})
