import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocketProvider, useSocketContext } from '../../contexts/SocketContext';

// Mock useSocket hook
const mockSocketValue = {
  isConnected: false,
  socketId: null,
  error: null,
  joinBoard: vi.fn(),
  leaveBoard: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('../../hooks/useSocket', () => ({
  useSocket: () => mockSocketValue,
}));

// Test component to use the context
const TestComponent = () => {
  const socket = useSocketContext();
  return (
    <div>
      <div data-testid="connected">{socket.isConnected ? 'connected' : 'disconnected'}</div>
      <div data-testid="socket-id">{socket.socketId || 'no-id'}</div>
      <div data-testid="error">{socket.error || 'no-error'}</div>
    </div>
  );
};

describe('SocketContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide socket context to children', () => {
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    expect(screen.getByTestId('connected')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('socket-id')).toHaveTextContent('no-id');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('should provide connected state when socket is connected', () => {
    mockSocketValue.isConnected = true;
    mockSocketValue.socketId = 'test-socket-id';

    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    expect(screen.getByTestId('connected')).toHaveTextContent('connected');
    expect(screen.getByTestId('socket-id')).toHaveTextContent('test-socket-id');
  });

  it('should provide error state when there is an error', () => {
    mockSocketValue.error = 'Connection failed';

    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    expect(screen.getByTestId('error')).toHaveTextContent('Connection failed');
  });

  it('should throw error when useSocketContext is used outside provider', () => {
    // Capture console.error to avoid test noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow('useSocketContext must be used within a SocketProvider');

    consoleSpy.mockRestore();
  });

  it('should provide socket methods', () => {
    const TestMethodsComponent = () => {
      const socket = useSocketContext();
      return (
        <div>
          <button onClick={() => socket.joinBoard('board-1')}>Join Board</button>
          <button onClick={() => socket.leaveBoard('board-1')}>Leave Board</button>
          <button onClick={() => socket.emit('test', { data: 'test' })}>Emit</button>
          <button onClick={() => socket.on('test', () => {})}>Listen</button>
          <button onClick={() => socket.off('test')}>Stop Listen</button>
        </div>
      );
    };

    render(
      <SocketProvider>
        <TestMethodsComponent />
      </SocketProvider>
    );

    expect(screen.getByText('Join Board')).toBeInTheDocument();
    expect(screen.getByText('Leave Board')).toBeInTheDocument();
    expect(screen.getByText('Emit')).toBeInTheDocument();
    expect(screen.getByText('Listen')).toBeInTheDocument();
    expect(screen.getByText('Stop Listen')).toBeInTheDocument();
  });
});