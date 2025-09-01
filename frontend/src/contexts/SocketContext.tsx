import React, { type ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import type { SocketContextType } from './SocketContextType';
import { SocketContext } from './SocketContextType';

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

