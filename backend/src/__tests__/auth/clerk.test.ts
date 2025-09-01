import { Request, Response, NextFunction } from 'express';
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

  it('should update existing user with fresh data', async () => {
    const mockUserId = 'clerk_existing_user_id';
    
    // Create existing user in database
    await testPrisma.user.create({
      data: {
        clerkId: mockUserId,
        email: 'old@example.com',
        name: 'Old Name',
      },
    });

    const mockClerkUser = {
      primaryEmailAddress: { emailAddress: 'new@example.com' },
      firstName: 'New',
      lastName: 'Name',
      username: null,
      emailAddresses: [],
    };

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

    await ensureUser(req as Request, res as Response, next);

    expect(res.locals?.user?.email).toBe('new@example.com');
    expect(res.locals?.user?.name).toBe('New Name');
    expect(next).toHaveBeenCalledWith();

    // Verify user was updated in database
    const dbUser = await testPrisma.user.findUnique({
      where: { clerkId: mockUserId },
    });
    expect(dbUser?.email).toBe('new@example.com');
    expect(dbUser?.name).toBe('New Name');
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

  it('should handle Clerk API errors', async () => {
    const mockUserId = 'clerk_error_user_id';
    const error = new Error('Clerk API error');

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockRejectedValue(error);

    await ensureUser(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.locals?.user).toBeUndefined();
  });

  it('should handle database errors', async () => {
    const mockUserId = 'clerk_db_error_user_id';
    const mockClerkUser = {
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      firstName: 'John',
      lastName: 'Doe',
      username: null,
      emailAddresses: [],
    };

    (getAuth as jest.Mock).mockReturnValue({ userId: mockUserId });
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);

    // Create a user with the same clerkId to force a constraint violation
    await testPrisma.user.create({
      data: {
        clerkId: mockUserId,
        email: 'existing@example.com',
        name: 'Existing User',
      },
    });

    // Force a unique constraint violation by creating another user with same email
    await testPrisma.user.create({
      data: {
        clerkId: 'different-clerk-id',
        email: 'test@example.com',
        name: 'Different User',
      },
    });

    await ensureUser(req as Request, res as Response, next);

    // Should handle the database error gracefully
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});