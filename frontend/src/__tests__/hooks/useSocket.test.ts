import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSocket } from '../../hooks/useSocket';

// Mock socket.io-client
const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  auth: {},
  id: 'test-socket-id',
  io: {
    on: vi.fn(),
  },
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

// Mock environment variable
vi.mock('import.meta', () => ({
  env: {
    VITE_API_URL: 'http://localhost:3001',
  },
}));

describe('useSocket', () => {
  let mockGetToken: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetToken = vi.fn().mockResolvedValue('mock-token');
    
    const { useAuth } = await import('@clerk/clerk-react');
    vi.mocked(useAuth).mockReturnValue({
      getToken: mockGetToken,
    } as any);

    // Reset mock socket state
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.socketId).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should initialize socket and set up event listeners', async () => {
    const { io } = await import('socket.io-client');
    
    renderHook(() => useSocket());

    expect(io).toHaveBeenCalledWith('http://localhost:3001', {
      autoConnect: false,
    });
    
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
  });

  it('should handle connect event', async () => {
    const { result } = renderHook(() => useSocket());

    // Simulate connect event
    const connectCall = mockSocket.on.mock.calls.find(call => call[0] === 'connect');
    expect(connectCall).toBeTruthy();
    const connectHandler = connectCall![1] as Function;
    act(() => {
      connectHandler();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.socketId).toBe('test-socket-id');
    expect(result.current.error).toBe(null);
  });

  it('should handle disconnect event', async () => {
    const { result } = renderHook(() => useSocket());

    // First connect
    const connectCall = mockSocket.on.mock.calls.find(call => call[0] === 'connect');
    expect(connectCall).toBeTruthy();
    const connectHandler = connectCall![1] as Function;
    act(() => {
      connectHandler();
    });

    // Then disconnect
    const disconnectCall = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect');
    expect(disconnectCall).toBeTruthy();
    const disconnectHandler = disconnectCall![1] as Function;
    act(() => {
      disconnectHandler();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.socketId).toBe(null);
  });

  it('should handle connection error', async () => {
    const { result } = renderHook(() => useSocket());

    const errorCall = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error');
    expect(errorCall).toBeTruthy();
    const errorHandler = errorCall![1] as Function;
    act(() => {
      errorHandler({ message: 'Connection failed' });
    });

    expect(result.current.error).toBe('Connection failed');
    expect(result.current.isConnected).toBe(false);
  });

  it('should provide joinBoard method', () => {
    const { result } = renderHook(() => useSocket());

    // First connect
    const connectCall = mockSocket.on.mock.calls.find(call => call[0] === 'connect');
    expect(connectCall).toBeTruthy();
    const connectHandler = connectCall![1] as Function;
    act(() => {
      connectHandler();
    });

    act(() => {
      result.current.joinBoard('board-123');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('join:board', 'board-123');
  });

  it('should provide leaveBoard method', () => {
    const { result } = renderHook(() => useSocket());

    // First connect
    const connectCall = mockSocket.on.mock.calls.find(call => call[0] === 'connect');
    expect(connectCall).toBeTruthy();
    const connectHandler = connectCall![1] as Function;
    act(() => {
      connectHandler();
    });

    act(() => {
      result.current.leaveBoard('board-123');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('leave:board', 'board-123');
  });

  it('should provide emit method', () => {
    const { result } = renderHook(() => useSocket());

    // First connect
    const connectCall = mockSocket.on.mock.calls.find(call => call[0] === 'connect');
    expect(connectCall).toBeTruthy();
    const connectHandler = connectCall![1] as Function;
    act(() => {
      connectHandler();
    });

    act(() => {
      result.current.emit('test-event', { data: 'test' });
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
  });

  it('should provide on method', () => {
    const { result } = renderHook(() => useSocket());
    const callback = vi.fn();

    act(() => {
      result.current.on('test-event', callback);
    });

    expect(mockSocket.on).toHaveBeenCalledWith('test-event', callback);
  });

  it('should provide off method', () => {
    const { result } = renderHook(() => useSocket());
    const callback = vi.fn();

    act(() => {
      result.current.off('test-event', callback);
    });

    expect(mockSocket.off).toHaveBeenCalledWith('test-event', callback);
  });

  it('should not emit when disconnected', () => {
    const { result } = renderHook(() => useSocket());

    // Don't connect first
    act(() => {
      result.current.joinBoard('board-123');
      result.current.leaveBoard('board-456');
      result.current.emit('test', {});
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should disconnect socket on cleanup', () => {
    const { unmount } = renderHook(() => useSocket());

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
