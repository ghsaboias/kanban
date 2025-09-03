import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import app from '../../app';
import { testPrisma } from '../setup';
import { setupGlobalMocks, setupTestData } from './cards.activity.setup';

// Restore real ActivityLogger for activity logging tests
jest.unmock('../../services/activityLogger');

// Mock authentication middleware
jest.mock('../../auth/clerk', () => ({
    withAuth: (req: Request, res: Response, next: NextFunction) => next(),
    requireAuthMw: (req: Request, res: Response, next: NextFunction) => next(),
    ensureUser: (req: Request, res: Response, next: NextFunction) => {
        res.locals.user = {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            clerkId: 'test-clerk-id',
        }
        next()
    },
}));

describe('Cards Routes - Create Activity Logging', () => {
    let testUser: { id: string; email: string; name: string; clerkId: string | null; };
    let testBoard: { id: string; title: string; description?: string | null; };
    let testColumn: { id: string; title: string; position: number; boardId: string; };
    let testAssignee: { id: string; email: string; name: string; clerkId: string | null; };

    beforeAll(() => {
        setupGlobalMocks();
    });

    beforeEach(async () => {
        const data = await setupTestData();
        testUser = data.testUser;
        testAssignee = data.testAssignee;
        testBoard = data.testBoard;
        testColumn = data.testColumn;
    });

    afterEach(async () => {
        // Wait for any pending activity logging to complete before cleanup
        await new Promise(resolve => setTimeout(resolve, 300));
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

            await request(app)
                .post(`/api/columns/${testColumn.id}/cards`)
                .send(cardData)
                .expect(201);

            // Check that activity was logged immediately (HIGH priority)
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
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

            await request(app)
                .post(`/api/columns/${testColumn.id}/cards`)
                .send(invalidCardData)
                .expect(400);

            // Should not have logged any activity for failed creation
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    action: 'CREATE'
                }
            });

            expect(activities).toHaveLength(0);
        });
    });
});
