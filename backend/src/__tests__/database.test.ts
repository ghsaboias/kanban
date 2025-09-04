import { testPrisma } from './setup';
import { describe, expect, it } from 'bun:test';

describe('Database Connection', () => {
  it('should connect to the database successfully', async () => {
    await expect(testPrisma.$connect()).resolves.toBeUndefined();
  });

  it('should perform basic CRUD operations', async () => {
    const timestamp = Date.now();
    // Create a test user
    const user = await testPrisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${timestamp}@example.com`,
        clerkId: `test-clerk-id-${timestamp}`,
      },
    });

    expect(user).toHaveProperty('id');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe(`test-${timestamp}@example.com`);

    // Read the user
    const foundUser = await testPrisma.user.findUnique({
      where: { id: user.id },
    });

    expect(foundUser).not.toBeNull();
    expect(foundUser?.name).toBe('Test User');

    // Update the user
    const updatedUser = await testPrisma.user.update({
      where: { id: user.id },
      data: { name: 'Updated User' },
    });

    expect(updatedUser.name).toBe('Updated User');

    // Delete the user
    await testPrisma.user.delete({
      where: { id: user.id },
    });

    const deletedUser = await testPrisma.user.findUnique({
      where: { id: user.id },
    });

    expect(deletedUser).toBeNull();
  });

  it('should handle relationships correctly', async () => {
    const timestamp = Date.now();
    // Create user
    const user = await testPrisma.user.create({
      data: {
        name: 'Test User',
        email: `test-rel-${timestamp}@example.com`,
        clerkId: `test-clerk-id-rel-${timestamp}`,
      },
    });

    // Create board
    const board = await testPrisma.board.create({
      data: {
        title: 'Test Board',
        description: 'Test Description',
      },
    });

    // Create column
    const column = await testPrisma.column.create({
      data: {
        title: 'Test Column',
        position: 0,
        boardId: board.id,
      },
    });

    // Create card with relationships
    const card = await testPrisma.card.create({
      data: {
        title: 'Test Card',
        description: 'Test Card Description',
        priority: 'HIGH',
        position: 0,
        columnId: column.id,
        assigneeId: user.id,
        createdById: user.id,
      },
    });

    // Verify relationships
    const cardWithRelations = await testPrisma.card.findUnique({
      where: { id: card.id },
      include: {
        assignee: true,
        createdBy: true,
        column: {
          include: {
            board: true,
          },
        },
      },
    });

    expect(cardWithRelations).not.toBeNull();
    expect(cardWithRelations?.assignee?.id).toBe(user.id);
    expect(cardWithRelations?.createdBy?.id).toBe(user.id);
    expect(cardWithRelations?.column.id).toBe(column.id);
    expect(cardWithRelations?.column.board.id).toBe(board.id);
  });

  it('should enforce database constraints', async () => {
    const timestamp = Date.now();
    const uniqueEmail = `unique-${timestamp}@example.com`;

    // Test unique email constraint
    await testPrisma.user.create({
      data: {
        name: 'User 1',
        email: uniqueEmail,
        clerkId: `clerk-1-${timestamp}`,
      },
    });

    // Attempting to create another user with same email should fail
    let errorThrown = false;
    try {
      await testPrisma.user.create({
        data: {
          name: 'User 2',
          email: uniqueEmail,
          clerkId: `clerk-2-${timestamp}`,
        },
      });
    } catch (error) {
      errorThrown = true;
      expect(error).toBeDefined();
    }
    expect(errorThrown).toBe(true);
  });

  it('should handle cascade deletes', async () => {
    const timestamp = Date.now();
    // Create board with columns and cards
    const board = await testPrisma.board.create({
      data: {
        title: 'Test Board',
        columns: {
          create: {
            title: 'Test Column',
            position: 0,
            cards: {
              create: {
                title: 'Test Card',
                position: 0,
                priority: 'MEDIUM',
                createdBy: {
                  create: {
                    name: 'Creator',
                    email: `creator-${timestamp}@example.com`,
                    clerkId: `creator-clerk-${timestamp}`,
                  },
                },
              },
            },
          },
        },
      },
      include: {
        columns: {
          include: {
            cards: true,
          },
        },
      },
    });

    expect(board.columns).toHaveLength(1);
    expect(board.columns[0].cards).toHaveLength(1);

    // Delete board should cascade to columns and cards
    await testPrisma.board.delete({
      where: { id: board.id },
    });

    const remainingColumns = await testPrisma.column.findMany({
      where: { boardId: board.id },
    });

    const remainingCards = await testPrisma.card.findMany({
      where: { columnId: board.columns[0].id },
    });

    expect(remainingColumns).toHaveLength(0);
    expect(remainingCards).toHaveLength(0);
  });
});
