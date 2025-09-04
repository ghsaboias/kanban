import cors from 'cors';
import express from 'express';
import { errorHandler, notFound } from '../middleware/errorHandler';
import boardsRouter from '../routes/boards';
import cardsRouter from '../routes/cards';
import columnsRouter from '../routes/columns';
import usersRouter from '../routes/users';
import { testPrisma } from './setup';

// Mock authentication middleware for testing
const mockAuthMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        // Get the test user from the request headers
        let testUser = null;

        // Check for test user data in headers (preferred method)
        const testUserData = req.headers['x-test-user'] as string;

        if (testUserData) {
            try {
                testUser = JSON.parse(testUserData);
                // Verify the user exists in database
                const dbUser = await testPrisma.user.findUnique({
                    where: { id: testUser.id }
                });
                if (!dbUser) {
                    console.warn(`Test user from header not found in database, creating it`);
                    testUser = await testPrisma.user.create({
                        data: testUser
                    });
                } else {
                    // Use the database user to ensure we have the latest data
                    testUser = dbUser;
                }
            } catch (parseError) {
                console.error('Failed to parse test user data from header:', parseError);
            }
        }

        // Final fallback to default test user
        if (!testUser) {
            try {
                testUser = await testPrisma.user.upsert({
                    where: { id: 'default-test-user-id' },
                    update: {},
                    create: {
                        id: 'default-test-user-id',
                        name: 'Default Test User',
                        email: 'default-test@example.com',
                        clerkId: 'default-test-clerk-id',
                    },
                });
            } catch (error) {
                console.error('Failed to create default test user:', error);
                // Fallback to a simple object if database operation fails
                testUser = {
                    id: 'default-test-user-id',
                    name: 'Default Test User',
                    email: 'default-test@example.com',
                    clerkId: 'default-test-clerk-id',
                };
            }
        }

        // Ensure we have a valid user object
        if (!testUser || !testUser.id) {
            throw new Error('Failed to establish test user for authentication');
        }

        res.locals.user = testUser;
        next();
    } catch (error) {
        console.error('MockAuthMiddleware error:', error);
        // Return a 500 error if authentication setup fails
        res.status(500).json({
            success: false,
            message: 'Test authentication setup failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export function createTestApp() {
    const app = express();

    // Middleware
    app.use(cors({
        origin: 'http://localhost:5173',
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Socket-Id']
    }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Routes
    app.get('/', (_req, res) => {
        res.json({ status: 'ok', message: 'Kanban API is running', timestamp: new Date().toISOString() });
    });

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', message: 'Kanban API is running' });
    });

    // Authenticated routes - use mock auth middleware
    app.get('/api/auth/me', mockAuthMiddleware, (req, res) => {
        res.json({ success: true, data: res.locals.user });
    });

    // Mount routes with proper prefixes to avoid conflicts
    app.use('/api/boards', mockAuthMiddleware, boardsRouter);
    app.use('/api', mockAuthMiddleware, columnsRouter);
    app.use('/api', mockAuthMiddleware, cardsRouter);
    app.use('/api/users', mockAuthMiddleware, usersRouter);

    // Error handling middleware (must be last)
    app.use(notFound);
    app.use(errorHandler);

    return app;
}
