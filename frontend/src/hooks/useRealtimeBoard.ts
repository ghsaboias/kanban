import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Activity,
  ActivityCreatedEvent,
  CardCreatedEvent,
  CardDeletedEvent,
  CardMovedEvent,
  CardUpdatedEvent,
  Column,
  ColumnCreatedEvent,
  ColumnDeletedEvent,
  ColumnReorderedEvent,
  ColumnUpdatedEvent, // 
  User,
  UserJoinedEvent,
  UserLeftEvent
} from '../../../shared/realtime';
import { useSocketContext } from '../contexts/SocketContext';

interface BoardData {
  id: string;
  title: string;
  description: string | null;
  columns: Column[];
}

export const useRealtimeBoard = (
  boardId: string,
  initialBoard: BoardData | null,
  initialActivities: Activity[],
  setBoard: React.Dispatch<React.SetStateAction<BoardData | null>>
) => {
  const { isConnected, joinBoard, leaveBoard, on, off } = useSocketContext();
  const [onlineUsers, setOnlineUsers] = useState<Array<{
    userId: string;
    user: User;
  }>>([]);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const mountedRef = useRef(true);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Join/leave board room and handle reconnection
  useEffect(() => {
    if (isConnected && boardId) {
      joinBoard(boardId);
      return () => {
        leaveBoard(boardId);
      }
    } else if (!isConnected) {
      // Clear online users when disconnected to avoid showing stale data
      setOnlineUsers([]);
    }
  }, [isConnected, boardId, joinBoard, leaveBoard]);

  // User presence event handlers (memoized to prevent unnecessary re-registering)
  const handleUserJoined = useCallback((event: UserJoinedEvent) => {
    if (!mountedRef.current) return;
    setOnlineUsers(prev => {
      const exists = prev.some(u => u.userId === event.userId);
      return exists ? prev : [...prev, { userId: event.userId, user: event.user }];
    });
  }, []);

  const handleUserLeft = useCallback((event: UserLeftEvent) => {
    if (!mountedRef.current) return;
    setOnlineUsers(prev => prev.filter(u => u.userId !== event.userId));
  }, []);

  const handleActivityCreated = useCallback((event: ActivityCreatedEvent) => {
    if (!mountedRef.current) return;
    if (event.boardId === boardId) {
      setActivities(prev => {
        if (prev.some(a => a.id === event.activity.id)) return prev;
        return [event.activity, ...prev];
      });
    }
  }, [boardId]);

  // Card event handlers (memoized to prevent unnecessary re-registering)
  const handleCardCreated = useCallback((event: CardCreatedEvent) => {
    if (!mountedRef.current) return;
    setBoard(prev => {
      if (!prev || !event.columnId) return prev;
      return {
        ...prev,
        columns: prev.columns.map(col => {
          if (col.id !== event.columnId) return col;
          // Dedupe: avoid double-adding the same card when we already applied an optimistic add
          const exists = col.cards.some(c => c.id === event.card.id);
          if (exists) return col;
          return { ...col, cards: [...col.cards, event.card] };
        })
      };
    });
  }, [setBoard]);

  const handleCardUpdated = useCallback((event: CardUpdatedEvent) => {
    if (!mountedRef.current) return;
    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card =>
            card.id === event.card.id ? event.card : card
          )
        }))
      };
    });
  }, [setBoard]);

  const handleCardMoved = useCallback((event: CardMovedEvent) => {
    if (!mountedRef.current) return;
    setBoard(prev => {
      if (!prev) return prev;

      // Use server-authoritative approach - trust the server's position data
      const newColumns = prev.columns.map(col => {
        if (col.id === event.fromColumnId) {
          // Remove card from source column and re-sort by position
          const filteredCards = col.cards.filter(c => c.id !== event.card.id);
          return {
            ...col,
            cards: filteredCards.sort((a, b) => a.position - b.position)
          };
        } else if (col.id === event.toColumnId) {
          // Add card to target column with server position and re-sort
          const existingCards = col.cards.filter(c => c.id !== event.card.id);
          const updatedCards = [...existingCards, event.card];

          // Detect potential position conflicts
          const positionCounts = new Map();
          updatedCards.forEach(card => {
            positionCounts.set(card.position, (positionCounts.get(card.position) || 0) + 1);
          });

          const hasConflicts = Array.from(positionCounts.values()).some(count => count > 1);
          if (hasConflicts) {
            console.warn(`Position conflicts detected in column ${col.id}, relying on server state`);
          }

          return {
            ...col,
            cards: updatedCards.sort((a, b) => a.position - b.position)
          };
        }
        return col;
      });

      return { ...prev, columns: newColumns };
    });
  }, [setBoard]);

  const handleCardDeleted = useCallback((event: CardDeletedEvent) => {
    if (!mountedRef.current) return;
    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(card => card.id !== event.cardId)
        }))
      };
    });
  }, [setBoard]);

  // Column event handlers (memoized to prevent unnecessary re-registering)
  const handleColumnCreated = useCallback((event: ColumnCreatedEvent) => {
    if (!mountedRef.current) return;
    setBoard(prev => {
      if (!prev) return prev;
      // Dedupe: avoid double-adding the same column when we already applied an optimistic add
      const exists = prev.columns.some(c => c.id === event.column.id);
      if (exists) return prev;
      return {
        ...prev,
        columns: [...prev.columns, { ...event.column, cards: [] }]
      };
    });
  }, [setBoard]);

  const handleColumnUpdated = useCallback((event: ColumnUpdatedEvent) => {
    if (!mountedRef.current) return;
    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map(col =>
          col.id === event.column.id
            ? { ...col, title: event.column.title, position: event.column.position }
            : col
        )
      };
    });
  }, [setBoard]);

  const handleColumnReordered = useCallback((event: ColumnReorderedEvent) => {
    if (!mountedRef.current) return;
    setBoard(prev => {
      if (!prev) return prev;
      const reordered = [...prev.columns];
      const columnIndex = reordered.findIndex(c => c.id === event.column.id);
      if (columnIndex >= 0) {
        reordered[columnIndex] = { ...reordered[columnIndex], position: event.column.position };
        reordered.sort((a, b) => a.position - b.position);
      }
      return { ...prev, columns: reordered };
    });
  }, [setBoard]);

  const handleColumnDeleted = useCallback((event: ColumnDeletedEvent) => {
    if (!mountedRef.current) return;
    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.filter(col => col.id !== event.columnId)
      };
    });
  }, [setBoard]);

  // Board joined event handler (for receiving current roster)
  const handleBoardJoined = useCallback((event: { boardId: string; roster?: Array<{ userId: string; user: User }> }) => {
    if (!mountedRef.current) return;
    if (event.roster) {
      setOnlineUsers(event.roster);
    }
  }, []);

  // Handle real-time events
  useEffect(() => {
    if (!isConnected || !mountedRef.current) return;

    // Register event listeners
    on('board:joined', handleBoardJoined);
    on('user:joined', handleUserJoined);
    on('user:left', handleUserLeft);
    on('card:created', handleCardCreated);
    on('card:updated', handleCardUpdated);
    on('card:moved', handleCardMoved);
    on('card:deleted', handleCardDeleted);
    on('column:created', handleColumnCreated);
    on('column:updated', handleColumnUpdated);
    on('column:reordered', handleColumnReordered);
    on('column:deleted', handleColumnDeleted);
    on('activity:created', handleActivityCreated);

    // Cleanup
    return () => {
      // Check if still mounted to avoid cleanup race conditions
      if (!mountedRef.current) return;

      off('board:joined', handleBoardJoined);
      off('user:joined', handleUserJoined);
      off('user:left', handleUserLeft);
      off('card:created', handleCardCreated);
      off('card:updated', handleCardUpdated);
      off('card:moved', handleCardMoved);
      off('card:deleted', handleCardDeleted);
      off('column:created', handleColumnCreated);
      off('column:updated', handleColumnUpdated);
      off('column:reordered', handleColumnReordered);
      off('column:deleted', handleColumnDeleted);
      off('activity:created', handleActivityCreated);
    };
  }, [
    isConnected,
    on,
    off,
    handleBoardJoined,
    handleUserJoined,
    handleUserLeft,
    handleCardCreated,
    handleCardUpdated,
    handleCardMoved,
    handleCardDeleted,
    handleColumnCreated,
    handleColumnUpdated,
    handleColumnReordered,
    handleColumnDeleted,
    handleActivityCreated
  ]);

  return {
    isConnected,
    onlineUsers,
    activities,
  };
};
