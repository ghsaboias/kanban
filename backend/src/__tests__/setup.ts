import { execSync } from 'child_process';
import { config } from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { PrismaClient } from '../../../generated/prisma';

// Bun test globals - these are available at runtime
declare const beforeAll: (fn: () => void | Promise<void>) => void;
declare const afterAll: (fn: () => void | Promise<void>) => void;
declare const beforeEach: (fn: () => void | Promise<void>) => void;

// Load environment variables (root .env for development vars, .env.test for test overrides)
config({ path: '../.env' });
config({ path: '.env.test', override: true });

// Get the worker-specific database URL
const workerId = process.env.BUN_TEST_WORKER_ID || process.pid?.toString() || '1';
// Resolve repository root from this file location and keep DBs under repo/prisma
const repoRoot = path.resolve(__dirname, '../../../');
const testDbDir = path.join(repoRoot, 'prisma', 'test-dbs');
const testDbPath = path.join(testDbDir, `test-${workerId}.db`);

// Set the database URL for this worker
process.env.DATABASE_URL = `file:${testDbPath}`;

// Create a test Prisma client instance that uses the worker-specific test database
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
});

beforeAll(async () => {
  // Initialize the database with schema for this worker (only once)
  try {
    console.log(`🔧 Ensuring schema for worker ${workerId}: ${testDbPath}`);

    // Only create schema if DB file doesn't exist yet
    if (!existsSync(testDbPath)) {
      // Ensure the directory for the test database exists
      if (!existsSync(testDbDir)) {
        mkdirSync(testDbDir, { recursive: true });
      }
      const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
      execSync(
        `DATABASE_URL="file:${testDbPath}" bunx prisma db push --skip-generate --schema ${schemaPath}`,
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
  // Delete in correct order to respect foreign keys with retry logic
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`🧹 Cleaning database for test (attempt ${retries + 1})`);

      // Use transactions for better cleanup reliability
      await testPrisma.$transaction(async (tx) => {
        await tx.activity.deleteMany();
        await tx.card.deleteMany();
        await tx.column.deleteMany();
        await tx.board.deleteMany();
        await tx.user.deleteMany();
      });

      // Verify database is clean
      const counts = await Promise.all([
        testPrisma.user.count(),
        testPrisma.board.count(),
        testPrisma.column.count(),
        testPrisma.card.count(),
        testPrisma.activity.count()
      ]);

      console.log(`📊 After cleanup - Counts: users=${counts[0]}, boards=${counts[1]}, columns=${counts[2]}, cards=${counts[3]}, activities=${counts[4]}`);

      if (counts.some(count => count > 0)) {
        if (retries < maxRetries - 1) {
          retries++;
          console.log(`⚠️  Database not clean, retrying in 200ms...`);
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms before retry
          continue;
        }
        throw new Error(`Database not properly cleaned after ${maxRetries} retries. Counts: users=${counts[0]}, boards=${counts[1]}, columns=${counts[2]}, cards=${counts[3]}, activities=${counts[4]}`);
      }
      console.log(`✅ Database cleaned successfully`);
      break;
    } catch (error) {
      if (retries < maxRetries - 1) {
        retries++;
        console.log(`❌ Cleanup failed, retrying in 200ms...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }
      throw error;
    }
  }
});
