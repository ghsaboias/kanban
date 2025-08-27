import { PrismaClient } from '../../generated/prisma/index.js';

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
    
    console.log('✅ Database connection successful!');
    console.log('Created user:', user);
    
    // Clean up test data
    await prisma.user.delete({
      where: { id: user.id }
    });
    
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}