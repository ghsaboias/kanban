import React from 'react';
import { SocketErrorBoundary } from './SocketErrorBoundary';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';

interface Card {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  position: number;
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface ColumnData {
  id: string;
  title: string;
  position: number;
  cards: Card[];
}

interface BoardData {
  id: string;
  title: string;
  description: string | null;
  columns: ColumnData[];
}

interface RealtimeBoardWrapperProps {
  boardId: string;
  board: BoardData | null;
  setBoard: React.Dispatch<React.SetStateAction<BoardData | null>>;
  children: (realtimeData: {
    isConnected: boolean;
    onlineUsers: Array<{
      userId: string;
      user: {
        id: string;
        email: string;
        name: string;
      };
    }>;
  }) => React.ReactNode;
}

const RealtimeBoardContent: React.FC<RealtimeBoardWrapperProps> = ({ 
  boardId, 
  board, 
  setBoard, 
  children 
}) => {
  const realtimeData = useRealtimeBoard(boardId, board, setBoard);
  return <>{children(realtimeData)}</>;
};

export const RealtimeBoardWrapper: React.FC<RealtimeBoardWrapperProps> = (props) => {
  return (
    <SocketErrorBoundary
      maxRetries={3}
      onError={(error, _errorInfo) => {
        console.error('Real-time board connection error:', error);
        // You could send this to a logging service here
      }}
      fallback={(_error, retry) => (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          padding: '12px 16px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          maxWidth: '300px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ffc107'
            }} />
            <span style={{ fontSize: '14px', color: '#856404', fontWeight: 'bold' }}>
              Real-time Disconnected
            </span>
          </div>
          <p style={{ 
            fontSize: '12px', 
            color: '#856404', 
            margin: '4px 0 8px 0' 
          }}>
            Live updates unavailable. Your changes are still saved.
          </p>
          <button
            onClick={retry}
            style={{
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
          >
            Reconnect
          </button>
        </div>
      )}
    >
      <RealtimeBoardContent {...props} />
    </SocketErrorBoundary>
  );
};