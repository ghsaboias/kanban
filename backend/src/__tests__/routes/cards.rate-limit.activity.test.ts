import request from 'supertest';
import { testPrisma } from '../setup';
import { createTestApp } from '../testApp';
import { setupGlobalMocks, setupTestData } from './cards.activity.setup';
import { __flushActivityLoggerForTests as flushActivityLogger } from '../../services/activityLoggerSingleton';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

// Restore real ActivityLogger for activity logging tests

// Mock authentication middleware
// Note: Mocking is handled by the test app factory

// Create test app instance
const app = createTestApp();

describe('Cards Routes - Rate Limiting Activity Logging', () => {
    let testUser: { id: string; email: string; name: string; clerkId: string | null; };
    let testColumn: { id: string; title: string; position: number; boardId: string; };

    beforeAll(() => {
        setupGlobalMocks();
    });

    beforeEach(async () => {
        const data = await setupTestData();
        testUser = data.testUser;
        testColumn = data.testColumn;
    });

    afterEach(async () => {
        await flushActivityLogger();
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

            // Multiple rapid reorder operations with timeout protection
            const promises: Promise<unknown>[] = [];
            for (let i = 1; i <= 5; i++) {
                promises.push(
                    request(app)
                        .put(`/api/cards/${card.id}`)
                        .send({ position: i })
                        .timeout(3000) // 3 second timeout per request
                );
            }

            // Execute all requests with overall timeout protection
            const results = await Promise.allSettled(promises);
            
            // Check if any requests failed
            const failedRequests = results.filter(result => result.status === 'rejected');
            if (failedRequests.length > 0) {
                console.warn('Some requests failed:', failedRequests);
            }

            // Flush LOW priority batch processing deterministically
            await flushActivityLogger();

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
            
            // Verify at least one activity was created successfully
            if (activities.length > 0) {
                const firstActivity = activities[0];
                expect(firstActivity.entityType).toBe('CARD');
                expect(firstActivity.entityId).toBe(card.id);
                expect(firstActivity.action).toBe('REORDER');
            }
        });
    });
});
