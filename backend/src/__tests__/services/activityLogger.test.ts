import { ActivityLogger } from '../../services/activityLogger';
import { testPrisma } from '../setup';

// Mock Socket.IO for testing
const mockEmit = jest.fn();
const mockExceptEmit = jest.fn();
const mockExcept = jest.fn(() => ({
  emit: mockExceptEmit
}));
const mockTo = jest.fn(() => ({
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
  const user = await testPrisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      clerkId: 'test-clerk-id'
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
    // Clear all mocks
    mockEmit.mockClear();
    mockExceptEmit.mockClear();
    mockExcept.mockClear();
    mockTo.mockClear();
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

      const activities = await testPrisma.activity.findMany();
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
      let activities = await testPrisma.activity.findMany();
      expect(activities).toHaveLength(0);

      // Should be in queue
      expect(activityLogger.getQueueSize()).toBe(1);

      // Flush the queue
      await activityLogger.flush();

      // Now should be in database
      activities = await testPrisma.activity.findMany();
      expect(activities).toHaveLength(1);
    });

    it('should batch multiple drag events within time window', async () => {
      const { user, board, card } = await createTestBoard();

      // Simulate rapid position changes
      for (let i = 0; i < 5; i++) {
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

      expect(activityLogger.getQueueSize()).toBe(5);

      // Wait for batch processing (100ms window)
      await new Promise(resolve => setTimeout(resolve, 150));

      const activities = await testPrisma.activity.findMany();
      expect(activities).toHaveLength(5);
    });

    it('should handle logging failures gracefully', async () => {
      const { user, board } = await createTestBoard();

      // Mock the prisma.activity.create to fail
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const createSpy = jest.spyOn(testPrisma.activity, 'create')
        .mockRejectedValue(new Error('Database error'));

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
      createSpy.mockRestore();
      consoleSpy.mockRestore();

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

      const activities = await testPrisma.activity.findMany();
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

      const activities = await testPrisma.activity.findMany();
      // Should be rate limited to fewer than 20 activities
      expect(activities.length).toBeLessThan(20);
      expect(activities.length).toBeGreaterThan(0);
    });

    it('should not rate limit different types of activities', async () => {
      const { user, board, card } = await createTestBoard();

      // Mix different activity types
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
        entityId: card.id,
        action: 'UPDATE',
        boardId: board.id,
        userId: user.id,
        meta: { title: 'New Title' },
        priority: 'HIGH'
      });

      await activityLogger.logActivity({
        entityType: 'CARD',
        entityId: card.id,
        action: 'ASSIGN',
        boardId: board.id,
        userId: user.id,
        meta: { assigneeId: user.id },
        priority: 'HIGH'
      });

      await activityLogger.flush();

      const activities = await testPrisma.activity.findMany();
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

      const activities = await testPrisma.activity.findMany();
      expect(activities.length).toBeGreaterThan(0);
      expect(activities.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed database operations', async () => {
      const { user, board, card } = await createTestBoard();

      // Create a spy to simulate temporary database failure
      const createSpy = jest.spyOn(testPrisma.activity, 'create')
        .mockRejectedValueOnce(new Error('Database connection failed'))
        .mockResolvedValueOnce({
          id: 'test-id',
          createdAt: new Date(),
          entityType: 'CARD',
          entityId: card.id,
          action: 'CREATE',
          boardId: board.id,
          columnId: card.columnId,
          userId: user.id,
          meta: {}
        } as any);

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
      createSpy.mockRestore();
    });

    it('should handle permanent failures after max retries', async () => {
      const { user, board, card } = await createTestBoard();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock permanent failure
      const createSpy = jest.spyOn(testPrisma.activity, 'create')
        .mockRejectedValue(new Error('Permanent database failure'));

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

      createSpy.mockRestore();
      consoleSpy.mockRestore();
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

      const activities = await testPrisma.activity.findMany();
      expect(activities).toHaveLength(1);
      expect(activities[0].action).toBe('CREATE');
    });

    it('should handle batch processing within 2 seconds', async () => {
      const { user, board, card } = await createTestBoard();
      const startTime = Date.now();

      // Queue 10 low-priority activities
      for (let i = 0; i < 10; i++) {
        await activityLogger.logActivity({
          entityType: 'CARD',
          entityId: card.id,
          action: 'REORDER',
          boardId: board.id,
          userId: user.id,
          meta: { position: i },
          priority: 'LOW'
        });
      }

      await activityLogger.flush();
      const duration = Date.now() - startTime;

      // Should complete batch within 2 seconds (reasonable for test environment)
      expect(duration).toBeLessThan(2000);

      const activities = await testPrisma.activity.findMany();
      expect(activities).toHaveLength(10);
      expect(activities[0].action).toBe('REORDER');
    });
  });
});