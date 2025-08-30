import React, { createContext, useContext, type ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';

interface SocketContextType {
  isConnected: boolean;
  socketId: string | null;
  error: string | null;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  emit: (event: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const socket = useSocket();

  return (
    <SocketContext.Provider value={socket as unknown as SocketContextType}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};
