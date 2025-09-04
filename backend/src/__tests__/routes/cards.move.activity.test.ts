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

describe('Cards Routes - Move Activity Logging', () => {
    let testUser: { id: string; email: string; name: string; clerkId: string | null; };
    let testBoard: { id: string; title: string; description?: string | null; };
    let testColumn: { id: string; title: string; position: number; boardId: string; };
    let testAssignee: { id: string; email: string; name: string; clerkId: string | null; };
    let testCard: { id: string; title: string; description?: string | null; priority: string; position: number; columnId: string; createdById: string; assigneeId?: string | null; };
    let targetColumn: { id: string; title: string; position: number; boardId: string; };

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
                title: 'Card to Move',
                description: '<p>Moveable card</p>',
                priority: 'MEDIUM',
                position: 0,
                columnId: testColumn.id,
                createdById: testUser.id,
                assigneeId: testAssignee.id
            }
        });

        targetColumn = await testPrisma.column.create({
            data: {
                title: 'Target Column',
                position: 1,
                boardId: testBoard.id
            }
        });
    });

    afterEach(async () => {
        await flushActivityLogger();
    });

    describe('POST /api/cards/:id/move', () => {
        it('should log card move activity between columns', async () => {
            const moveData = {
                columnId: targetColumn.id,
                position: 0
            };

            const response = await request(app)
                .post(`/api/cards/${testCard.id}/move`)
                .set('x-test-user', JSON.stringify(testUser))
                .send(moveData)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Check that activity was logged
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: testCard.id,
                    action: 'MOVE'
                }
            });

            expect(activities).toHaveLength(1);
            expect(activities[0].userId).toBe(testUser.id);
            expect(activities[0].boardId).toBe(testBoard.id);
            expect(JSON.parse(activities[0].meta)).toEqual({
                title: testCard.title,
                fromColumnId: testColumn.id,
                fromColumnTitle: testColumn.title,
                toColumnId: targetColumn.id,
                toColumnTitle: targetColumn.title,
                oldPosition: 0,
                newPosition: 0,
                assigneeId: testAssignee.id,
                assigneeName: testAssignee.name
            });
        });

        it('should log card reorder activity within same column', async () => {
            // Create another card in the same column to have something to reorder with
            const _secondCard = await testPrisma.card.create({
                data: {
                    title: 'Second Card',
                    position: 1,
                    columnId: testColumn.id,
                    createdById: testUser.id
                }
            });

            const moveData = {
                columnId: testColumn.id, // Same column
                position: 1
            };

            await request(app)
                .post(`/api/cards/${testCard.id}/move`)
                .set('x-test-user', JSON.stringify(testUser))
                .send(moveData)
                .expect(200);

            // Flush batched activities deterministically
            await flushActivityLogger();

            // Check that activity was logged as REORDER since it's within same column
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: testCard.id,
                    action: 'REORDER'
                }
            });

            expect(activities).toHaveLength(1);
            expect(JSON.parse(activities[0].meta)).toEqual({
                title: testCard.title,
                columnId: testColumn.id,
                columnTitle: testColumn.title,
                oldPosition: 0,
                newPosition: 1,
                assigneeId: testAssignee.id,
                assigneeName: testAssignee.name
            });
        });

        it('should not log activity when card move results in no change', async () => {
            const moveData = {
                columnId: testColumn.id, // Same column
                position: 0 // Same position
            };

            await request(app)
                .post(`/api/cards/${testCard.id}/move`)
                .set('x-test-user', JSON.stringify(testUser))
                .send(moveData)
                .expect(200);

            // Should not log any activity when nothing actually moved
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: testCard.id,
                    OR: [
                        { action: 'MOVE' },
                        { action: 'REORDER' }
                    ]
                }
            });

            expect(activities).toHaveLength(0);
        });

        it('should not log activity when card move fails', async () => {
            const nonExistentId = 'non-existent-card-id';
            const moveData = {
                columnId: targetColumn.id,
                position: 0
            };

            // Get count of activities before the failed operation
            const activitiesBefore = await testPrisma.activity.count({
                where: {
                    entityType: 'CARD',
                    action: 'MOVE'
                }
            });

            await request(app)
                .post(`/api/cards/${nonExistentId}/move`)
                .set('x-test-user', JSON.stringify(testUser))
                .send(moveData)
                .expect(404);

            // Should not have logged any NEW activity for failed move
            const activitiesAfter = await testPrisma.activity.count({
                where: {
                    entityType: 'CARD',
                    action: 'MOVE'
                }
            });

            expect(activitiesAfter).toBe(activitiesBefore);
        });
    });
});
