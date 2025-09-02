import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Suspense, lazy } from 'react';
const ActivityFeed = lazy(() => import('./ActivityFeed').then(m => ({ default: m.ActivityFeed })))
import { Board, type BoardData } from './Board';
import { useApi } from '../useApi';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
import type { Activity, ActivityFeedData, ApiResponse } from '../types/api';
import { useTheme } from '../theme/useTheme';
import { useAsyncOperation } from '../hooks/useAsyncOperation';

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useApi();
  const { theme } = useTheme();

  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [initialActivities, setInitialActivities] = useState<Activity[]>([]);
  
  // Use async operation hook for loading board data
  const {
    loading,
    error,
    execute: loadBoardData
  } = useAsyncOperation<{ board: BoardData; activities: Activity[] }>();

  // Real-time data hook
  const { isConnected, onlineUsers, activities } = useRealtimeBoard(
    id || '',
    board,
    initialActivities,
    setBoard
  );

  useEffect(() => {
    if (!id) return;

    const fetchInitialData = async () => {
      // Fetch board and activities in parallel
      const [boardRes, activitiesRes] = await Promise.all([
        apiFetch(`/api/boards/${id}`),
        apiFetch(`/api/boards/${id}/activities?page=1&limit=50`) // Fetch more initially
      ]);

      const boardResult: ApiResponse<BoardData> = await boardRes.json();
      const activitiesResult: ApiResponse<ActivityFeedData> = await activitiesRes.json();

      if (!boardResult.success) {
        throw new Error(boardResult.error || 'Failed to load board');
      }

      let activities: Activity[] = [];
      if (activitiesResult.success) {
        activities = activitiesResult.data.activities;
      } else {
        // Non-fatal, the board can still render
        console.error('Failed to load initial activities');
      }

      // Set the state after successful fetch
      setBoard(boardResult.data);
      setInitialActivities(activities);
      
      return { board: boardResult.data, activities };
    };

    loadBoardData(fetchInitialData);
  }, [id, apiFetch, loadBoardData]);
  if (!id) {
    return <div>Board ID not found</div>;
  }

  if (loading) {
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
        justifyContent: 'space-between',
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

        <button
          onClick={() => setShowActivityFeed(!showActivityFeed)}
          style={{
            backgroundColor: showActivityFeed ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: theme.radius?.sm || '6px',
            padding: `${theme.spacing?.sm || '8px'} ${theme.spacing?.md || '16px'}`,
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing?.sm || '6px',
            transition: 'background-color 0.2s',
            width: '180px',
            justifyContent: 'center'
          }}
        >
          <span>📊</span>
          {showActivityFeed ? 'Fechar Atividades' : 'Ver Atividades'}
        </button>
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
            isCompact={showActivityFeed}
          />
        </div>

        {/* Activity Feed Sidebar */}
        <div style={{
          width: showActivityFeed ? '400px' : '0px',
          flexShrink: 0,
          backgroundColor: 'white',
          borderLeft: showActivityFeed ? '1px solid #e5e7eb' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.3s ease'
        }}>
          <Suspense fallback={<div style={{ padding: (theme.spacing?.md || '12px') }}>Loading…</div>}>
            {showActivityFeed && (
              <ActivityFeed
                activities={activities}
                boardTitle={board.title}
                isLoading={false} // Loading is handled by the page
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  )
}
