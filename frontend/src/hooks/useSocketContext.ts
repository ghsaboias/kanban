import { useContext } from 'react';
import { SocketContext, SocketContextType } from '../contexts/SocketContextType';

export const useSocketContext = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};