import request from 'supertest';
import { testPrisma } from '../setup';
import { createTestApp } from '../testApp';
import { setupGlobalMocks, setupTestData } from './cards.activity.setup';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

// Restore real ActivityLogger for activity logging tests

// Mock authentication middleware
// Note: Mocking is handled by the test app factory

// Create test app instance
const app = createTestApp();

describe('Cards Routes - Authentication Activity Logging', () => {
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
        // Wait for any pending activity logging to complete before cleanup
        await new Promise(resolve => setTimeout(resolve, 300));
    });

    describe('Authentication', () => {
        it('should associate card activity with authenticated user', async () => {
            const cardData = {
                title: 'Authenticated Card'
            };

            const response = await request(app)
                .post(`/api/columns/${testColumn.id}/cards`)
                .set('x-test-user', JSON.stringify(testUser))
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
});
