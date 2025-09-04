import { randomUUID } from 'crypto';
import { testPrisma } from '../setup';
import { mock } from 'bun:test';

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

    // Test routes use a test app with a mock auth middleware that
    // reads the user from the 'x-test-user' header, so no module
    // mocking of auth is needed here.

    return { testUser, testAssignee, testBoard, testColumn };
};

export const setupGlobalMocks = () => {
    const fakeBroadcaster: { emit: ReturnType<typeof mock>; except: ReturnType<typeof mock> } = {
        emit: mock(),
        except: mock(() => fakeBroadcaster)
    };
    (global as unknown as { io: { to: ReturnType<typeof mock> } }).io = { to: mock(() => fakeBroadcaster) };
};
