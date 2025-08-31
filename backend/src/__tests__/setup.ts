import { config } from 'dotenv';
import { PrismaClient } from '../../../generated/prisma';

// Load environment variables (root .env for development vars, .env.test for test overrides)
config({ path: '../.env' });
config({ path: '.env.test', override: true });

// Create a test Prisma client instance
export const testPrisma = new PrismaClient();

beforeAll(async () => {
  await testPrisma.$connect();
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
});