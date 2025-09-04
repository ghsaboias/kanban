import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { testPrisma } from '../setup';
import { mock } from 'bun:test';

// Mock authentication middleware - will be updated with actual user data in setupGlobalMocks
const mockUser = {
    id: 'placeholder-id',
    name: 'Test User',
    email: 'test@example.com',
    clerkId: 'placeholder-clerk-id',
};

mock.module('../../auth/clerk', () => ({
    withAuth: (req: Request, res: Response, next: NextFunction) => next(),
    requireAuthMw: (req: Request, res: Response, next: NextFunction) => next(),
    ensureUser: (req: Request, res: Response, next: NextFunction) => {
        res.locals.user = mockUser;
        next()
    },
}));

export const setupTestData = async () => {
    const uniqueId1 = randomUUID();
    const uniqueId2 = randomUUID();
    const userUniqueId = randomUUID();

    // Create test user for authentication
    const testUser = await testPrisma.user.create({
        data: {
            id: `test-user-${userUniqueId}`,
            email: `test-${uniqueId1}@example.com`,
            name: 'Test User',
            clerkId: `test-clerk-${uniqueId1}`
        }
    });

    // Create test assignee
    const assigneeUniqueId = randomUUID();
    const testAssignee = await testPrisma.user.create({
        data: {
            id: `assignee-user-${assigneeUniqueId}`,
            email: `assignee-${uniqueId2}@example.com`,
            name: 'Assignee User',
            clerkId: `assignee-clerk-${uniqueId2}`
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

    // Update mockUser with the actual created user data
    mockUser.id = testUser.id;
    mockUser.email = testUser.email;
    mockUser.name = testUser.name;
    mockUser.clerkId = testUser.clerkId || 'placeholder-clerk-id';

    return { testUser, testAssignee, testBoard, testColumn };
};

export const setupGlobalMocks = () => {
    const fakeBroadcaster: { emit: ReturnType<typeof mock>; except: ReturnType<typeof mock> } = {
        emit: mock(),
        except: mock(() => fakeBroadcaster)
    };
    (global as unknown as { io: { to: ReturnType<typeof mock> } }).io = { to: mock(() => fakeBroadcaster) };
};
