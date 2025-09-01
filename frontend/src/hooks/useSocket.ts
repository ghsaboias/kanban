import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

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
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
          autoConnect: false,
        });

        // Refresh token prior to connecting
        const refreshAuth = async () => {
          try {
            const fresh = await getToken({ skipCache: true });
            if (!fresh) {
              throw new Error('Authentication token not available');
            }
            socket.auth = { token: fresh } as any;
          } catch (e: any) {
            throw e;
          }
        };

        socket.on('connect', () => {
          console.log('Connected to server');
          setIsConnected(true);
          setSocketId(socket.id ?? null);
          setError(null);
        });

        socket.on('disconnect', () => {
          console.log('Disconnected from server');
          setIsConnected(false);
          setSocketId(null);
        });

        // If the server rejects the auth (expired/invalid), refresh token and retry once
        socket.on('connect_error', async (err: any) => {
          console.error('Connection error:', err?.message);
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
          } catch (e) {
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

  const joinBoard = (boardId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join:board', boardId);
    }
  };

  const leaveBoard = (boardId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave:board', boardId);
    }
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

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
