import { existsSync, unlinkSync } from 'fs';
import path from 'path';

export default async function globalTeardown() {
    // Get the worker ID from Jest environment
    const workerId = process.env.JEST_WORKER_ID || '1';
    const testDbDir = path.join(process.cwd(), '..', 'prisma', 'test-dbs');
    const testDbPath = path.join(testDbDir, `test-${workerId}.db`);

    // Clean up the test database for this worker
    try {
        if (existsSync(testDbPath)) {
            unlinkSync(testDbPath);
            console.log(`🧹 Cleaned up test database for worker ${workerId}: ${testDbPath}`);
        }

        // Also clean up journal files if they exist
        const journalPath = `${testDbPath}-journal`;
        if (existsSync(journalPath)) {
            unlinkSync(journalPath);
        }

        const walPath = `${testDbPath}-wal`;
        if (existsSync(walPath)) {
            unlinkSync(walPath);
        }

        const shmPath = `${testDbPath}-shm`;
        if (existsSync(shmPath)) {
            unlinkSync(shmPath);
        }
    } catch (error) {
        console.error(`❌ Failed to cleanup test database for worker ${workerId}:`, error);
        // Don't throw here - we don't want cleanup failures to fail the tests
    }
}
