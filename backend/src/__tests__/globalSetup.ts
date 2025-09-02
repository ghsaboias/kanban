import { existsSync, mkdirSync } from 'fs';
import path from 'path';

export default async function globalSetup() {
    // Create test databases directory if it doesn't exist
    const testDbDir = path.join(process.cwd(), '..', 'prisma', 'test-dbs');
    if (!existsSync(testDbDir)) {
        mkdirSync(testDbDir, { recursive: true });
    }

    console.log(`🚀 Global setup completed - test database directory ready: ${testDbDir}`);
}
