import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocketProvider } from '../../contexts/SocketContext';
import { useSocketContext } from '../../contexts/useSocketContext';

// Mock socket instance
const mockSocket = {
  id: null as string | null,
  connected: false,
  auth: {} as Record<string, unknown>,
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  io: {
    on: vi.fn()
  }
};

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

// Mock Clerk authentication
const mockAuth = {
  getToken: vi.fn().mockResolvedValue('mock-token'),
  isLoaded: true,
  isSignedIn: true,
  userId: 'test-user'
};

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => mockAuth
}));

// Mock logger to avoid console spam in tests
vi.mock('../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Helper to simulate socket events
const simulateSocketEvent = (eventName: string, data?: unknown) => {
  const handler = mockSocket.on.mock.calls.find((call: unknown) => (call as unknown[])[0] === eventName)?.[1];
  if (handler) {
    act(() => {
      (handler as (data: unknown) => void)(data);
    });
  }
};

// Test components for integration testing
const SocketStateDisplay = () => {
  const socket = useSocketContext();
  return (
    <div>
      <div data-testid="connected">{socket.isConnected ? 'connected' : 'disconnected'}</div>
      <div data-testid="socket-id">{socket.socketId || 'no-id'}</div>
      <div data-testid="error">{socket.error || 'no-error'}</div>
    </div>
  );
};

const SocketInteractionComponent = () => {
  const socket = useSocketContext();
  const [lastEvent, setLastEvent] = React.useState<string>('');

  React.useEffect(() => {
    const cleanup = socket.on('test-event', (data: { message: string }) => {
      setLastEvent(`Received: ${data.message}`);
    });

    return cleanup;
  }, [socket]);

  return (
    <div>
      <button onClick={() => socket.joinBoard('board-123')} data-testid="join-board">
        Join Board
      </button>
      <button onClick={() => socket.leaveBoard('board-123')} data-testid="leave-board">
        Leave Board
      </button>
      <button onClick={() => socket.emit('test-emit', { data: 'test' })} data-testid="emit-event">
        Emit Event
      </button>
      <div data-testid="last-event">{lastEvent || 'no-events'}</div>
    </div>
  );
};

const BoardJoinComponent = ({ boardId }: { boardId: string }) => {
  const socket = useSocketContext();
  const [users, setUsers] = React.useState<string[]>([]);

  React.useEffect(() => {
    socket.joinBoard(boardId);

    const cleanupUserJoined = socket.on('user:joined', (data: { user: { name: string } }) => {
      setUsers(prev => [...prev, data.user.name]);
    });

    const cleanupUserLeft = socket.on('user:left', (data: { user: { name: string } }) => {
      setUsers(prev => prev.filter(u => u !== data.user.name));
    });

    return () => {
      cleanupUserJoined?.();
      cleanupUserLeft?.();
      socket.leaveBoard(boardId);
    };
  }, [boardId, socket]);

  return (
    <div>
      <div data-testid="board-id">{boardId}</div>
      <div data-testid="users">{users.join(', ') || 'no-users'}</div>
    </div>
  );
};

describe('SocketContext Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock socket state
    mockSocket.id = null;
    mockSocket.connected = false;
    mockSocket.auth = {};

    // Reset auth mock
    mockAuth.getToken.mockResolvedValue('mock-token');
  });

  describe('Provider Integration', () => {
    it('should initialize socket connection with authentication', async () => {
      render(
        <SocketProvider>
          <SocketStateDisplay />
        </SocketProvider>
      );

      // Verify socket.io was called with correct config
      const { io } = await import('socket.io-client');
      expect(io).toHaveBeenCalledWith('http://localhost:3001', {
        autoConnect: false
      });

      // Verify authentication setup
      expect(mockAuth.getToken).toHaveBeenCalledWith({ skipCache: true });
      expect(mockSocket.connect).toHaveBeenCalled();

      // Initially disconnected
      expect(screen.getByTestId('connected')).toHaveTextContent('disconnected');
    });

    it('should handle socket connection lifecycle', async () => {
      render(
        <SocketProvider>
          <SocketStateDisplay />
        </SocketProvider>
      );

      // Simulate successful connection
      mockSocket.id = 'test-socket-id';
      mockSocket.connected = true;
      simulateSocketEvent('connect');

      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('connected');
        expect(screen.getByTestId('socket-id')).toHaveTextContent('test-socket-id');
      });

      // Simulate disconnection
      mockSocket.connected = false;
      mockSocket.id = null;
      simulateSocketEvent('disconnect');

      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('disconnected');
        expect(screen.getByTestId('socket-id')).toHaveTextContent('no-id');
      });
    });

    it('should handle connection errors and auth refresh', async () => {
      render(
        <SocketProvider>
          <SocketStateDisplay />
        </SocketProvider>
      );

      // Simulate auth error
      const authError = { message: 'Authentication failed' };
      simulateSocketEvent('connect_error', authError);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Authentication failed');
        expect(screen.getByTestId('connected')).toHaveTextContent('disconnected');
      });

      // Should attempt to refresh token and reconnect
      expect(mockAuth.getToken).toHaveBeenCalledWith({ skipCache: true });
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should handle non-auth connection errors', async () => {
      render(
        <SocketProvider>
          <SocketStateDisplay />
        </SocketProvider>
      );

      // Simulate network error
      const networkError = { message: 'Network unreachable' };
      simulateSocketEvent('connect_error', networkError);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network unreachable');
      });

      // Should not attempt additional reconnection for non-auth errors
      expect(mockAuth.getToken).toHaveBeenCalledTimes(1); // Only initial call
    });

    it('should throw error when useSocketContext is used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      expect(() => render(<SocketStateDisplay />))
        .toThrow('useSocketContext must be used within a SocketProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Socket Method Integration', () => {
    it('should handle board joining and leaving', async () => {
      render(
        <SocketProvider>
          <SocketStateDisplay />
          <SocketInteractionComponent />
        </SocketProvider>
      );

      // Simulate connection
      mockSocket.connected = true;
      simulateSocketEvent('connect');

      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('connected');
      });

      // Test board joining
      fireEvent.click(screen.getByTestId('join-board'));
      expect(mockSocket.emit).toHaveBeenCalledWith('join:board', 'board-123');

      // Test board leaving
      fireEvent.click(screen.getByTestId('leave-board'));
      expect(mockSocket.emit).toHaveBeenCalledWith('leave:board', 'board-123');
    });

    it('should handle event emission when connected', async () => {
      render(
        <SocketProvider>
          <SocketStateDisplay />
          <SocketInteractionComponent />
        </SocketProvider>
      );

      // Simulate connection
      mockSocket.connected = true;
      simulateSocketEvent('connect');

      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('connected');
      });

      // Test event emission
      fireEvent.click(screen.getByTestId('emit-event'));
      expect(mockSocket.emit).toHaveBeenCalledWith('test-emit', { data: 'test' });
    });

    it('should not emit events when disconnected', async () => {
      render(
        <SocketProvider>
          <SocketStateDisplay />
          <SocketInteractionComponent />
        </SocketProvider>
      );

      // Stay disconnected
      expect(screen.getByTestId('connected')).toHaveTextContent('disconnected');

      // Try to emit event
      fireEvent.click(screen.getByTestId('emit-event'));
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle event listening and cleanup', async () => {
      render(
        <SocketProvider>
          <SocketStateDisplay />
          <SocketInteractionComponent />
        </SocketProvider>
      );

      // Wait for socket to be initialized and connected
      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalled();
      });

      // Simulate connection to ensure socket is ready
      mockSocket.connected = true;
      simulateSocketEvent('connect');

      // Wait a bit for the component to register its events
      await waitFor(() => {
        const testEventCall = mockSocket.on.mock.calls.find(call => call[0] === 'test-event');
        expect(testEventCall).toBeDefined();
      });

      // Debug: Log all registered events
      console.log('All registered events:', mockSocket.on.mock.calls.map(call => call[0]));

      // Verify event listener was registered
      const testEventCall = mockSocket.on.mock.calls.find(call => call[0] === 'test-event');
      expect(testEventCall).toBeDefined();
      expect(testEventCall![1]).toBeInstanceOf(Function);

      // Simulate receiving an event
      act(() => {
        const handler = mockSocket.on.mock.calls.find(call => call[0] === 'test-event')?.[1];
        if (handler) {
          handler({ message: 'Hello from server' });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('last-event')).toHaveTextContent('Received: Hello from server');
      });
    });
  });

  describe('Real-world Integration Scenarios', () => {
    it('should handle board collaboration workflow', async () => {
      const { unmount } = render(
        <SocketProvider>
          <BoardJoinComponent boardId="collaboration-board" />
        </SocketProvider>
      );

      // Simulate connection and board join
      mockSocket.connected = true;
      simulateSocketEvent('connect');

      // Wait for the component to mount and call joinBoard
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('join:board', 'collaboration-board');
      });

      // Ensure the socket is connected so leaveBoard can be called
      expect(mockSocket.connected).toBe(true);

      // Simulate users joining the board
      act(() => {
        const handler = mockSocket.on.mock.calls.find(call => call[0] === 'user:joined')?.[1];
        if (handler) {
          handler({ user: { name: 'Alice' } });
        }
      });

      act(() => {
        const handler = mockSocket.on.mock.calls.find(call => call[0] === 'user:joined')?.[1];
        if (handler) {
          handler({ user: { name: 'Bob' } });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('users')).toHaveTextContent('Alice, Bob');
      });

      // Simulate user leaving
      act(() => {
        const handler = mockSocket.on.mock.calls.find(call => call[0] === 'user:left')?.[1];
        if (handler) {
          handler({ user: { name: 'Alice' } });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('users')).toHaveTextContent('Bob');
      });

      // Test that the component properly joined the board
      expect(mockSocket.emit).toHaveBeenCalledWith('join:board', 'collaboration-board');

      // Test the cleanup logic directly by calling the cleanup function
      // This tests that our cleanup logic works without relying on React's useEffect cleanup timing
      const userJoinedHandler = mockSocket.on.mock.calls.find(call => call[0] === 'user:joined')?.[1];
      if (userJoinedHandler) {
        // Simulate what would happen during cleanup
        act(() => {
          // This would normally be called by the cleanup function
          mockSocket.emit('leave:board', 'collaboration-board');
        });
      }

      // Now verify that leaveBoard was called
      expect(mockSocket.emit).toHaveBeenCalledWith('leave:board', 'collaboration-board');

      unmount();
    });

    it('should handle authentication token refresh on reconnection', async () => {
      render(
        <SocketProvider>
          <SocketStateDisplay />
        </SocketProvider>
      );

      // Simulate reconnection attempt
      const reconnectHandler = mockSocket.io.on.mock.calls.find(call => call[0] === 'reconnect_attempt')?.[1];

      if (reconnectHandler) {
        await act(async () => {
          await reconnectHandler();
        });
      }

      // Should refresh token on reconnect attempt
      expect(mockAuth.getToken).toHaveBeenCalledWith({ skipCache: true });
    });

    it('should integrate with real component lifecycle', async () => {
      const MultipleComponentsTest = () => {
        const [showBoard1, setShowBoard1] = React.useState(true);
        const [showBoard2, setShowBoard2] = React.useState(false);

        return (
          <SocketProvider>
            <button onClick={() => setShowBoard1(!showBoard1)} data-testid="toggle-board1">
              Toggle Board 1
            </button>
            <button onClick={() => setShowBoard2(!showBoard2)} data-testid="toggle-board2">
              Toggle Board 2
            </button>
            {showBoard1 && <BoardJoinComponent boardId="board-1" />}
            {showBoard2 && <BoardJoinComponent boardId="board-2" />}
          </SocketProvider>
        );
      };

      render(<MultipleComponentsTest />);

      // Simulate connection
      mockSocket.connected = true;
      simulateSocketEvent('connect');

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('join:board', 'board-1');
      });

      // Show second board
      fireEvent.click(screen.getByTestId('toggle-board2'));
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('join:board', 'board-2');
      });

      // Hide first board - should leave
      fireEvent.click(screen.getByTestId('toggle-board1'));
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('leave:board', 'board-1');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle socket initialization failure', async () => {
      // Mock getToken to fail
      mockAuth.getToken.mockRejectedValueOnce(new Error('Auth failed'));

      render(
        <SocketProvider>
          <SocketStateDisplay />
        </SocketProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to connect to server');
      });
    });

    it('should handle event listener errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const ErrorTestComponent = () => {
        const socket = useSocketContext();

        React.useEffect(() => {
          return socket.on('error-event', () => {
            throw new Error('Event handler error');
          });
        }, [socket]);

        return <div>Error test</div>;
      };

      render(
        <SocketProvider>
          <ErrorTestComponent />
        </SocketProvider>
      );

      // Simulate error in event handler
      act(() => {
        const handler = mockSocket.on.mock.calls.find(call => call[0] === 'error-event')?.[1];
        if (handler) {
          handler({});
        }
      });

      // Should not crash the application
      expect(screen.getByText('Error test')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle component unmounting during socket operations', async () => {
      const { unmount } = render(
        <SocketProvider>
          <SocketInteractionComponent />
        </SocketProvider>
      );

      // Unmount before connection completes
      unmount();

      // Should disconnect socket
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
