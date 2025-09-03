import { PrismaClient } from '../../generated/prisma/index.js';
import { logger } from './utils/logger';

// Initialize Prisma client
export const prisma = new PrismaClient();

// Test connection function
export async function testDatabase() {
  try {
    // Test creating a user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });
    
    logger.info('✅ Database connection successful!');
    logger.debug('Created test user', { id: user.id });
    
    // Clean up test data
    await prisma.user.delete({
      where: { id: user.id }
    });
    
    logger.info('✅ Test data cleaned up');
    
  } catch (error) {
    logger.error('❌ Database connection failed', { error });
  } finally {
    await prisma.$disconnect();
  }
}
