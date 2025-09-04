import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { NextFunction, Request, Response } from 'express';
import { testPrisma } from '../setup';

// Test-controlled variables for Clerk mocks
let mockedUserId: string | null = null;
type MockClerkUser = {
  primaryEmailAddress: { emailAddress: string } | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
};
let getUserResponse: MockClerkUser | null = null;
let getUserError: Error | null = null;
let getUserCalls = 0;

// Mock Clerk modules BEFORE requiring code under test
mock.module('@clerk/express', () => ({
  clerkMiddleware: () => mock(),
  requireAuth: () => mock(),
  clerkClient: {
    users: {
      getUser: async () => {
        getUserCalls++;
        if (getUserError) throw getUserError;
        return getUserResponse;
      }
    },
  },
  getAuth: () => ({ userId: mockedUserId }),
}));
// Now require the mocked module and the code under test
// Prefix with underscore to satisfy no-unused-vars rule
const { clerkClient: _clerkClient } = require('@clerk/express');
const { ensureUser } = require('../../auth/clerk');

describe('ensureUser middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = { locals: {} };
    next = mock();
    // reset test-controlled mock state
    mockedUserId = null;
    getUserResponse = null;
    getUserError = null;
    getUserCalls = 0;
  });

  it('should call next when no userId is provided', async () => {
    mockedUserId = null;

    await ensureUser(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.locals?.user).toBeUndefined();
  });

  it('should create new user when user does not exist locally', async () => {
    const mockUserId = 'clerk_test_user_id';
    const mockClerkUser = {
      primaryEmailAddress: { emailAddress: `user-${mockUserId}@example.com` },
      firstName: 'John',
      lastName: 'Doe',
      username: null,
      emailAddresses: [],
    };

    mockedUserId = mockUserId;
    getUserResponse = mockClerkUser;

    await ensureUser(req as Request, res as Response, next);

    // verify our mock was exercised
    expect(getUserCalls).toBe(1);
    expect(res.locals?.user).toBeDefined();
    expect(res.locals?.user?.clerkId).toBe(mockUserId);
    expect(res.locals?.user?.email).toBe(`user-${mockUserId}@example.com`);
    expect(res.locals?.user?.name).toBe('John Doe');
    expect(next).toHaveBeenCalledWith();

    const dbUser = await testPrisma.user.findUnique({ where: { clerkId: mockUserId } });
    expect(dbUser).not.toBeNull();
  });

  it('should use existing user data (fast path optimization)', async () => {
    const mockUserId = 'clerk_existing_user_id';
    await testPrisma.user.create({
      data: { clerkId: mockUserId, email: 'existing@example.com', name: 'Existing User' },
    });

    const mockClerkUser = {
      primaryEmailAddress: { emailAddress: 'fresh@example.com' },
      firstName: 'Fresh',
      lastName: 'Data',
      username: null,
      emailAddresses: [],
    };

    mockedUserId = mockUserId;
    getUserResponse = mockClerkUser;

    await ensureUser(req as Request, res as Response, next);

    expect(res.locals?.user?.email).toBe('existing@example.com');
    expect(res.locals?.user?.name).toBe('Existing User');
    expect(next).toHaveBeenCalledWith();
    expect(getUserCalls).toBe(0);
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

    mockedUserId = mockUserId;
    getUserResponse = mockClerkUser;

    await ensureUser(req as Request, res as Response, next);

    expect(res.locals?.user?.email).toBe(`${mockUserId}@example.local`);
    expect(res.locals?.user?.name).toBe('John Doe');
    expect(next).toHaveBeenCalledWith();
  });

  it('should handle missing name gracefully', async () => {
    const mockUserId = 'clerk_no_name_user_id';
    const mockClerkUser = {
      primaryEmailAddress: { emailAddress: `user-${mockUserId}@example.com` },
      firstName: null,
      lastName: null,
      username: 'testuser',
      emailAddresses: [{ emailAddress: `user-${mockUserId}@example.com` }],
    };

    mockedUserId = mockUserId;
    getUserResponse = mockClerkUser;

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

    mockedUserId = mockUserId;
    getUserResponse = mockClerkUser;

    await ensureUser(req as Request, res as Response, next);

    expect(res.locals?.user?.email).toBe('alt@example.com');
    expect(next).toHaveBeenCalledWith();
  });

  it('should handle Clerk API errors gracefully with fallback', async () => {
    const mockUserId = 'clerk_error_user_id';
    mockedUserId = mockUserId;
    getUserError = new Error('Clerk API error');

    await ensureUser(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.locals?.user).toBeDefined();
    expect(res.locals?.user?.clerkId).toBe(mockUserId);
    expect(res.locals?.user?.email).toBe(`${mockUserId}@example.local`);
    expect(res.locals?.user?.name).toBe('User');
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

    mockedUserId = mockUserId;
    getUserResponse = mockClerkUser;

    // Create a conflicting user to trigger unique email violation
    await testPrisma.user.create({
      data: {
        clerkId: `different-${Date.now()}`,
        email: 'unique@example.com',
        name: 'Existing User',
      },
    });

    await ensureUser(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.locals?.user).toBeUndefined();
  });
});
