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
        // Wait for any pending activity logging to complete before cleanup
        await new Promise(resolve => setTimeout(resolve, 300));
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

            // Multiple rapid reorder operations
            const promises: Promise<unknown>[] = [];
            for (let i = 1; i <= 5; i++) {
                promises.push(
                    request(app)
                        .put(`/api/cards/${card.id}`)
                        .send({ position: i })
                );
            }

            await Promise.all(promises);

            // Wait for LOW priority activity batch processing to complete
            await new Promise(resolve => setTimeout(resolve, 200));

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
        });
    });
});
