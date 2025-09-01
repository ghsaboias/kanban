// Shared real-time event type definitions between frontend and backend

// Base types
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Card {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  position: number;
  assignee: User | null;
}

export interface Column {
  id: string;
  title: string;
  position: number;
  cards: Card[];
}

export interface Activity {
  id: string
  entityType: 'BOARD' | 'COLUMN' | 'CARD'
  entityId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'REORDER' | 'ASSIGN' | 'UNASSIGN'
  boardId: string
  columnId?: string | null
  userId?: string | null
  user?: User | null
  meta: any
  createdAt: string
}

// Socket event payloads
export interface UserJoinedEvent {
  userId: string;
  user: User;
}

export interface UserLeftEvent {
  userId: string;
  user: User;
}

export interface BoardJoinedEvent {
  boardId: string;
  roster?: Array<{
    userId: string;
    user: User;
  }>;
}

export interface ErrorEvent {
  message: string;
}

// Card events
export interface CardCreatedEvent {
  boardId: string;
  card: Card;
  columnId: string;
}

export interface CardUpdatedEvent {
  boardId: string;
  card: Card;
}

export interface CardDeletedEvent {
  boardId: string;
  cardId: string;
}

export interface CardMovedEvent {
  boardId: string;
  card: Card;
  fromColumnId: string;
  toColumnId: string;
  position: number;
}

// Column events
export interface ColumnCreatedEvent {
  boardId: string;
  column: Column;
}

export interface ColumnUpdatedEvent {
  boardId: string;
  column: Column;
}

export interface ColumnDeletedEvent {
  boardId: string;
  columnId: string;
}

export interface ColumnReorderedEvent {
  boardId: string;
  column: Column;
}

export interface ActivityCreatedEvent {
  boardId: string;
  activity: Activity;
}

// Socket event map for type-safe emissions
export interface SocketEvents {
  // User presence events
  'user:joined': UserJoinedEvent;
  'user:left': UserLeftEvent;
  'board:joined': BoardJoinedEvent;
  'error': ErrorEvent;

  // Card events
  'card:created': CardCreatedEvent;
  'card:updated': CardUpdatedEvent;
  'card:deleted': CardDeletedEvent;
  'card:moved': CardMovedEvent;

  // Column events
  'column:created': ColumnCreatedEvent;
  'column:updated': ColumnUpdatedEvent;
  'column:deleted': ColumnDeletedEvent;
  'column:reordered': ColumnReorderedEvent;

  // Activity events
  'activity:created': ActivityCreatedEvent;
}

// Type-safe socket emit helper
export type SocketEmit = <K extends keyof SocketEvents>(
  event: K,
  data: SocketEvents[K]
) => void;

// Type-safe socket listener helper
export type SocketListener = <K extends keyof SocketEvents>(
  event: K,
  callback: (data: SocketEvents[K]) => void
) => void;