import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ActivityFeed } from './ActivityFeed';
import { Board, type BoardData } from './Board';
import { useApi } from '../useApi';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
import type { Activity, ActivityFeedData, ApiResponse } from '../types/api';
import { useTheme } from '../theme/ThemeProvider';

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useApi();
  const { theme } = useTheme();

  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [initialActivities, setInitialActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setLoading(true);
      setError(null);
      try {
        // Fetch board and activities in parallel
        const [boardRes, activitiesRes] = await Promise.all([
          apiFetch(`/api/boards/${id}`),
          apiFetch(`/api/boards/${id}/activities?page=1&limit=50`) // Fetch more initially
        ]);

        const boardResult: ApiResponse<BoardData> = await boardRes.json();
        const activitiesResult: ApiResponse<ActivityFeedData> = await activitiesRes.json();

        if (boardResult.success) {
          setBoard(boardResult.data);
        } else {
          throw new Error(boardResult.error || 'Failed to load board');
        }

        if (activitiesResult.success) {
          setInitialActivities(activitiesResult.data.activities);
        } else {
          // Non-fatal, the board can still render
          console.error('Failed to load initial activities');
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError('Error connecting to API: ' + msg);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id, apiFetch]);
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
        padding: '10px 20px',
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
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s'
          }}
        >
          <span>📊</span>
          {showActivityFeed ? 'Fechar Atividades' : 'Ver Atividades'}
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Board Area */}
        <div style={{ flex: showActivityFeed ? '1 1 70%' : '1 1 100%', overflow: 'hidden', transition: 'flex 0.3s ease' }}>
          <Board 
            board={board} 
            setBoard={setBoard} 
            isConnected={isConnected} 
            onlineUsers={onlineUsers} 
          />
        </div>

        {/* Activity Feed Sidebar */}
        {showActivityFeed && (
          <div style={{
            width: '400px',
            flexShrink: 0,
            backgroundColor: 'white',
            borderLeft: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <ActivityFeed
              activities={activities}
              boardTitle={board.title}
              isLoading={false} // Loading is handled by the page
            />
          </div>
        )}
      </div>
    </div>
  )
}
