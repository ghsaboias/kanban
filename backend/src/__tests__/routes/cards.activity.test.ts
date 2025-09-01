import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import app from '../../app';
import { testPrisma } from '../setup';

// Restore real ActivityLogger for activity logging tests
jest.unmock('../../services/activityLogger');

// Mock authentication middleware
jest.mock('../../auth/clerk', () => ({
  withAuth: (req: Request, res: Response, next: NextFunction) => next(),
  requireAuthMw: (req: Request, res: Response, next: NextFunction) => next(),
  ensureUser: (req: Request, res: Response, next: NextFunction) => {
    res.locals.user = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      clerkId: 'test-clerk-id'
    };
    next();
  }
}));

describe('Cards Routes - Activity Logging', () => {
  let testUser: { id: string; email: string; name: string; clerkId: string; };
  let testBoard: { id: string; title: string; description?: string | null; };
  let testColumn: { id: string; title: string; position: number; boardId: string; };
  let testAssignee: { id: string; email: string; name: string; clerkId: string; };

  beforeAll(() => {
    const fakeBroadcaster = { emit: jest.fn(), except: jest.fn(() => fakeBroadcaster) };
    (global as unknown as { io: { to: jest.Mock } }).io = { to: jest.fn(() => fakeBroadcaster) };
  });

  beforeEach(async () => {
    // Create test user for authentication
    testUser = await testPrisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        clerkId: 'test-clerk-id'
      }
    });

    // Create test assignee
    testAssignee = await testPrisma.user.create({
      data: {
        id: 'assignee-user-id',
        email: 'assignee@example.com',
        name: 'Assignee User',
        clerkId: 'assignee-clerk-id'
      }
    });

    // Create test board and column
    testBoard = await testPrisma.board.create({
      data: {
        title: 'Test Board',
        description: 'Test board for cards'
      }
    });

    testColumn = await testPrisma.column.create({
      data: {
        title: 'Test Column',
        position: 0,
        boardId: testBoard.id
      }
    });
  });

  afterEach(async () => {
    // Wait for any pending activity logging to complete before cleanup
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  describe('POST /api/columns/:columnId/cards', () => {
    it('should log card creation activity with all fields', async () => {
      const cardData = {
        title: 'New Card',
        description: '<p>Card description with <strong>formatting</strong></p>',
        priority: 'HIGH',
        assigneeId: testAssignee.id,
        position: 0
      };

      const response = await request(app)
        .post(`/api/columns/${testColumn.id}/cards`)
        .send(cardData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(cardData.title);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: response.body.data.id,
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(testBoard.id);
      expect(activities[0].meta).toEqual({
        title: cardData.title,
        description: cardData.description,
        priority: cardData.priority,
        assigneeId: testAssignee.id,
        assigneeName: testAssignee.name,
        columnId: testColumn.id,
        columnTitle: testColumn.title,
        position: 0
      });
    });

    it('should log card creation activity with minimal fields', async () => {
      const cardData = {
        title: 'Minimal Card'
      };

      const response = await request(app)
        .post(`/api/columns/${testColumn.id}/cards`)
        .send(cardData)
        .expect(201);

      // Check that activity was logged with default values
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: response.body.data.id,
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].meta).toEqual({
        title: cardData.title,
        description: null,
        priority: 'MEDIUM',
        assigneeId: null,
        assigneeName: null,
        columnId: testColumn.id,
        columnTitle: testColumn.title,
        position: 0
      });
    });

    it('should log card creation with correct priority (HIGH)', async () => {
      const cardData = {
        title: 'High Priority Card',
        priority: 'HIGH'
      };

      await request(app)
        .post(`/api/columns/${testColumn.id}/cards`)
        .send(cardData)
        .expect(201);

      // Check that activity was logged immediately (HIGH priority)
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].createdAt).toBeInstanceOf(Date);
      // Should be logged immediately, so createdAt should be very recent
      const timeDiff = Date.now() - activities[0].createdAt.getTime();
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second ago
    });

    it('should not log activity when card creation fails', async () => {
      const invalidCardData = {
        // Missing required title
        description: 'Invalid card'
      };

      await request(app)
        .post(`/api/columns/${testColumn.id}/cards`)
        .send(invalidCardData)
        .expect(400);

      // Should not have logged any activity for failed creation
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(0);
    });
  });

  describe('PUT /api/cards/:id', () => {
    let testCard: unknown;

    beforeEach(async () => {
      testCard = await testPrisma.card.create({
        data: {
          title: 'Original Card',
          description: '<p>Original description</p>',
          priority: 'MEDIUM',
          position: 0,
          columnId: testColumn.id,
          createdById: testUser.id
        }
      });
    });

    it('should log card update activity with field changes', async () => {
      const updateData = {
        title: 'Updated Card',
        description: '<p>Updated description with <em>formatting</em></p>',
        priority: 'HIGH',
        assigneeId: testAssignee.id
      };

      const response = await request(app)
        .put(`/api/cards/${testCard.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: testCard.id,
          action: 'UPDATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(testBoard.id);
      expect(activities[0].meta).toEqual({
        changes: ['title', 'description', 'priority', 'assigneeId'],
        oldValues: {
          title: 'Original Card',
          description: '<p>Original description</p>',
          priority: 'MEDIUM',
          assigneeId: null
        },
        newValues: {
          title: 'Updated Card',
          description: '<p>Updated description with <em>formatting</em></p>',
          priority: 'HIGH',
          assigneeId: testAssignee.id
        },
        assigneeName: testAssignee.name
      });
    });

    it('should log card update with only changed fields', async () => {
      const updateData = {
        title: 'New Title Only'
        // Other fields not changed
      };

      await request(app)
        .put(`/api/cards/${testCard.id}`)
        .send(updateData)
        .expect(200);

      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: testCard.id,
          action: 'UPDATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].meta).toEqual({
        changes: ['title'],
        oldValues: {
          title: 'Original Card'
        },
        newValues: {
          title: 'New Title Only'
        }
      });
    });

    it('should log card position update as REORDER action', async () => {
      const updateData = {
        position: 1
      };

      await request(app)
        .put(`/api/cards/${testCard.id}`)
        .send(updateData)
        .expect(200);

      // Wait for batched activities to be processed
      await new Promise(resolve => setTimeout(resolve, 200));

      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: testCard.id,
          action: 'REORDER'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].meta).toEqual({
        oldPosition: 0,
        newPosition: 1,
        columnId: testColumn.id,
        columnTitle: testColumn.title
      });
    });

    it('should log assignee changes with names', async () => {
      // First assign to someone
      await request(app)
        .put(`/api/cards/${testCard.id}`)
        .send({ assigneeId: testAssignee.id })
        .expect(200);

      // Then unassign (set to null)
      await request(app)
        .put(`/api/cards/${testCard.id}`)
        .send({ assigneeId: null })
        .expect(200);

      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: testCard.id,
          action: 'UPDATE'
        },
        orderBy: { createdAt: 'asc' }
      });

      expect(activities).toHaveLength(2);
      
      // First assignment
      expect(activities[0].meta).toEqual({
        changes: ['assigneeId'],
        oldValues: { assigneeId: null },
        newValues: { assigneeId: testAssignee.id },
        assigneeName: testAssignee.name
      });

      // Unassignment  
      expect(activities[1].meta).toEqual({
        changes: ['assigneeId'],
        oldValues: { assigneeId: testAssignee.id },
        newValues: { assigneeId: null }
      });
    });

    it('should not log activity when no fields are actually changed', async () => {
      const updateData = {
        title: 'Original Card',
        description: '<p>Original description</p>',
        priority: 'MEDIUM'
      };

      await request(app)
        .put(`/api/cards/${testCard.id}`)
        .send(updateData)
        .expect(200);

      // Should not log any activity when nothing actually changed
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: testCard.id,
          action: 'UPDATE'
        }
      });

      expect(activities).toHaveLength(0);
    });

    it('should not log activity when card update fails', async () => {
      const nonExistentId = 'non-existent-card-id';

      await request(app)
        .put(`/api/cards/${nonExistentId}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      // Should not have logged any activity for failed update
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          action: 'UPDATE'
        }
      });

      expect(activities).toHaveLength(0);
    });
  });

  describe('DELETE /api/cards/:id', () => {
    let testCard: unknown;

    beforeEach(async () => {
      testCard = await testPrisma.card.create({
        data: {
          title: 'Card to Delete',
          description: '<p>This card will be deleted</p>',
          priority: 'LOW',
          position: 0,
          columnId: testColumn.id,
          createdById: testUser.id,
          assigneeId: testAssignee.id
        }
      });
    });

    it('should log card deletion activity', async () => {
      await request(app)
        .delete(`/api/cards/${testCard.id}`)
        .expect(200);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: testCard.id,
          action: 'DELETE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(testBoard.id);
      expect(activities[0].meta).toEqual({
        title: 'Card to Delete',
        description: '<p>This card will be deleted</p>',
        priority: 'LOW',
        assigneeId: testAssignee.id,
        assigneeName: testAssignee.name,
        columnId: testColumn.id,
        columnTitle: testColumn.title,
        position: 0
      });
    });

    it('should not log activity when card deletion fails', async () => {
      const nonExistentId = 'non-existent-card-id';

      await request(app)
        .delete(`/api/cards/${nonExistentId}`)
        .expect(404);

      // Should not have logged any activity for failed deletion
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          action: 'DELETE'
        }
      });

      expect(activities).toHaveLength(0);
    });
  });

  describe('POST /api/cards/:id/move', () => {
    let testCard: unknown;
    let targetColumn: unknown;

    beforeEach(async () => {
      testCard = await testPrisma.card.create({
        data: {
          title: 'Card to Move',
          description: '<p>Moveable card</p>',
          priority: 'MEDIUM',
          position: 0,
          columnId: testColumn.id,
          createdById: testUser.id,
          assigneeId: testAssignee.id
        }
      });

      targetColumn = await testPrisma.column.create({
        data: {
          title: 'Target Column',
          position: 1,
          boardId: testBoard.id
        }
      });
    });

    it('should log card move activity between columns', async () => {
      const moveData = {
        columnId: targetColumn.id,
        position: 0
      };

      const response = await request(app)
        .post(`/api/cards/${testCard.id}/move`)
        .send(moveData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: testCard.id,
          action: 'MOVE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(testBoard.id);
      expect(activities[0].meta).toEqual({
        title: testCard.title,
        fromColumnId: testColumn.id,
        fromColumnTitle: testColumn.title,
        toColumnId: targetColumn.id,
        toColumnTitle: targetColumn.title,
        oldPosition: 0,
        newPosition: 0,
        assigneeId: testAssignee.id,
        assigneeName: testAssignee.name
      });
    });

    it('should log card reorder activity within same column', async () => {
      // Create another card in the same column to have something to reorder with
      const _secondCard = await testPrisma.card.create({
        data: {
          title: 'Second Card',
          position: 1,
          columnId: testColumn.id,
          createdById: testUser.id
        }
      });

      const moveData = {
        columnId: testColumn.id, // Same column
        position: 1
      };

      await request(app)
        .post(`/api/cards/${testCard.id}/move`)
        .send(moveData)
        .expect(200);

      // Wait for LOW priority activity batch processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that activity was logged as REORDER since it's within same column
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: testCard.id,
          action: 'REORDER'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].meta).toEqual({
        title: testCard.title,
        columnId: testColumn.id,
        columnTitle: testColumn.title,
        oldPosition: 0,
        newPosition: 1,
        assigneeId: testAssignee.id,
        assigneeName: testAssignee.name
      });
    });

    it('should not log activity when card move results in no change', async () => {
      const moveData = {
        columnId: testColumn.id, // Same column
        position: 0 // Same position
      };

      await request(app)
        .post(`/api/cards/${testCard.id}/move`)
        .send(moveData)
        .expect(200);

      // Should not log any activity when nothing actually moved
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: testCard.id,
          OR: [
            { action: 'MOVE' },
            { action: 'REORDER' }
          ]
        }
      });

      expect(activities).toHaveLength(0);
    });

    it('should not log activity when card move fails', async () => {
      const nonExistentId = 'non-existent-card-id';
      const moveData = {
        columnId: targetColumn.id,
        position: 0
      };

      await request(app)
        .post(`/api/cards/${nonExistentId}/move`)
        .send(moveData)
        .expect(404);

      // Should not have logged any activity for failed move
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          action: 'MOVE'
        }
      });

      expect(activities).toHaveLength(0);
    });
  });

  describe('Authentication', () => {
    it('should associate card activity with authenticated user', async () => {
      const cardData = {
        title: 'Authenticated Card'
      };

      const response = await request(app)
        .post(`/api/columns/${testColumn.id}/cards`)
        .send(cardData)
        .expect(201);

      // Should have logged activity with correct user
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: response.body.data.id
        },
        include: {
          user: true
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].user?.name).toBe('Test User');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle REORDER actions with LOW priority (rate limited)', async () => {
      const card = await testPrisma.card.create({
        data: {
          title: 'Rate Limited Card',
          position: 0,
          columnId: testColumn.id,
          createdById: testUser.id
        }
      });

      // Multiple rapid reorder operations
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(
          request(app)
            .put(`/api/cards/${card.id}`)
            .send({ position: i })
        );
      }

      await Promise.all(promises);

      // Wait for LOW priority activity batch processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Due to rate limiting, may have fewer activities than operations
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'CARD',
          entityId: card.id,
          action: 'REORDER'
        }
      });

      // Should have some activities, but rate limiting may have reduced the count
      expect(activities.length).toBeGreaterThan(0);
      expect(activities.length).toBeLessThanOrEqual(5);
    });
  });
});