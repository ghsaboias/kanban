import { createContext } from 'react';

export interface SocketContextType {
  isConnected: boolean;
  socketId: string | null;
  error: string | null;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => (() => void) | void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
  emit: (event: string, data?: unknown) => void;
}

export const SocketContext = createContext<SocketContextType | null>(null);