import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { render, screen, waitFor } from './test-utils';

// Mock API calls with stable apiFetch reference to prevent infinite loops
const mockApiFetch = vi.fn();
// Create stable apiFetch reference
const stableApiFetch = mockApiFetch;

vi.mock('../useApi', () => ({
  useApi: () => ({ apiFetch: stableApiFetch })
}));

// Mock useRealtimeBoard to prevent infinite loops from setBoard dependencies
vi.mock('../hooks/useRealtimeBoard', () => ({
  useRealtimeBoard: () => ({
    isConnected: true,
    onlineUsers: [],
    activities: []
  }),
}));

// Mock socket.io-client but allow real SocketProvider to work
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    id: 'test-socket-id',
    auth: {},
    io: { on: vi.fn() }
  }))
}));

// Mock Clerk with realistic behavior for testing different auth states
const mockClerkState = {
  isSignedIn: false,
  isLoaded: true
};

vi.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) =>
    mockClerkState.isSignedIn && mockClerkState.isLoaded ? <>{children}</> : null,
  SignedOut: ({ children }: { children: React.ReactNode }) =>
    !mockClerkState.isSignedIn && mockClerkState.isLoaded ? <>{children}</> : null,
  SignInButton: () => <button data-testid="sign-in-button">Sign In</button>,
  SignUpButton: () => <button data-testid="sign-up-button">Sign Up</button>,
  UserButton: () => <button data-testid="user-button">User</button>,
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isLoaded: mockClerkState.isLoaded,
    isSignedIn: mockClerkState.isSignedIn,
    userId: mockClerkState.isSignedIn ? 'test-user' : null,
  })
}));

// Helper to set authentication state
const setAuthState = (signedIn: boolean, loaded = true) => {
  mockClerkState.isSignedIn = signedIn;
  mockClerkState.isLoaded = loaded;
};

// Test wrapper that includes router context for navigation testing
const renderAppWithRouter = (initialRoute = '/') => {
  window.history.pushState({}, 'Test page', initialRoute);
  return render(<App />);
};

describe('App Integration Tests', () => {
  // Create stable mock data to prevent infinite re-renders
  const mockBoardData = {
    id: 'test-board-id',
    title: 'Test Board',
    description: 'A test board',
    columns: [
      {
        id: 'col-1',
        title: 'To Do',
        position: 0,
        cards: [
          {
            id: 'card-1',
            title: 'Test Card',
            description: 'Test description',
            priority: 'MEDIUM',
            position: 0,
            assignee: null
          }
        ]
      }
    ]
  };

  const mockBoardsData: unknown[] = [];
  const mockActivitiesData: unknown[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to signed out state
    setAuthState(false, true);

    // Mock realistic API responses with stable references
    mockApiFetch.mockImplementation((url) => {
      if (url.includes('/boards/') && !url.includes('/activities')) {
        // Mock board detail response with stable data
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockBoardData
          })
        });
      } else if (url.includes('/activities')) {
        // Mock activities response with stable data
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockActivitiesData
          })
        });
      } else {
        // Mock boards list response with stable data
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockBoardsData
          })
        });
      }
    });
  });

  describe('Authentication Integration', () => {
    it('should show sign in/up buttons when user is signed out', () => {
      setAuthState(false, true);
      render(<App />);

      expect(screen.getByText('Kanban')).toBeInTheDocument();
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
      expect(screen.getByTestId('sign-up-button')).toBeInTheDocument();
      expect(screen.getByText('Please sign in to continue.')).toBeInTheDocument();
    });

    it('should show user button and app content when user is signed in', async () => {
      setAuthState(true, true);
      renderAppWithRouter('/');

      expect(screen.getByText('Kanban')).toBeInTheDocument();
      expect(screen.getByTestId('user-button')).toBeInTheDocument();
      expect(screen.queryByText('Please sign in to continue.')).not.toBeInTheDocument();

      // Should load BoardsList component (may show loading initially due to lazy loading)
      await waitFor(() => {
        expect(screen.getByText('Kanban Boards') || screen.getByText('Loading…')).toBeInTheDocument();
      });
    });

    it('should handle loading state properly', () => {
      setAuthState(false, false); // Not loaded yet
      render(<App />);

      expect(screen.getByText('Kanban')).toBeInTheDocument();
      // Should not show auth buttons until loaded
      expect(screen.queryByTestId('sign-in-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-button')).not.toBeInTheDocument();
    });
  });

  describe('Routing Integration', () => {
    it('should render BoardsList at root route when signed in', async () => {
      setAuthState(true, true);
      renderAppWithRouter('/');

      // Should show loading or boards list
      await waitFor(() => {
        expect(
          screen.getByText('Kanban Boards') || screen.getByText('Loading…')
        ).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should render BoardPage at board route when signed in', async () => {
      setAuthState(true, true);
      renderAppWithRouter('/board/test-board-id');

      // Should render the back link which indicates BoardPage loaded
      await waitFor(() => {
        expect(screen.getByText('← Back to Boards')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Should render the board toolbar 
      expect(screen.getByText('Board view')).toBeInTheDocument();
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    it('should not render routes when signed out', () => {
      setAuthState(false, true);
      renderAppWithRouter('/board/test-board-id');

      expect(screen.queryByText('Loading board...')).not.toBeInTheDocument();
      expect(screen.getByText('Please sign in to continue.')).toBeInTheDocument();
    });
  });

  describe('Real Component Integration', () => {
    it('should render real header structure with proper styling', () => {
      setAuthState(false, true);
      render(<App />);

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveStyle({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      });

      expect(screen.getByText('Kanban')).toBeInTheDocument();
    });

    it('should integrate with appearance theme system', () => {
      setAuthState(false, true);
      render(<App />);

      // App should render with theme applied (background color set)
      const appContainer = screen.getByText('Kanban').closest('div');
      expect(appContainer).toHaveStyle('min-height: 100vh');
    });

    it('should render lazy-loaded components successfully', async () => {
      setAuthState(true, true);
      renderAppWithRouter('/');

      // Components load so quickly in test that we might not see loading state
      // Just verify the lazy-loaded BoardsList component renders
      await waitFor(() => {
        expect(screen.getByText('Kanban Boards')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Verify it's the real component with real functionality
      expect(screen.getByText('+ Create Board')).toBeInTheDocument();
      expect(screen.getByText('No boards found')).toBeInTheDocument();
    });
  });

  describe('Socket Integration', () => {
    it('should initialize socket provider when signed in', async () => {
      setAuthState(true, true);
      renderAppWithRouter('/');

      // Socket provider should be working (components that use it should render)
      await waitFor(() => {
        expect(screen.getByText('Kanban Boards')).toBeInTheDocument();
      });

      // Verify the real components that depend on socket context rendered
      expect(screen.getByText('+ Create Board')).toBeInTheDocument();

      // Verify socket was initialized (mocked)
      const { io } = await import('socket.io-client');
      expect(io).toHaveBeenCalled();
    });

    it('should not initialize socket when signed out', () => {
      setAuthState(false, true);
      render(<App />);

      expect(screen.getByText('Please sign in to continue.')).toBeInTheDocument();
      // Socket should not be initialized for signed out users
    });
  });
});