import { useContext } from 'react';
import { SocketContext, type SocketContextType } from './SocketContextType';

export const useSocketContext = (): SocketContextType => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocketContext must be used within a SocketProvider');
    }
    return context;
};
