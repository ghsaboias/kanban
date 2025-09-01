import { PrismaClient, Activity, User } from '../../../generated/prisma';

export interface ActivityLogRequest {
  entityType: 'BOARD' | 'COLUMN' | 'CARD';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'REORDER' | 'ASSIGN' | 'UNASSIGN';
  boardId: string;
  columnId?: string;
  userId?: string;
  meta: Record<string, unknown>;
  priority?: 'HIGH' | 'LOW';
  broadcastRealtime?: boolean;
  initiatorSocketId?: string;
}

type ActivityWithUser = Activity & {
  user: User | null;
};

interface ActivityLoggerOptions {
  batchSize?: number;
  batchIntervalMs?: number;
  maxQueueSize?: number;
  maxRetries?: number;
}

interface QueuedActivity extends ActivityLogRequest {
  timestamp: number;
  retryCount: number;
}

export class ActivityLogger {
  private queue: QueuedActivity[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private options: Required<ActivityLoggerOptions>;

  // Rate limiting for high-frequency events
  private rateLimitMap = new Map<string, number>();
  private readonly RATE_LIMIT_WINDOW = 1000; // 1 second
  private readonly RATE_LIMIT_MAX = 10; // Max 10 REORDER activities per second per entity

  constructor(
    private prisma: PrismaClient,
    options: ActivityLoggerOptions = {}
  ) {
    this.options = {
      batchSize: 10,
      batchIntervalMs: 100,
      maxQueueSize: 1000,
      maxRetries: 2,
      ...options
    };
  }

  async logActivity(request: ActivityLogRequest): Promise<void> {
    try {
      // Rate limiting for high-frequency events
      if (this.shouldRateLimit(request)) {
        return;
      }

      // High priority activities are logged immediately
      if (request.priority === 'HIGH') {
        await this.processActivity(request);
      } else {
        // Low priority activities are queued for batch processing
        await this.queueActivity(request);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  private shouldRateLimit(request: ActivityLogRequest): boolean {
    if (request.action !== 'REORDER') {
      return false;
    }

    const key = `${request.entityId}:${request.action}`;
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;

    // Clean up old entries
    for (const [k, timestamp] of this.rateLimitMap.entries()) {
      if (timestamp < windowStart) {
        this.rateLimitMap.delete(k);
      }
    }

    const recentCount = Array.from(this.rateLimitMap.entries())
      .filter(([k]) => k.startsWith(`${request.entityId}:`))
      .length;

    if (recentCount >= this.RATE_LIMIT_MAX) {
      return true;
    }

    this.rateLimitMap.set(`${key}:${now}`, now);
    return false;
  }

  private async queueActivity(request: ActivityLogRequest): Promise<void> {
    const queuedActivity: QueuedActivity = {
      ...request,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(queuedActivity);

    // If queue is getting full, process immediately
    if (this.queue.length >= this.options.maxQueueSize) {
      await this.flush();
    } else if (!this.batchTimer) {
      // Start batch timer
      this.batchTimer = setTimeout(() => {
        this.processBatch().catch(error =>
          console.error('Batch processing error:', error)
        );
      }, this.options.batchIntervalMs);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.batchTimer = null;

    try {
      const batch = this.queue.splice(0, this.options.batchSize);
      const failed: QueuedActivity[] = [];

      for (const activity of batch) {
        try {
          await this.processActivity(activity);
        } catch (error) {
          console.error(`Failed to process activity ${activity.entityId}:`, error);

          if (activity.retryCount < this.options.maxRetries) {
            failed.push({
              ...activity,
              retryCount: activity.retryCount + 1
            });
          } else {
            console.error(
              `Failed to log activity after ${this.options.maxRetries} retries:`,
              activity
            );
          }
        }
      }

      // Re-queue failed activities
      this.queue.unshift(...failed);

      // Continue processing if there are more items
      if (this.queue.length > 0) {
        this.batchTimer = setTimeout(() => {
          this.processBatch().catch(error =>
            console.error('Batch processing error:', error)
          );
        }, this.options.batchIntervalMs);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processActivity(request: ActivityLogRequest): Promise<void> {
    // Retry logic for high priority activities
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        const activity = await this.prisma.activity.create({
          data: {
            entityType: request.entityType,
            entityId: request.entityId,
            action: request.action,
            boardId: request.boardId,
            columnId: request.columnId || null,
            userId: request.userId || null,
            meta: JSON.stringify(request.meta)
          },
          include: {
            user: true
          }
        });

        // Broadcast real-time event if configured and not high-frequency
        if (request.broadcastRealtime && !this.shouldSkipBroadcast(request)) {
          this.broadcastActivity(activity, request);
        }

        return; // Success
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.options.maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to log activity after ${this.options.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private shouldSkipBroadcast(_request: ActivityLogRequest): boolean {
    // Skip broadcasting high-frequency events to avoid spam
    // Note: REORDER actions need to be broadcast for real-time collaboration
    return false; // Temporarily disabled to ensure all actions broadcast
  }

  private broadcastActivity(activity: ActivityWithUser, request: ActivityLogRequest): void {
    // Get the io instance dynamically to avoid initialization order issues
    const io = global.io;
    if (!io || typeof io.to !== 'function') {
      return;
    }

    const room = `board-${request.boardId}`;

    // Always broadcast activity events to all clients, including the initiator,
    // because the activity feed relies on this event to stay in sync.
    const broadcaster = io.to(room);

    const activityData = {
      boardId: request.boardId,
      activity: {
        id: activity.id,
        entityType: activity.entityType,
        entityId: activity.entityId,
        action: activity.action,
        boardId: activity.boardId,
        columnId: activity.columnId,
        userId: activity.userId,
        user: activity.user,
        createdAt: activity.createdAt.toISOString(),
        meta: activity.meta
      }
    };

    broadcaster.emit('activity:created', activityData);
  }

  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    await this.processBatch();
  }

  async stop(): Promise<void> {
    await this.flush();
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

// Type definitions for activity event metadata structures
export interface CardCreateMeta {
  title: string;
  priority: string;
  columnId: string;
  assigneeId?: string;
}

export interface CardUpdateMeta {
  changes: string[];
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export interface CardMoveMeta {
  fromColumnId: string;
  toColumnId: string;
  oldPosition: number;
  newPosition: number;
}

export interface CardAssignMeta {
  assigneeId: string;
  assigneeName: string;
}

export interface ColumnReorderMeta {
  oldPosition: number;
  newPosition: number;
}