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

describe('Cards Routes - Delete Activity Logging', () => {
    let testUser: { id: string; email: string; name: string; clerkId: string | null; };
    let testBoard: { id: string; title: string; description?: string | null; };
    let testColumn: { id: string; title: string; position: number; boardId: string; };
    let testAssignee: { id: string; email: string; name: string; clerkId: string | null; };
    let testCard: { id: string; title: string; description?: string | null; priority: string; position: number; columnId: string; createdById: string; assigneeId?: string | null; };

    beforeAll(() => {
        setupGlobalMocks();
    });

    beforeEach(async () => {
        const data = await setupTestData();
        testUser = data.testUser;
        testAssignee = data.testAssignee;
        testBoard = data.testBoard;
        testColumn = data.testColumn;

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

    afterEach(async () => {
        // Wait for any pending activity logging to complete before cleanup
        await new Promise(resolve => setTimeout(resolve, 300));
    });

    describe('DELETE /api/cards/:id', () => {
        it('should log card deletion activity', async () => {
            await request(app)
                .delete(`/api/cards/${testCard.id}`)
                .set('x-test-user', JSON.stringify(testUser))
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
            expect(JSON.parse(activities[0].meta)).toEqual({
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

            // Get count of activities before the failed operation
            const activitiesBefore = await testPrisma.activity.count({
                where: {
                    entityType: 'CARD',
                    action: 'DELETE'
                }
            });

            await request(app)
                .delete(`/api/cards/${nonExistentId}`)
                .set('x-test-user', JSON.stringify(testUser))
                .expect(404);

            // Should not have logged any NEW activity for failed deletion
            const activitiesAfter = await testPrisma.activity.count({
                where: {
                    entityType: 'CARD',
                    action: 'DELETE'
                }
            });

            expect(activitiesAfter).toBe(activitiesBefore);
        });
    });
});
