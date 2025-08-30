import { config } from 'dotenv';
import { PrismaClient } from '../../../generated/prisma';

// Load test environment variables
config({ path: '.env.test' });

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
  await testPrisma.card.deleteMany();
  await testPrisma.column.deleteMany();
  await testPrisma.board.deleteMany();
  await testPrisma.user.deleteMany();
});