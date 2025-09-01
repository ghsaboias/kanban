import React, { type ReactNode, useContext } from 'react';
import { useSocket } from '../hooks/useSocket';
import { SocketContext, type SocketContextType } from './SocketContextType';

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

