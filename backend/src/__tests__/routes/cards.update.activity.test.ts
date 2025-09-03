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

describe('Cards Routes - Update Activity Logging', () => {
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
                title: 'Original Card',
                description: '<p>Original description</p>',
                priority: 'MEDIUM',
                position: 0,
                columnId: testColumn.id,
                createdById: testUser.id
            }
        });
    });

    afterEach(async () => {
        // Wait for any pending activity logging to complete before cleanup
        await new Promise(resolve => setTimeout(resolve, 300));
    });

    describe('PUT /api/cards/:id', () => {
        it('should log card update activity with field changes', async () => {
            const updateData = {
                title: 'Updated Card',
                description: '<p>Updated description with <em>formatting</em></p>',
                priority: 'HIGH',
                assigneeId: testAssignee.id
            };

            const response = await request(app)
                .put(`/api/cards/${testCard.id}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Check that activity was logged
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: testCard.id,
                    action: 'UPDATE'
                }
            });

            expect(activities).toHaveLength(1);
            expect(activities[0].userId).toBe(testUser.id);
            expect(activities[0].boardId).toBe(testBoard.id);
            expect(JSON.parse(activities[0].meta)).toEqual({
                changes: ['title', 'description', 'priority', 'assigneeId'],
                oldValues: {
                    title: 'Original Card',
                    description: '<p>Original description</p>',
                    priority: 'MEDIUM',
                    assigneeId: null
                },
                newValues: {
                    title: 'Updated Card',
                    description: '<p>Updated description with <em>formatting</em></p>',
                    priority: 'HIGH',
                    assigneeId: testAssignee.id
                },
                assigneeName: testAssignee.name
            });
        });

        it('should log card update with only changed fields', async () => {
            const updateData = {
                title: 'New Title Only'
                // Other fields not changed
            };

            await request(app)
                .put(`/api/cards/${testCard.id}`)
                .send(updateData)
                .expect(200);

            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: testCard.id,
                    action: 'UPDATE'
                }
            });

            expect(activities).toHaveLength(1);
            expect(JSON.parse(activities[0].meta)).toEqual({
                changes: ['title'],
                oldValues: {
                    title: 'Original Card'
                },
                newValues: {
                    title: 'New Title Only'
                }
            });
        });

        it('should log card position update as REORDER action', async () => {
            const updateData = {
                position: 1
            };

            await request(app)
                .put(`/api/cards/${testCard.id}`)
                .send(updateData)
                .expect(200);

            // Wait for batched activities to be processed
            await new Promise(resolve => setTimeout(resolve, 200));

            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: testCard.id,
                    action: 'REORDER'
                }
            });

            expect(activities).toHaveLength(1);
            expect(JSON.parse(activities[0].meta)).toEqual({
                oldPosition: 0,
                newPosition: 1,
                columnId: testColumn.id,
                columnTitle: testColumn.title
            });
        });

        it('should log assignee changes with names', async () => {
            // First assign to someone
            await request(app)
                .put(`/api/cards/${testCard.id}`)
                .send({ assigneeId: testAssignee.id })
                .expect(200);

            // Then unassign (set to null)
            await request(app)
                .put(`/api/cards/${testCard.id}`)
                .send({ assigneeId: null })
                .expect(200);

            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: testCard.id,
                    action: 'UPDATE'
                },
                orderBy: { createdAt: 'asc' }
            });

            expect(activities).toHaveLength(2);

            // First assignment
            expect(JSON.parse(activities[0].meta)).toEqual({
                changes: ['assigneeId'],
                oldValues: { assigneeId: null },
                newValues: { assigneeId: testAssignee.id },
                assigneeName: testAssignee.name
            });

            // Unassignment
            expect(JSON.parse(activities[1].meta)).toEqual({
                changes: ['assigneeId'],
                oldValues: { assigneeId: testAssignee.id },
                newValues: { assigneeId: null }
            });
        });

        it('should not log activity when no fields are actually changed', async () => {
            const updateData = {
                title: 'Original Card',
                description: '<p>Original description</p>',
                priority: 'MEDIUM'
            };

            await request(app)
                .put(`/api/cards/${testCard.id}`)
                .send(updateData)
                .expect(200);

            // Should not log any activity when nothing actually changed
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    entityId: testCard.id,
                    action: 'UPDATE'
                }
            });

            expect(activities).toHaveLength(0);
        });

        it('should not log activity when card update fails', async () => {
            const nonExistentId = 'non-existent-card-id';

            await request(app)
                .put(`/api/cards/${nonExistentId}`)
                .send({ title: 'Updated Title' })
                .expect(404);

            // Should not have logged any activity for failed update
            const activities = await testPrisma.activity.findMany({
                where: {
                    entityType: 'CARD',
                    action: 'UPDATE'
                }
            });

            expect(activities).toHaveLength(0);
        });
    });
});
