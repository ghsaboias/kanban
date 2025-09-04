import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { randomUUID } from 'crypto';
import { ActivityLogger } from '../../services/activityLogger';
import { testPrisma } from '../setup';

// Mock Socket.IO for testing
const mockEmit = mock();
const mockExceptEmit = mock();
const mockExcept = mock(() => ({
  emit: mockExceptEmit
}));
const mockTo = mock(() => ({
  emit: mockEmit,
  except: mockExcept
}));

const mockIo = {
  to: mockTo
};

// Set up global.io mock
(global as unknown as { io: typeof mockIo }).io = mockIo;

// Helper function to create test data
async function createTestBoard() {
  const uniqueId = randomUUID();
  const user = await testPrisma.user.create({
    data: {
      email: `test-${uniqueId}@example.com`,
      name: 'Test User',
      clerkId: `test-clerk-id-${uniqueId}`
    }
  });

  const board = await testPrisma.board.create({
    data: {
      title: 'Test Board',
      description: 'Test board for activity logging'
    }
  });

  const column = await testPrisma.column.create({
    data: {
      title: 'Test Column',
      position: 0,
      boardId: board.id
    }
  });

  const card = await testPrisma.card.create({
    data: {
      title: 'Test Card',
      description: 'Test card description',
      priority: 'MEDIUM',
      position: 0,
      columnId: column.id,
      createdById: user.id
    }
  });

  return { user, board, column, card };
}

describe('ActivityLogger Service', () => {
  let activityLogger: ActivityLogger;

  beforeEach(async () => {
    // Create fresh activity logger instance
    activityLogger = new ActivityLogger(testPrisma);
    // Clear all mocks - Note: Bun test mocks don't have mockClear(), they reset automatically
    // In Bun, mock functions are automatically reset between tests
  });

  afterEach(async () => {
    // Clean up any pending batches
    await activityLogger.flush();
    await activityLogger.stop();
  });

  describe('Basic Activity Logging', () => {
    it('should log high-priority activities immediately', async () => {
      const { user, board, card } = await createTestBoard();

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'CREATE',
        boardId: board.id,
        columnId: card.columnId,
        userId: user.id,
        meta: { title: card.title },
        priority: 'HIGH'
      });

      const activities = await testPrisma.activity.findMany({
        where: { boardId: board.id }
      });
      expect(activities).toHaveLength(1);
      expect(activities[0].entityType).toBe('CARD');
      expect(activities[0].action).toBe('CREATE');
    });

    it('should queue low-priority activities for batch processing', async () => {
      const { user, board, card } = await createTestBoard();

      // Log a low-priority activity
      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'UPDATE',
        boardId: board.id,
        columnId: card.columnId,
        userId: user.id,
        meta: { field: 'position', oldValue: 0, newValue: 1 },
        priority: 'LOW'
      });

      // Should not be in database immediately
      let activities = await testPrisma.activity.findMany({
        where: { boardId: board.id }
      });
      expect(activities).toHaveLength(0);

      // Should be in queue
      expect(activityLogger.getQueueSize()).toBe(1);

      // Flush the queue
      await activityLogger.flush();

      // Now should be in database
      activities = await testPrisma.activity.findMany({
        where: { boardId: board.id }
      });
      expect(activities).toHaveLength(1);
    });

    it('should batch multiple drag events within time window', async () => {
      const { user, board, card } = await createTestBoard();

      // Create multiple cards to avoid rate limiting
      const cards = [];
      for (let i = 0; i < 5; i++) {
        const newCard = await testPrisma.card.create({
          data: {
            title: `Test Card ${i}`,
            description: 'Test card description',
            priority: 'MEDIUM',
            position: i,
            columnId: card.columnId,
            createdById: user.id
          }
        });
        cards.push(newCard);
      }

      // Simulate rapid position changes with different cards
      for (let i = 0; i < 5; i++) {
        await activityLogger.logActivity({
          entityType: 'CARD',
          entityId: cards[i].id,
          action: 'REORDER',
          boardId: board.id,
          columnId: card.columnId,
          userId: user.id,
          meta: { position: i },
          priority: 'LOW'
        });
      }

      expect(activityLogger.getQueueSize()).toBe(5);

      // Wait for batch processing to complete
      // The batch interval is 100ms, so wait a bit longer to ensure processing completes
      await new Promise(resolve => setTimeout(resolve, 200));

      const activities = await testPrisma.activity.findMany({
        where: { boardId: board.id }
      });
      expect(activities).toHaveLength(5);
    });

    it('should handle logging failures gracefully', async () => {
      const { user, board } = await createTestBoard();

      // Mock the prisma.activity.create to fail
      const consoleSpy = mock();
      const originalConsoleError = console.error;
      console.error = consoleSpy;

      const createSpy = mock(() => Promise.reject(new Error('Database error')));
      const originalCreate = testPrisma.activity.create;
      testPrisma.activity.create = createSpy as unknown as typeof testPrisma.activity.create;

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: 'test-card-id',
        action: 'CREATE',
        boardId: board.id,
        userId: user.id,
        meta: {},
        priority: 'HIGH'
      });

      expect(consoleSpy).toHaveBeenCalled();

      // Restore mocks
      console.error = originalConsoleError;
      testPrisma.activity.create = originalCreate;
      testPrisma.activity.create = originalCreate;
      console.error = originalConsoleError;

      // Should not throw and other logging should continue to work
      await activityLogger.logActivity({
        entityType: 'BOARD',
        entityId: board.id,
        action: 'UPDATE',
        boardId: board.id,
        userId: user.id,
        meta: { title: 'Updated Title' },
        priority: 'HIGH'
      });

      // Ensure all pending activities are processed
      await activityLogger.flush();

      const activities = await testPrisma.activity.findMany({ where: { boardId: board.id } });
      expect(activities).toHaveLength(1);
      expect(activities[0].entityType).toBe('BOARD');
    });
  });

  describe('Real-time Event Broadcasting', () => {
    it('should emit real-time events when configured', async () => {
      const { user, board, card } = await createTestBoard();

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'CREATE',
        boardId: board.id,
        columnId: card.columnId,
        userId: user.id,
        meta: { title: card.title },
        priority: 'HIGH',
        broadcastRealtime: true
      });

      expect(mockTo).toHaveBeenCalledWith(`board-${board.id}`);
    });

    it('should broadcast to all clients including initiator', async () => {
      const { user, board, card } = await createTestBoard();
      const socketId = 'socket-123';

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'UPDATE',
        boardId: board.id,
        columnId: card.columnId,
        userId: user.id,
        meta: { title: 'New Title' },
        priority: 'HIGH',
        broadcastRealtime: true,
        initiatorSocketId: socketId
      });

      expect(mockTo).toHaveBeenCalledWith(`board-${board.id}`);
      expect(mockEmit).toHaveBeenCalledWith('activity:created', expect.any(Object));
      // Should not exclude initiator - mockExcept should not be called
      expect(mockExcept).not.toHaveBeenCalled();
    });

    it('should broadcast all events including high-frequency ones', async () => {
      const { user, board, card } = await createTestBoard();

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'REORDER',
        boardId: board.id,
        columnId: card.columnId,
        userId: user.id,
        meta: { position: 5 },
        priority: 'LOW',
        broadcastRealtime: true // All events are broadcast now
      });

      await activityLogger.flush();
      expect(mockTo).toHaveBeenCalledWith(`board-${board.id}`);
      expect(mockEmit).toHaveBeenCalledWith('activity:created', expect.any(Object));
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limiting for high-frequency events', async () => {
      const { user, board, card } = await createTestBoard();

      // Simulate very rapid position updates (more than rate limit)
      for (let i = 0; i < 20; i++) {
        await activityLogger.logActivity({
          entityType: 'CARD',
          entityId: card.id,
          action: 'REORDER',
          boardId: board.id,
          columnId: card.columnId,
          userId: user.id,
          meta: { position: i },
          priority: 'LOW'
        });
      }

      await activityLogger.flush();

      const activities = await testPrisma.activity.findMany({ where: { boardId: board.id } });
      // Should be rate limited to fewer than 20 activities
      expect(activities.length).toBeLessThan(20);
      expect(activities.length).toBeGreaterThan(0);
    });

    it('should not rate limit different types of activities', async () => {
      const { user, board, card } = await createTestBoard();

      // Mix different activity types - use different cards to avoid any rate limiting
      const card2 = await testPrisma.card.create({
        data: {
          title: 'Test Card 2',
          description: 'Test card description',
          priority: 'MEDIUM',
          position: 1,
          columnId: card.columnId,
          createdById: user.id
        }
      });

      const card3 = await testPrisma.card.create({
        data: {
          title: 'Test Card 3',
          description: 'Test card description',
          priority: 'MEDIUM',
          position: 2,
          columnId: card.columnId,
          createdById: user.id
        }
      });

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'REORDER',
        boardId: board.id,
        userId: user.id,
        meta: { position: 1 },
        priority: 'LOW'
      });

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card2.id,
        action: 'UPDATE',
        boardId: board.id,
        userId: user.id,
        meta: { title: 'New Title' },
        priority: 'HIGH'
      });

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card3.id,
        action: 'ASSIGN',
        boardId: board.id,
        userId: user.id,
        meta: { assigneeId: user.id },
        priority: 'HIGH'
      });

      await activityLogger.flush();

      const activities = await testPrisma.activity.findMany({ where: { boardId: board.id } });
      expect(activities).toHaveLength(3);
    });
  });

  describe('Queue Management', () => {
    it('should provide queue size information', async () => {
      const { user, board, card } = await createTestBoard();

      expect(activityLogger.getQueueSize()).toBe(0);

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'REORDER',
        boardId: board.id,
        userId: user.id,
        meta: { position: 1 },
        priority: 'LOW'
      });

      expect(activityLogger.getQueueSize()).toBe(1);

      await activityLogger.flush();
      expect(activityLogger.getQueueSize()).toBe(0);
    });

    it('should handle queue overflow gracefully', async () => {
      const { user, board, card } = await createTestBoard();

      // Create activity logger with small queue size
      const smallQueueLogger = new ActivityLogger(testPrisma, {
        maxQueueSize: 3,
        batchSize: 2
      });

      // Add more activities than queue can handle
      for (let i = 0; i < 5; i++) {
        await smallQueueLogger.logActivity({
          entityType: 'CARD',
          entityId: card.id,
          action: 'REORDER',
          boardId: board.id,
          userId: user.id,
          meta: { position: i },
          priority: 'LOW'
        });
      }

      // Should have processed some activities automatically
      await smallQueueLogger.flush();
      await smallQueueLogger.stop();

      const activities = await testPrisma.activity.findMany({ where: { boardId: board.id } });
      expect(activities.length).toBeGreaterThan(0);
      expect(activities.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed database operations', async () => {
      const { user, board, card } = await createTestBoard();

      // Create a spy to simulate temporary database failure
      let callCount = 0;
      const createSpy = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Database connection failed'));
        }
        return Promise.resolve({
          id: 'test-id',
          createdAt: new Date(),
          entityType: 'CARD',
          entityId: card.id,
          action: 'CREATE',
          boardId: board.id,
          columnId: card.columnId,
          userId: user.id,
          meta: JSON.stringify({})
        });
      });
      const originalCreate = testPrisma.activity.create;
      testPrisma.activity.create = createSpy as unknown as typeof testPrisma.activity.create;

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'CREATE',
        boardId: board.id,
        columnId: card.columnId,
        userId: user.id,
        meta: { title: card.title },
        priority: 'HIGH'
      });

      // Should have retried and succeeded
      expect(createSpy).toHaveBeenCalledTimes(2);
      testPrisma.activity.create = originalCreate;
    });

    it('should handle permanent failures after max retries', async () => {
      const { user, board, card } = await createTestBoard();
      const consoleSpy = mock();
      const originalConsoleError = console.error;
      console.error = consoleSpy;

      // Mock permanent failure
      const createSpy = mock(() => Promise.reject(new Error('Permanent database failure')));
      const originalCreate = testPrisma.activity.create;
      testPrisma.activity.create = createSpy as unknown as typeof testPrisma.activity.create;

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'CREATE',
        boardId: board.id,
        userId: user.id,
        meta: {},
        priority: 'HIGH'
      });

      expect(createSpy).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log activity:',
        expect.any(Error)
      );

      testPrisma.activity.create = originalCreate;
      console.error = originalConsoleError;
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete immediate logging within 500ms', async () => {
      const { user, board, card } = await createTestBoard();
      const startTime = Date.now();

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'CREATE',
        boardId: board.id,
        userId: user.id,
        meta: { title: card.title },
        priority: 'HIGH'
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // More reasonable for test environment

      const activities = await testPrisma.activity.findMany({ where: { boardId: board.id } });
      expect(activities).toHaveLength(1);
      expect(activities[0].action).toBe('CREATE');
    });

    it('should handle batch processing within 3 seconds', async () => {
      const { user, board, card } = await createTestBoard();
      const startTime = Date.now();

      // Create multiple cards to avoid rate limiting
      const cards = [];
      for (let i = 0; i < 10; i++) {
        const newCard = await testPrisma.card.create({
          data: {
            title: `Batch Test Card ${i}`,
            description: 'Test card description',
            priority: 'MEDIUM',
            position: i,
            columnId: card.columnId,
            createdById: user.id
          }
        });
        cards.push(newCard);
      }

      // Queue 10 low-priority activities with different entity IDs
      for (let i = 0; i < 10; i++) {
        await activityLogger.logActivity({
          entityType: 'CARD',
          entityId: cards[i].id,
          action: 'REORDER',
          boardId: board.id,
          userId: user.id,
          meta: { position: i },
          priority: 'LOW'
        });
      }

      await activityLogger.flush();
      const duration = Date.now() - startTime;

      // Should complete batch within 3 seconds (reasonable for test environment with DB setup)
      expect(duration).toBeLessThan(3000);

      const activities = await testPrisma.activity.findMany({ where: { boardId: board.id } });
      expect(activities).toHaveLength(10);
      expect(activities[0].action).toBe('REORDER');
    });
  });
});