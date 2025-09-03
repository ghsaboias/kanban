import type { NextFunction, Request, Response } from 'express';
import { testPrisma } from '../setup';

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

export const setupTestData = async () => {
    // Create test user for authentication
    const testUser = await testPrisma.user.create({
        data: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            clerkId: 'test-clerk-id'
        }
    });

    // Create test assignee
    const testAssignee = await testPrisma.user.create({
        data: {
            id: 'assignee-user-id',
            email: 'assignee@example.com',
            name: 'Assignee User',
            clerkId: 'assignee-clerk-id'
        }
    });

    // Create test board and column
    const testBoard = await testPrisma.board.create({
        data: {
            title: 'Test Board',
            description: 'Test board for cards'
        }
    });

    const testColumn = await testPrisma.column.create({
        data: {
            title: 'Test Column',
            position: 0,
            boardId: testBoard.id
        }
    });

    return { testUser, testAssignee, testBoard, testColumn };
};

export const setupGlobalMocks = () => {
    const fakeBroadcaster: { emit: jest.Mock; except: jest.Mock } = {
        emit: jest.fn(),
        except: jest.fn(() => fakeBroadcaster)
    };
    (global as unknown as { io: { to: jest.Mock } }).io = { to: jest.fn(() => fakeBroadcaster) };
};
