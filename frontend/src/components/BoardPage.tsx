import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppearance } from '../appearance';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
import type { ApiResponse } from '../types/api';
import { useApi } from '../useApi';
import { Board, type BoardData } from './Board';

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useApi();
  const { theme } = useAppearance();

  const [board, setBoard] = useState<BoardData | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Use async operation hook for loading board data
  const {
    loading,
    error,
    execute: loadBoardData
  } = useAsyncOperation<BoardData>();

  // Real-time data hook
  const { isConnected, onlineUsers } = useRealtimeBoard(
    id || '',
    board,
    [],
    setBoard
  );



  useEffect(() => {
    if (!id) return;

    const fetchInitialData = async () => {
      const boardRes = await apiFetch(`/api/boards/${id}`);
      const boardResult: ApiResponse<BoardData> = await boardRes.json();

      if (!boardResult.success) {
        throw new Error(boardResult.error || 'Failed to load board');
      }

      // Set the state after successful fetch
      setBoard(boardResult.data);
      setHasLoaded(true);

      return boardResult.data;
    };

    loadBoardData(fetchInitialData);
  }, [id, apiFetch, loadBoardData]);
  if (!id) {
    return <div>Board ID not found</div>;
  }

  if (loading && !hasLoaded) {
    return <div>Loading board...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!board) {
    return <div>Board not found</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: `${theme.spacing?.sm || '10px'} ${theme.spacing?.lg || '20px'}`,
        backgroundColor: theme.surfaceAlt,
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <Link
          to="/"
          style={{
            color: theme.accent,
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          ← Back to Boards
        </Link>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Board Area */}
        <div style={{ flex: '1', minWidth: '0', overflow: 'hidden' }}>
          <Board
            board={board}
            setBoard={setBoard}
            isConnected={isConnected}
            onlineUsers={onlineUsers}
            isCompact={false}
          />
        </div>
      </div>
    </div>
  )
}
