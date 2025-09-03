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

            await request(app)
                .delete(`/api/cards/${nonExistentId}`)
                .expect(404);

            // Should not have logged any activity for failed deletion
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    action: 'DELETE'
                }
            });

            expect(activities).toHaveLength(0);
        });
    });
});
