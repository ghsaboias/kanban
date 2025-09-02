import { NextFunction, Request, Response } from 'express';
import { ensureUser } from '../../auth/clerk';
import { testPrisma } from '../setup';

// Mock Clerk modules
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => jest.fn(),
  requireAuth: () => jest.fn(),
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
  getAuth: jest.fn(),
}));

const { clerkClient, getAuth } = require('@clerk/express');

describe('ensureUser middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      locals: {},
    };
    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should call next when no userId is provided', async () => {
    (getAuth as jest.Mock).mockReturnValue({ userId: null });

    await ensureUser(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.locals?.user).toBeUndefined();
  });

  it('should create new user when user does not exist locally', async () => {
    const mockUserId = 'clerk_test_user_id';
    const mockClerkUser = {
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      firstName: 'John',
      lastName: 'Doe',
      username: null,
      emailAddresses: [],
    };

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

    await ensureUser(req as Request, res as Response, next);

    expect(clerkClient.users.getUser).toHaveBeenCalledWith(mockUserId);
    expect(res.locals?.user).toBeDefined();
    expect(res.locals?.user?.clerkId).toBe(mockUserId);
    expect(res.locals?.user?.email).toBe('test@example.com');
    expect(res.locals?.user?.name).toBe('John Doe');
    expect(next).toHaveBeenCalledWith();

    // Verify user was created in database
    const dbUser = await testPrisma.user.findUnique({
      where: { clerkId: mockUserId },
    });
    expect(dbUser).not.toBeNull();
  });

  it('should use existing user data (fast path optimization)', async () => {
    const mockUserId = 'clerk_existing_user_id';

    // Create existing user in database
    await testPrisma.user.create({
      data: {
        clerkId: mockUserId,
        email: 'existing@example.com',
        name: 'Existing User',
      },
    });

    // Mock Clerk API (but it should NOT be called due to fast path)
    const mockClerkUser = {
      primaryEmailAddress: { emailAddress: 'fresh@example.com' },
      firstName: 'Fresh',
      lastName: 'Data',
      username: null,
      emailAddresses: [],
    };

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

    await ensureUser(req as Request, res as Response, next);

    // Should use existing user data (fast path - no Clerk API call)
    expect(res.locals?.user?.email).toBe('existing@example.com');
    expect(res.locals?.user?.name).toBe('Existing User');
    expect(next).toHaveBeenCalledWith();

    // Clerk API should NOT be called (fast path optimization)
    expect(clerkClient.users.getUser).not.toHaveBeenCalled();

    // Verify user data was NOT updated in database
    const dbUser = await testPrisma.user.findUnique({
      where: { clerkId: mockUserId },
    });
    expect(dbUser?.email).toBe('existing@example.com');
    expect(dbUser?.name).toBe('Existing User');
  });

  it('should handle missing email gracefully', async () => {
    const mockUserId = 'clerk_no_email_user_id';
    const mockClerkUser = {
      primaryEmailAddress: null,
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      emailAddresses: [],
    };

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

    await ensureUser(req as Request, res as Response, next);

    expect(res.locals?.user?.email).toBe(`${mockUserId}@example.local`);
    expect(res.locals?.user?.name).toBe('John Doe');
    expect(next).toHaveBeenCalledWith();
  });

  it('should handle missing name gracefully', async () => {
    const mockUserId = 'clerk_no_name_user_id';
    const mockClerkUser = {
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      firstName: null,
      lastName: null,
      username: 'testuser',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    };

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

    await ensureUser(req as Request, res as Response, next);

    expect(res.locals?.user?.name).toBe('testuser');
    expect(next).toHaveBeenCalledWith();
  });

  it('should fallback to alternative email addresses', async () => {
    const mockUserId = 'clerk_alt_email_user_id';
    const mockClerkUser = {
      primaryEmailAddress: null,
      firstName: 'John',
      lastName: 'Doe',
      username: null,
      emailAddresses: [{ emailAddress: 'alt@example.com' }],
    };

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

    await ensureUser(req as Request, res as Response, next);

    expect(res.locals?.user?.email).toBe('alt@example.com');
    expect(next).toHaveBeenCalledWith();
  });

  it('should handle Clerk API errors gracefully with fallback', async () => {
    const mockUserId = 'clerk_error_user_id';
    const error = new Error('Clerk API error');

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockRejectedValue(error);

    await ensureUser(req as Request, res as Response, next);

    // Should handle Clerk API errors gracefully by falling back to placeholder values
    expect(next).toHaveBeenCalledWith();
    expect(res.locals?.user).toBeDefined();
    expect(res.locals?.user?.clerkId).toBe(mockUserId);
    expect(res.locals?.user?.email).toBe(`${mockUserId}@example.local`);
    expect(res.locals?.user?.name).toBe('User');

    // Verify user was created in database with fallback values
    const dbUser = await testPrisma.user.findUnique({
      where: { clerkId: mockUserId },
    });
    expect(dbUser?.email).toBe(`${mockUserId}@example.local`);
    expect(dbUser?.name).toBe('User');
  });

  it('should handle database errors', async () => {
    const mockUserId = 'clerk_db_error_user_id';
    const mockClerkUser = {
      primaryEmailAddress: { emailAddress: 'unique@example.com' },
      firstName: 'John',
      lastName: 'Doe',
      username: null,
      emailAddresses: [],
    };

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

    // Create a user with the same email to force a unique constraint violation on upsert
    await testPrisma.user.create({
      data: {
        clerkId: 'different-clerk-id',
        email: 'unique@example.com', // Same email that Clerk API returns
        name: 'Existing User',
      },
    });

    await ensureUser(req as Request, res as Response, next);

    // Should handle the database unique constraint error gracefully
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.locals?.user).toBeUndefined();
  });
});