import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

import { vi, beforeAll, afterAll } from 'vitest';

// Set up environment variables for tests
vi.stubEnv('VITE_API_URL', 'http://localhost:3001');

// Suppress React act() warnings in tests - these are cosmetic and don't affect functionality
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress act() warnings and React update warnings
    if (
      typeof args[0] === 'string' && (
        args[0].includes('Warning: An update to') ||
        args[0].includes('act(') ||
        args[0].includes('not wrapped in act')
      )
    ) {
      return; // Suppress these warnings
    }
    originalError.call(console, ...args); // Keep other errors
  };
});

afterAll(() => {
  console.error = originalError; // Restore original console.error
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock Socket.IO client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    connected: false,
    id: 'mock-socket-id',
  })),
}));

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'mock-user-id',
    getToken: vi.fn().mockResolvedValue('mock-token'),
  }),
  useUser: () => ({
    user: {
      id: 'mock-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      fullName: 'Test User',
    },
  }),
  // Return null to avoid JSX in .ts setup file
  SignIn: () => null,
  SignUp: () => null,
  UserButton: () => null,
}));
