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
