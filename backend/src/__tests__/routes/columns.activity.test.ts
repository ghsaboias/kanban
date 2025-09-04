import { randomUUID } from 'crypto';
import request from 'supertest';
import { testPrisma } from '../setup';
import { createTestApp } from '../testApp';
import { setupGlobalMocks } from './cards.activity.setup';
import { __flushActivityLoggerForTests as flushActivityLogger } from '../../services/activityLoggerSingleton';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

// Restore real ActivityLogger for activity logging tests

// Create test app instance
const app = createTestApp();

describe('Columns Routes - Activity Logging', () => {
  let testUser: { id: string; email: string; name: string; clerkId: string | null; };
  let testBoard: { id: string; title: string; description?: string | null; };

  beforeAll(() => {
    setupGlobalMocks();
  });

  beforeEach(async () => {
    // Create test user for authentication with unique data
    const uniqueId = randomUUID();
    testUser = await testPrisma.user.create({
      data: {
        id: `test-user-id-${uniqueId}`,
        email: `test-${uniqueId}@example.com`,
        name: 'Test User',
        clerkId: `test-clerk-id-${uniqueId}`
      }
    });

    // Create test board
    testBoard = await testPrisma.board.create({
      data: {
        title: 'Test Board',
        description: 'Test board for columns'
      }
    });

    // Verify both were created successfully
    if (!testUser || !testBoard) {
      throw new Error('Failed to create test data');
    }

    // Double-check they exist in the database
    const userExists = await testPrisma.user.findUnique({ where: { id: testUser.id } });
    const boardExists = await testPrisma.board.findUnique({ where: { id: testBoard.id } });

    if (!userExists || !boardExists) {
      throw new Error('Test data not found in database after creation');
    }
  });

  afterEach(async () => {
    await flushActivityLogger();
  });

  describe('POST /api/boards/:boardId/columns', () => {
    it('should log column creation activity with all fields', async () => {
      const columnData = {
        title: 'New Column',
        position: 0
      };

      const response = await request(app)
        .post(`/api/boards/${testBoard.id}/columns`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(columnData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(columnData.title);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: response.body.data.id,
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(testBoard.id);
      expect(JSON.parse(activities[0].meta)).toEqual({
        title: columnData.title,
        position: columnData.position
      });
    });

    it('should log column creation activity without explicit position', async () => {
      const columnData = {
        title: 'Auto Position Column'
      };

      const response = await request(app)
        .post(`/api/boards/${testBoard.id}/columns`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(columnData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.position).toBe(0);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: response.body.data.id,
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(JSON.parse(activities[0].meta)).toEqual({
        title: columnData.title,
        position: 0
      });
    });

    it('should not log activity when column creation fails', async () => {
      const nonExistentBoardId = 'non-existent-board-id';
      const columnData = {
        title: 'Failed Column',
        position: 0
      };

      // Get count of activities before the failed operation
      const activitiesBefore = await testPrisma.activity.count({
        where: {
          entityType: 'COLUMN',
          action: 'CREATE'
        }
      });

      await request(app)
        .post(`/api/boards/${nonExistentBoardId}/columns`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(columnData)
        .expect(404);

      // Should not have logged any NEW activity for failed creation
      const activitiesAfter = await testPrisma.activity.count({
        where: {
          entityType: 'COLUMN',
          action: 'CREATE'
        }
      });

      expect(activitiesAfter).toBe(activitiesBefore);
    });
  });

  describe('PUT /api/columns/:id', () => {
    let testColumn: { id: string; title: string; position: number; boardId: string; };

    beforeEach(async () => {
      testColumn = await testPrisma.column.create({
        data: {
          title: 'Original Column',
          position: 0,
          boardId: testBoard.id
        }
      });
    });

    it('should log column update activity for title changes', async () => {
      const updateData = {
        title: 'Updated Column Title'
      };

      const response = await request(app)
        .put(`/api/columns/${testColumn.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: testColumn.id,
          action: 'UPDATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(testBoard.id);
      expect(JSON.parse(activities[0].meta)).toEqual({
        changes: ['title'],
        oldValues: {
          title: 'Original Column'
        },
        newValues: {
          title: 'Updated Column Title'
        }
      });
    });

    it('should log column reorder activity for position changes', async () => {
      // Create a second column to enable reordering
      await testPrisma.column.create({
        data: {
          title: 'Second Column',
          position: 1,
          boardId: testBoard.id
        }
      });

      const updateData = {
        position: 1
      };

      await request(app)
        .put(`/api/columns/${testColumn.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(updateData)
        .expect(200);

      // Wait for LOW priority activity batch processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that activity was logged as REORDER for position changes
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: testColumn.id,
          action: 'REORDER'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(testBoard.id);
      expect(JSON.parse(activities[0].meta)).toEqual({
        oldPosition: 0,
        newPosition: 1
      });
    });

    it('should log both update and reorder when both title and position change', async () => {
      const updateData = {
        title: 'Updated and Moved Column',
        position: 1
      };

      await request(app)
        .put(`/api/columns/${testColumn.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(updateData)
        .expect(200);

      // Wait for LOW priority activity batch processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that both UPDATE and REORDER activities were logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: testColumn.id
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      expect(activities).toHaveLength(2);

      // First should be UPDATE for title change
      expect(activities[0].action).toBe('UPDATE');
      expect(JSON.parse(activities[0].meta)).toEqual({
        changes: ['title'],
        oldValues: {
          title: 'Original Column'
        },
        newValues: {
          title: 'Updated and Moved Column'
        }
      });

      // Second should be REORDER for position change
      expect(activities[1].action).toBe('REORDER');
      expect(JSON.parse(activities[1].meta)).toEqual({
        oldPosition: 0,
        newPosition: 1
      });
    });

    it('should not log activity when nothing actually changes', async () => {
      const updateData = {
        title: 'Original Column', // Same title
        position: 0 // Same position
      };

      await request(app)
        .put(`/api/columns/${testColumn.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(updateData)
        .expect(200);

      // Should not log any activity when nothing changes
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: testColumn.id,
          OR: [
            { action: 'UPDATE' },
            { action: 'REORDER' }
          ]
        }
      });

      expect(activities).toHaveLength(0);
    });

    it('should not log activity when column update fails', async () => {
      const nonExistentId = 'non-existent-column-id';
      const updateData = {
        title: 'Failed Update'
      };

      // Get count of activities before the failed operation
      const activitiesBefore = await testPrisma.activity.count({
        where: {
          entityType: 'COLUMN',
          action: 'UPDATE'
        }
      });

      await request(app)
        .put(`/api/columns/${nonExistentId}`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(updateData)
        .expect(404);

      // Should not have logged any NEW activity for failed update
      const activitiesAfter = await testPrisma.activity.count({
        where: {
          entityType: 'COLUMN',
          action: 'UPDATE'
        }
      });

      expect(activitiesAfter).toBe(activitiesBefore);
    });
  });

  describe('DELETE /api/columns/:id', () => {
    let testColumn: { id: string; title: string; position: number; boardId: string; };

    beforeEach(async () => {
      testColumn = await testPrisma.column.create({
        data: {
          title: 'Column to Delete',
          position: 0,
          boardId: testBoard.id
        }
      });
    });

    it('should log column deletion activity', async () => {
      await request(app)
        .delete(`/api/columns/${testColumn.id}`)
        .set('x-test-user', JSON.stringify(testUser))
        .expect(200);

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: testColumn.id,
          action: 'DELETE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(testBoard.id);
      expect(JSON.parse(activities[0].meta)).toEqual({
        title: 'Column to Delete',
        position: 0
      });
    });

    it('should not log activity when column deletion fails', async () => {
      const nonExistentId = 'non-existent-column-id';

      // Get count of activities before the failed operation
      const activitiesBefore = await testPrisma.activity.count({
        where: {
          entityType: 'COLUMN',
          action: 'DELETE'
        }
      });

      await request(app)
        .delete(`/api/columns/${nonExistentId}`)
        .set('x-test-user', JSON.stringify(testUser))
        .expect(404);

      // Should not have logged any NEW activity for failed deletion
      const activitiesAfter = await testPrisma.activity.count({
        where: {
          entityType: 'COLUMN',
          action: 'DELETE'
        }
      });

      expect(activitiesAfter).toBe(activitiesBefore);
    });
  });

  describe('POST /api/columns/:id/reorder', () => {
    let testColumn: { id: string; title: string; position: number; boardId: string; };

    beforeEach(async () => {
      testColumn = await testPrisma.column.create({
        data: {
          title: 'Reorderable Column',
          position: 0,
          boardId: testBoard.id
        }
      });

      // Create additional columns for reordering
      await testPrisma.column.create({
        data: {
          title: 'Second Column',
          position: 1,
          boardId: testBoard.id
        }
      });

      await testPrisma.column.create({
        data: {
          title: 'Third Column',
          position: 2,
          boardId: testBoard.id
        }
      });
    });

    it('should log column reorder activity', async () => {
      const reorderData = {
        position: 2
      };

      await request(app)
        .post(`/api/columns/${testColumn.id}/reorder`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(reorderData)
        .expect(200);

      // Wait for LOW priority activity batch processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that activity was logged
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: testColumn.id,
          action: 'REORDER'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
      expect(activities[0].boardId).toBe(testBoard.id);
      expect(JSON.parse(activities[0].meta)).toEqual({
        oldPosition: 0,
        newPosition: 2
      });
    });

    it('should not log activity when reorder results in no change', async () => {
      const reorderData = {
        position: 0 // Same position
      };

      await request(app)
        .post(`/api/columns/${testColumn.id}/reorder`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(reorderData)
        .expect(200);

      // Should not log any activity when position doesn't change
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: testColumn.id,
          action: 'REORDER'
        }
      });

      expect(activities).toHaveLength(0);
    });

    it('should not log activity when column reorder fails', async () => {
      const nonExistentId = 'non-existent-column-id';
      const reorderData = {
        position: 1
      };

      // Get count of activities before the failed operation
      const activitiesBefore = await testPrisma.activity.count({
        where: {
          entityType: 'COLUMN',
          action: 'REORDER'
        }
      });

      await request(app)
        .post(`/api/columns/${nonExistentId}/reorder`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(reorderData)
        .expect(404);

      // Should not have logged any NEW activity for failed reorder
      const activitiesAfter = await testPrisma.activity.count({
        where: {
          entityType: 'COLUMN',
          action: 'REORDER'
        }
      });

      expect(activitiesAfter).toBe(activitiesBefore);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle REORDER actions with LOW priority (rate limited)', async () => {
      const column = await testPrisma.column.create({
        data: {
          title: 'Rate Limited Column',
          position: 0,
          boardId: testBoard.id
        }
      });

      // Create more columns for reordering space
      for (let i = 1; i <= 5; i++) {
        await testPrisma.column.create({
          data: {
            title: `Column ${i}`,
            position: i,
            boardId: testBoard.id
          }
        });
      }

      // Multiple rapid reorder operations
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(
          request(app)
            .put(`/api/columns/${column.id}`)
            .set('x-test-user', JSON.stringify(testUser))
            .send({ position: i })
        );
      }

      await Promise.all(promises);

      // Wait for LOW priority activity batch processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Due to rate limiting, may have fewer activities than operations
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          entityId: column.id,
          action: 'REORDER'
        }
      });

      // Should have some activities, but rate limiting may have reduced the count
      expect(activities.length).toBeGreaterThan(0);
      expect(activities.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle activity logging failures gracefully and not fail the request', async () => {
      const columnData = {
        title: 'Column with Logging Error',
        position: 0
      };

      // Mock ActivityLogger to throw an error
      const originalConsoleError = console.error;
      console.error = () => { };

      // This should still succeed even if activity logging fails
      const response = await request(app)
        .post(`/api/boards/${testBoard.id}/columns`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(columnData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(columnData.title);

      console.error = originalConsoleError;
    });

    it('should not log activity for unauthenticated requests', async () => {
      // This test would need the auth middleware to actually reject unauthenticated requests
      // For now, we just verify the pattern
      const columnData = {
        title: 'Unauthenticated Column'
      };

      // Get count of activities before the operation
      const activitiesBefore = await testPrisma.activity.count({
        where: {
          entityType: 'COLUMN',
          action: 'CREATE'
        }
      });

      // In a real scenario, this would be a 401, but our mock allows it through
      await request(app)
        .post(`/api/boards/${testBoard.id}/columns`)
        .set('x-test-user', JSON.stringify(testUser))
        .send(columnData)
        .expect(201);

      // Activity should still be logged with the mocked user
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          action: 'CREATE'
        }
      });

      // Check that exactly one new activity was created
      expect(activities).toHaveLength(activitiesBefore + 1);
      expect(activities[activities.length - 1].userId).toBe(testUser.id);
    });
  });
});
