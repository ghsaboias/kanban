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
    const initializeSocket = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError('Authentication token not available');
          return;
        }

        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
          auth: {
            token,
          },
        });

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

        socket.on('connect_error', (error) => {
          console.error('Connection error:', error.message);
          setError(error.message);
          setIsConnected(false);
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        setError('Failed to connect to server');
      }
    };

    initializeSocket();

    return () => {
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
