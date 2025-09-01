import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { render, screen } from './test-utils';

// Mock Clerk components
vi.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <div data-testid="signed-in">{children}</div>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <div data-testid="signed-out">{children}</div>,
  SignInButton: () => <button data-testid="sign-in-button">Sign In</button>,
  SignUpButton: () => <button data-testid="sign-up-button">Sign Up</button>,
  UserButton: () => <button data-testid="user-button">User</button>,
}));

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-router">{children}</div>,
    Routes: ({ children }: { children: React.ReactNode }) => <div data-testid="routes">{children}</div>,
    Route: ({ element }: { element: React.ReactNode }) => <div data-testid="route">{element}</div>,
  };
});

// Mock SocketProvider
vi.mock('../contexts/SocketContext', () => ({
  SocketProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="socket-provider">{children}</div>,
}));

// Mock component imports
vi.mock('../components/BoardsList', () => ({
  BoardsList: () => <div data-testid="boards-list">Boards List</div>,
}));

vi.mock('../components/BoardPage', () => ({
  BoardPage: () => <div data-testid="board-page">Board Page</div>,
}));

describe('App', () => {
  it('should render the app header', () => {
    render(<App />);

    expect(screen.getByText('Kanban')).toBeInTheDocument();
  });

  it('should render authentication components', () => {
    render(<App />);

    expect(screen.getAllByTestId('signed-in')).toHaveLength(2); // Header and main content
    expect(screen.getAllByTestId('signed-out')).toHaveLength(2); // Header and main content
  });

  it('should render sign in/up buttons in signed out state', () => {
    render(<App />);

    expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    expect(screen.getByTestId('sign-up-button')).toBeInTheDocument();
  });

  it('should render user button and routes in signed in state', () => {
    render(<App />);

    expect(screen.getByTestId('user-button')).toBeInTheDocument();

    // Check that socket provider wraps the routes
    expect(screen.getByTestId('socket-provider')).toBeInTheDocument();
    expect(screen.getByTestId('routes')).toBeInTheDocument();
  });

  it('should render router and routes structure', () => {
    render(<App />);

    expect(screen.getByTestId('mock-router')).toBeInTheDocument();
    expect(screen.getByTestId('routes')).toBeInTheDocument();
  });

  it('should have proper styling structure', () => {
    render(<App />);

    // Check that header has proper structure
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveStyle({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    });
  });

  it('should show please sign in message when signed out', () => {
    render(<App />);

    expect(screen.getByText('Please sign in to continue.')).toBeInTheDocument();
  });
});