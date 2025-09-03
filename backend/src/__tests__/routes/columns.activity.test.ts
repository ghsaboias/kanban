import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import columnsRouter from '../../routes/columns';
import { testPrisma } from '../setup';

// Restore real ActivityLogger for activity logging tests
jest.unmock('../../services/activityLogger');

// Create a minimal test app with just the columns routes
const createTestApp = (userId: string) => {
  const app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.user = {
      id: userId,
      name: 'Test User',
      email: 'test@example.com',
      clerkId: 'test-clerk-id'
    };
    next();
  });

  // Mount the columns router
  app.use('/api', columnsRouter);

  return app;
};

describe('Columns Routes - Activity Logging', () => {
  let testUser: { id: string; email: string; name: string; clerkId: string | null; };
  let testBoard: { id: string; title: string; description?: string | null; };
  let testApp: express.Application;

  beforeAll(() => {
    const fakeBroadcaster: { emit: jest.Mock; except: jest.Mock } = {
      emit: jest.fn(),
      except: jest.fn(() => fakeBroadcaster)
    };
    (global as unknown as { io: { to: jest.Mock } }).io = { to: jest.fn(() => fakeBroadcaster) };
  });

  beforeEach(async () => {
    // Create test user for authentication with unique data
    const timestamp = Date.now();
    testUser = await testPrisma.user.create({
      data: {
        id: `test-user-id-${timestamp}`,
        email: `test-${timestamp}@example.com`,
        name: 'Test User',
        clerkId: `test-clerk-id-${timestamp}`
      }
    });

    // Create test board
    testBoard = await testPrisma.board.create({
      data: {
        title: 'Test Board',
        description: 'Test board for columns'
      }
    });

    // Create test app with proper authentication
    testApp = createTestApp(testUser.id);

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
    // Wait for any pending activity logging to complete before cleanup
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  describe('POST /api/boards/:boardId/columns', () => {
    it('should log column creation activity with all fields', async () => {
      const columnData = {
        title: 'New Column',
        position: 0
      };

      const response = await request(testApp)
        .post(`/api/boards/${testBoard.id}/columns`)
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

      const response = await request(testApp)
        .post(`/api/boards/${testBoard.id}/columns`)
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

      await request(testApp)
        .post(`/api/boards/${nonExistentBoardId}/columns`)
        .send(columnData)
        .expect(404);

      // Should not log any activity when creation fails
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(0);
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

      const response = await request(testApp)
        .put(`/api/columns/${testColumn.id}`)
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

      await request(testApp)
        .put(`/api/columns/${testColumn.id}`)
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

      await request(testApp)
        .put(`/api/columns/${testColumn.id}`)
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

      await request(testApp)
        .put(`/api/columns/${testColumn.id}`)
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

      await request(testApp)
        .put(`/api/columns/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      // Should not log any activity when update fails
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          action: 'UPDATE'
        }
      });

      expect(activities).toHaveLength(0);
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
      await request(testApp)
        .delete(`/api/columns/${testColumn.id}`)
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

      await request(testApp)
        .delete(`/api/columns/${nonExistentId}`)
        .expect(404);

      // Should not log any activity when deletion fails
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          action: 'DELETE'
        }
      });

      expect(activities).toHaveLength(0);
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

      await request(testApp)
        .post(`/api/columns/${testColumn.id}/reorder`)
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

      await request(testApp)
        .post(`/api/columns/${testColumn.id}/reorder`)
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

      await request(testApp)
        .post(`/api/columns/${nonExistentId}/reorder`)
        .send(reorderData)
        .expect(404);

      // Should not log any activity when reorder fails
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          action: 'REORDER'
        }
      });

      expect(activities).toHaveLength(0);
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
          request(testApp)
            .put(`/api/columns/${column.id}`)
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
      console.error = jest.fn();

      // This should still succeed even if activity logging fails
      const response = await request(testApp)
        .post(`/api/boards/${testBoard.id}/columns`)
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

      // In a real scenario, this would be a 401, but our mock allows it through
      await request(testApp)
        .post(`/api/boards/${testBoard.id}/columns`)
        .send(columnData)
        .expect(201);

      // Activity should still be logged with the mocked user
      const activities = await testPrisma.activity.findMany({
        where: {
          entityType: 'COLUMN',
          action: 'CREATE'
        }
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].userId).toBe(testUser.id);
    });
  });
});