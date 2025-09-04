import { randomUUID } from 'crypto';
import request from 'supertest';
import { testPrisma } from '../setup';
import { createTestApp } from '../testApp';
import { beforeEach, describe, expect, it } from 'bun:test';

// Create test app instance
const app = createTestApp();

describe('Board Routes - Activity Logging', () => {
  let testUser: { id: string; email: string; name: string; clerkId: string | null; };

  beforeEach(async () => {
    // Create a test user for authentication
    const uniqueId = randomUUID();
    const userId = `test-user-${uniqueId}`;
    testUser = await testPrisma.user.create({
      data: {
        id: userId,
        email: `test-${uniqueId}@example.com`,
        name: 'Test User',
        clerkId: `test-clerk-${uniqueId}`
      }
    });
  });

  describe('POST /api/boards', () => {
    it('should log board creation activity', async () => {
      const boardData = {
        title: 'Test Board',
        description: 'Test board description'
      };

      const response = await request(app)
        .post('/api/boards')
        .set('x-test-user', JSON.stringify(testUser))
        .send(boardData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(boardData.title);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'BOARD',
          entityId: response.body.data.id,
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(response.body.data.id);
      expect(JSON.parse(activities[0].meta)).toEqual({
        title: boardData.title,
        description: boardData.description
      });
    });

    it('should log board creation with correct priority', async () => {
      const boardData = {
        title: 'High Priority Board',
        description: 'Important board'
      };

      const response = await request(app)
        .post('/api/boards')
        .set('x-test-user', JSON.stringify(testUser))
        .send(boardData)
        .expect(201);

      // Check that activity was logged immediately (HIGH priority)
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'BOARD',
          entityId: response.body.data.id,
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].createdAt).toBeInstanceOf(Date);
      // Should be logged immediately, so createdAt should be very recent
      const timeDiff = Date.now() - activities[0].createdAt.getTime();
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second ago
    });
  });

  describe('PUT /api/boards/:id', () => {
    it('should log board update activity with field changes', async () => {
      // Create a board first
      const board = await testPrisma.board.create({
        data: {
          title: 'Original Title',
          description: 'Original description'
        }
      });

      const updateData = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/boards/${board.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'BOARD',
          entityId: board.id,
          action: 'UPDATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(board.id);
      expect(JSON.parse(activities[0].meta)).toEqual({
        changes: ['title', 'description'],
        oldValues: {
          title: 'Original Title',
          description: 'Original description'
        },
        newValues: {
          title: 'Updated Title',
          description: 'Updated description'
        }
      });
    });

    it('should log board update with only changed fields', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Original Title',
          description: 'Original description'
        }
      });

      const updateData = {
        title: 'New Title'
        // description not changed
      };

      await request(app)
        .put(`/api/boards/${board.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(updateData)
        .expect(200);

      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'BOARD',
          entityId: board.id,
          action: 'UPDATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(JSON.parse(activities[0].meta)).toEqual({
        changes: ['title'],
        oldValues: {
          title: 'Original Title'
        },
        newValues: {
          title: 'New Title'
        }
      });
    });

    it('should not log activity when no fields are actually changed', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Same Title',
          description: 'Same description'
        }
      });

      const updateData = {
        title: 'Same Title',
        description: 'Same description'
      };

      await request(app)
        .put(`/api/boards/${board.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(updateData)
        .expect(200);

      // Should not log any activity when nothing actually changed
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'BOARD',
          entityId: board.id,
          action: 'UPDATE'
        }
      });

      expect(activities).toHaveLength(0);
    });
  });

  describe('DELETE /api/boards/:id', () => {
    it('should log board deletion activity', async () => {
      const board = await testPrisma.board.create({
        data: {
          title: 'Board to Delete',
          description: 'This board will be deleted'
        }
      });

      await request(app)
        .delete(`/api/boards/${board.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .expect(200);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'BOARD',
          entityId: board.id,
          action: 'DELETE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(board.id);
      expect(JSON.parse(activities[0].meta)).toEqual({
        title: 'Board to Delete',
        description: 'This board will be deleted'
      });
    });

    it('should log deletion activity even when board has columns and cards', async () => {
      // Create board with nested data
      const board = await testPrisma.board.create({
        data: {
          title: 'Board with Data',
          columns: {
            create: {
              title: 'Test Column',
              position: 0,
              cards: {
                create: {
                  title: 'Test Card',
                  position: 0,
                  priority: 'MEDIUM',
                  createdBy: {
                    connect: { id: testUser.id }
                  }
                }
              }
            }
          }
        }
      });

      await request(app)
        .delete(`/api/boards/${board.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .expect(200);

      // Should still log board deletion activity
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'BOARD',
          entityId: board.id,
          action: 'DELETE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(JSON.parse(activities[0].meta)).toEqual({
        title: 'Board with Data',
        description: null,
        cascadeDeleted: {
          columns: 1,
          cards: 1
        }
      });
    });
  });

  describe('Error Cases', () => {
    it('should not log activity when board creation fails', async () => {
      // Get current activity count before the failed operation
      const activitiesBefore = await testPrisma.activity.count({
        where: {
          entityType: 'BOARD',
          action: 'CREATE'
        }
      });

      const invalidBoardData = {
        // Missing required title
        description: 'Invalid board'
      };

      await request(app)
        .post('/api/boards')
        .set('x-test-user', JSON.stringify(testUser))
        .send(invalidBoardData)
        .expect(400);

      // Should not have logged any new activity for failed creation
      const activitiesAfter = await testPrisma.activity.count({
        where: {
          entityType: 'BOARD',
          action: 'CREATE'
        }
      });

      expect(activitiesAfter).toBe(activitiesBefore);
    });

    it('should not log activity when board update fails', async () => {
      // Get current activity count before the failed operation
      const activitiesBefore = await testPrisma.activity.count({
        where: {
          entityType: 'BOARD',
          action: 'UPDATE'
        }
      });

      const nonExistentId = 'non-existent-board-id';

      await request(app)
        .put(`/api/boards/${nonExistentId}`)
        .set('x-test-user', JSON.stringify(testUser))
        .send({ title: 'Updated Title' })
        .expect(404);

      // Should not have logged any new activity for failed update
      const activitiesAfter = await testPrisma.activity.count({
        where: {
          entityType: 'BOARD',
          action: 'UPDATE'
        }
      });

      expect(activitiesAfter).toBe(activitiesBefore);
    });

    it('should not log activity when board deletion fails', async () => {
      // Get current activity count before the failed operation
      const activitiesBefore = await testPrisma.activity.count({
        where: {
          entityType: 'BOARD',
          action: 'DELETE'
        }
      });

      const nonExistentId = 'non-existent-board-id';

      await request(app)
        .delete(`/api/boards/${nonExistentId}`)
        .set('x-test-user', JSON.stringify(testUser))
        .expect(404);

      // Should not have logged any new activity for failed deletion
      const activitiesAfter = await testPrisma.activity.count({
        where: {
          entityType: 'BOARD',
          action: 'DELETE'
        }
      });

      expect(activitiesAfter).toBe(activitiesBefore);
    });
  });

  describe('Authentication', () => {
    it('should associate activity with authenticated user', async () => {
      const boardData = {
        title: 'Authenticated Board'
      };

      const response = await request(app)
        .post('/api/boards')
        .set('x-test-user', JSON.stringify(testUser))
        .send(boardData)
        .expect(201);

      // Should have logged activity with correct user
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'BOARD',
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
});
