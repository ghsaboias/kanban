import '@testing-library/jest-dom';

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
