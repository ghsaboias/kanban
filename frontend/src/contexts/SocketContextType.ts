import { createContext } from 'react';

export interface SocketContextType {
  isConnected: boolean;
  socketId: string | null;
  error: string | null;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  on: <T = unknown>(event: string, callback: (event: T) => void) => (() => void) | void;
  off: <T = unknown>(event: string, callback?: (event: T) => void) => void;
  emit: (event: string, data?: unknown) => void;
}

export const SocketContext = createContext<SocketContextType | null>(null);