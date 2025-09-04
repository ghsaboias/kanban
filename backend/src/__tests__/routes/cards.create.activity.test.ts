import { randomUUID } from 'crypto';
import request from 'supertest';
import '../setup'; // Import setup to register global hooks
import { testPrisma } from '../setup';
import { createTestApp } from '../testApp';
import { beforeEach, describe, expect, it } from 'bun:test';

// Create test app instance
const app = createTestApp();

describe('Cards Routes - Create Activity Logging', () => {
    let testUser: { id: string; email: string; name: string; clerkId: string | null; };
    let testBoard: { id: string; title: string; description?: string | null; };
    let testColumn: { id: string; title: string; position: number; boardId: string; };
    let testAssignee: { id: string; email: string; name: string; clerkId: string | null; };

    beforeEach(async () => {
        // Create fresh test data for each test
        const uniqueId = randomUUID();
        const userUniqueId = randomUUID();
        const assigneeUniqueId = randomUUID();

        // Create test user for authentication
        testUser = await testPrisma.user.create({
            data: {
                id: `test-user-${userUniqueId}`,
                email: `test-${uniqueId}@example.com`,
                name: 'Test User',
                clerkId: `test-clerk-${uniqueId}`
            }
        });

        // Create test assignee
        testAssignee = await testPrisma.user.create({
            data: {
                id: `assignee-user-${assigneeUniqueId}`,
                email: `assignee-${uniqueId}@example.com`,
                name: 'Assignee User',
                clerkId: `assignee-clerk-${uniqueId}`
            }
        });

        // Create test board and column
        testBoard = await testPrisma.board.create({
            data: {
                title: 'Test Board',
                description: 'Test board for cards'
            }
        });

        testColumn = await testPrisma.column.create({
            data: {
                title: 'Test Column',
                position: 0,
                boardId: testBoard.id
            }
        });
    });

    describe('POST /api/columns/:columnId/cards', () => {
        it('should log card creation activity with all fields', async () => {
            const cardData = {
                title: 'New Card',
                description: '<p>Card description with <strong>formatting</strong></p>',
                priority: 'HIGH',
                assigneeId: testAssignee.id,
                position: 0
            };

            const response = await request(app)
                .post(`/api/columns/${testColumn.id}/cards`)
                .set('x-test-user', JSON.stringify(testUser))
                .send(cardData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(cardData.title);

            // Check that activity was logged
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: response.body.data.id,
                    action: 'CREATE'
                }
            });

            expect(activities).toHaveLength(1);
            expect(activities[0].userId).toBe(testUser.id);
            expect(activities[0].boardId).toBe(testBoard.id);
            expect(JSON.parse(activities[0].meta)).toEqual({
                title: cardData.title,
                description: cardData.description,
                priority: cardData.priority,
                assigneeId: testAssignee.id,
                assigneeName: testAssignee.name,
                columnId: testColumn.id,
                columnTitle: testColumn.title,
                position: 0
            });
        });

        it('should log card creation activity with minimal fields', async () => {
            const cardData = {
                title: 'Minimal Card'
            };

            const response = await request(app)
                .post(`/api/columns/${testColumn.id}/cards`)
                .set('x-test-user', JSON.stringify(testUser))
                .send(cardData)
                .expect(201);

            // Check that activity was logged with default values
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: response.body.data.id,
                    action: 'CREATE'
                }
            });

            expect(activities).toHaveLength(1);
            expect(JSON.parse(activities[0].meta)).toEqual({
                title: cardData.title,
                description: null,
                priority: 'MEDIUM',
                assigneeId: null,
                assigneeName: null,
                columnId: testColumn.id,
                columnTitle: testColumn.title,
                position: 0
            });
        });

        it('should log card creation with correct priority (HIGH)', async () => {
            const cardData = {
                title: 'High Priority Card',
                priority: 'HIGH'
            };

            const response = await request(app)
                .post(`/api/columns/${testColumn.id}/cards`)
                .set('x-test-user', JSON.stringify(testUser))
                .send(cardData)
                .expect(201);

            // Check that activity was logged immediately (HIGH priority) for this specific card
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: response.body.data.id,
                    action: 'CREATE'
                }
            });

            expect(activities).toHaveLength(1);
            expect(activities[0].createdAt).toBeInstanceOf(Date);
            // Should be logged immediately, so createdAt should be very recent
            const timeDiff = Date.now() - activities[0].createdAt.getTime();
            expect(timeDiff).toBeLessThan(1000); // Less than 1 second ago
        });

        it('should not log activity when card creation fails', async () => {
            const invalidCardData = {
                // Missing required title
                description: 'Invalid card'
            };

            // Get count of activities before the failed operation
            const activitiesBefore = await testPrisma.activity.count({
                where: {
                    entityType: 'CARD',
                    action: 'CREATE'
                }
            });

            await request(app)
                .post(`/api/columns/${testColumn.id}/cards`)
                .set('x-test-user', JSON.stringify(testUser))
                .send(invalidCardData)
                .expect(400);

            // Should not have logged any NEW activity for failed creation
            const activitiesAfter = await testPrisma.activity.count({
                where: {
                    entityType: 'CARD',
                    action: 'CREATE'
                }
            });

            expect(activitiesAfter).toBe(activitiesBefore);
        });
    });
});
