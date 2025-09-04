import { randomUUID } from 'crypto';
import request from 'supertest';
import { testPrisma } from '../setup';
import { createTestApp } from '../testApp';
import { beforeEach, describe, expect, it } from 'bun:test';

// Create test app instance
const app = createTestApp();

describe('Cards API', () => {
  let board: { id: string; title: string; }
  let colA: { id: string; title: string; position: number; boardId: string; }
  let colB: { id: string; title: string; position: number; boardId: string; }
  let user: { id: string; name: string; email: string; clerkId: string | null; }

  beforeEach(async () => {
    const uniqueId = randomUUID();
    const testUserId = `test-user-${randomUUID()}`;

    board = await testPrisma.board.create({ data: { title: 'B' } })
    colA = await testPrisma.column.create({ data: { title: 'A', position: 0, boardId: board.id } })
    colB = await testPrisma.column.create({ data: { title: 'B', position: 1, boardId: board.id } })

    // Create user with unique ID
    user = await testPrisma.user.create({
      data: {
        id: testUserId,
        name: 'U',
        email: `u-${uniqueId}@example.com`,
        clerkId: `clerk-${uniqueId}`
      }
    });

    // Note: User data is now handled by the test app factory
  })

  // Note: Socket.IO mocking is handled by the test app factory

  describe('POST /api/columns/:columnId/cards', () => {
    it('creates a card in a column', async () => {
      const res = await request(app)
        .post(`/api/columns/${colA.id}/cards`)
        .set('x-test-user', JSON.stringify(user))
        .send({ title: 'Card 1', priority: 'LOW', assigneeId: user.id })

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Card 1');
      expect(res.body.data.position).toBe(0);
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
        .set('x-test-user', JSON.stringify(user))
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

      await request(app).delete(`/api/cards/${c1.id}`).set('x-test-user', JSON.stringify(user)).expect(200)

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
