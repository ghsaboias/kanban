import { PrismaClient } from '../../../../generated/prisma';
import { execSync } from 'child_process';
import path from 'path';

// Create a separate test database instance
const testDbPath = path.join(__dirname, '../../../prisma/test.db');

// Test-specific Prisma client
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${testDbPath}`
    }
  }
});

export async function setupActivityTestDb() {
  // Reset test database
  try {
    execSync(`rm -f ${testDbPath}`);
  } catch (error) {
    console.debug('Failed to remove test database file:', error);
  }
  
  // Push schema to test database
  const originalDbUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${testDbPath}`;
  execSync('npx prisma db push --force-reset --schema=../../../prisma/schema.prisma', { 
    cwd: path.join(__dirname, '../../../'),
    stdio: 'inherit'
  });
  
  // Restore original DATABASE_URL
  process.env.DATABASE_URL = originalDbUrl;
  
  return testPrisma;
}

export async function cleanupActivityTestDb() {
  await testPrisma.$disconnect();
  try {
    execSync(`rm -f ${testDbPath}`);
  } catch (error) {
    console.debug('Failed to remove test database file:', error);
  }
}

// Helper function to create test data
export async function createTestBoard(prisma: PrismaClient) {
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      clerkId: 'test-clerk-id'
    }
  });

  const board = await prisma.board.create({
    data: {
      title: 'Test Board',
      description: 'Test board for activity logging'
    }
  });

  const column = await prisma.column.create({
    data: {
      title: 'Test Column',
      position: 0,
      boardId: board.id
    }
  });

  const card = await prisma.card.create({
    data: {
      title: 'Test Card',
      description: 'Test card description',
      priority: 'MEDIUM',
      position: 0,
      columnId: column.id,
      createdById: user.id
    }
  });

  return { user, board, column, card };
}