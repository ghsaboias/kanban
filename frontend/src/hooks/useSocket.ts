import { useAuth } from '@clerk/clerk-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface SocketUser {
  id: string;
  email: string;
  name: string;
}

export interface SocketEvent {
  userId: string;
  user: SocketUser;
}

export const useSocket = () => {
  const { getToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);

  useEffect(() => {
    let isUnmounted = false;

    const initializeSocket = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        console.log('🔌 Socket: Initializing connection to:', apiUrl);
        const socket = io(apiUrl, {
          autoConnect: false,
        });

        // Refresh token prior to connecting
        const refreshAuth = async () => {
          const fresh = await getToken({ skipCache: true });
          if (!fresh) {
            throw new Error('Authentication token not available');
          }
          socket.auth = { token: fresh };
        };

        socket.on('connect', () => {
          console.log('✅ Socket: Connected to server with ID:', socket.id);
          setIsConnected(true);
          setSocketId(socket.id ?? null);
          setError(null);
        });

        socket.on('disconnect', () => {
          console.log('❌ Socket: Disconnected from server');
          setIsConnected(false);
          setSocketId(null);
        });

        // If the server rejects the auth (expired/invalid), refresh token and retry once
        socket.on('connect_error', async (err: { message?: string }) => {
          console.error('❌ Socket: Connection error:', err?.message);
          setError(err?.message || 'Connection error');
          setIsConnected(false);
          if (err?.message && (err.message.includes('Authentication failed') || err.message.includes('Authentication token'))) {
            try {
              await refreshAuth();
              socket.connect();
            } catch {
              // leave as disconnected; UI remains in SignedIn gate which may prompt re-auth
            }
          }
        });

        // On each reconnect attempt, refresh the token
        socket.io.on('reconnect_attempt', async () => {
          try {
            await refreshAuth();
          } catch {
            // Ignore; server will fail auth and trigger connect_error
          }
        });

        socketRef.current = socket;

        await refreshAuth();
        if (!isUnmounted) {
          socket.connect();
        }
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        setError('Failed to connect to server');
      }
    };

    initializeSocket();

    return () => {
      isUnmounted = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [getToken]);

  const joinBoard = useCallback((boardId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join:board', boardId);
    }
  }, [isConnected]);

  const leaveBoard = useCallback((boardId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave:board', boardId);
    }
  }, [isConnected]);

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    if (!socketRef.current) {
      console.log('useSocket: Cannot add listener - socket not available for event:', event);
      return () => {};
    }

    console.log('useSocket: Adding listener for event:', event);
    const wrappedCallback = (...args: unknown[]) => {
      console.log('🔌 useSocket: Received event:', event, 'with args:', args.length > 0 ? JSON.stringify(args[0]).substring(0, 200) + '...' : 'no args');
      try {
        callback(...args);
      } catch (error) {
        console.error('🔌 useSocket: Error in event callback for', event, ':', error);
      }
    };
    
    socketRef.current.on(event, wrappedCallback);

    return () => {
      console.log('useSocket: Removing listener for event:', event);
      if (socketRef.current) {
        socketRef.current.off(event, wrappedCallback);
      }
    };
  }, []);

  const off = useCallback((event: string, callback?: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      console.log('useSocket: Removing listener for event:', event);
      socketRef.current.off(event, callback);
    }
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current && isConnected) {
      console.log('useSocket: Emitting event:', event, 'with data:', data);
      socketRef.current.emit(event, data);
    } else {
      console.log('useSocket: Cannot emit event - socket not connected or available:', event);
    }
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    socketId,
    error,
    joinBoard,
    leaveBoard,
    on,
    off,
    emit,
  };
};
