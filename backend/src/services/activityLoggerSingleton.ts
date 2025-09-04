import { prisma } from '../database';
import { ActivityLogger } from './activityLogger';

// Shared ActivityLogger instance used by route handlers
export const activityLogger = new ActivityLogger(prisma);

// Test-only helper to flush batched logs deterministically
export const __flushActivityLoggerForTests = async () => {
  await activityLogger.flush();
};

