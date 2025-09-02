import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { config } from 'dotenv';
import path from 'path';
import { PrismaClient } from '../../../generated/prisma';

// Load environment variables (root .env for development vars, .env.test for test overrides)
config({ path: '../.env' });
config({ path: '.env.test', override: true });

// Get the worker-specific database URL
const workerId = process.env.JEST_WORKER_ID || '1';
const testDbDir = path.join(process.cwd(), '..', 'prisma', 'test-dbs');
const testDbPath = path.join(testDbDir, `test-${workerId}.db`);

// Set the database URL for this worker
process.env.DATABASE_URL = `file:${testDbPath}`;

// Create a test Prisma client instance that uses the worker-specific test database
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

beforeAll(async () => {
  // Initialize the database with schema for this worker (only once)
  try {
    console.log(`🔧 Ensuring schema for worker ${workerId}: ${testDbPath}`);

    // Only create schema if DB file doesn't exist yet
    if (!existsSync(testDbPath)) {
      execSync(
        `DATABASE_URL="file:${testDbPath}" npx prisma db push --skip-generate --schema ../prisma/schema.prisma`,
        {
          stdio: 'pipe',
          cwd: process.cwd(),
          encoding: 'utf8'
        }
      );
      console.log(`✅ Database schema created for worker ${workerId}`);
    } else {
      console.log(`ℹ️  Reusing existing test DB for worker ${workerId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to initialize database for worker ${workerId}:`, error);
    throw error;
  }

  await testPrisma.$connect();

  // Verify we can connect to the test database and tables exist
  try {
    await testPrisma.$queryRaw`SELECT 1`;
    // Verify tables exist
    const tables = await testPrisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log(`📊 Database tables for worker ${workerId}:`, tables);
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  // Delete in correct order to respect foreign keys
  await testPrisma.activity?.deleteMany();
  await testPrisma.card.deleteMany();
  await testPrisma.column.deleteMany();
  await testPrisma.board.deleteMany();
  await testPrisma.user.deleteMany();

  // Verify database is clean
  const counts = await Promise.all([
    testPrisma.user.count(),
    testPrisma.board.count(),
    testPrisma.column.count(),
    testPrisma.card.count(),
    testPrisma.activity.count()
  ]);

  if (counts.some(count => count > 0)) {
    throw new Error(`Database not properly cleaned. Counts: users=${counts[0]}, boards=${counts[1]}, columns=${counts[2]}, cards=${counts[3]}, activities=${counts[4]}`);
  }
});
