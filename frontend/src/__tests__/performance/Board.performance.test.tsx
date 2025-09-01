import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Board } from '../../components/Board';

interface MockBoardData {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  columns: Array<{
    id: string;
    title: string;
    position: number;
    boardId: string;
    createdAt: string;
    updatedAt: string;
    cards: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
      position: number;
      columnId: string;
      assigneeId: string | null;
      createdById: string;
      createdAt: string;
      updatedAt: string;
      assignee: { id: string; name: string; email: string } | null;
      createdBy: { id: string; name: string; email: string };
    }>;
  }>;
}

let mockedBoardData: MockBoardData | null = null;

// Mock all dependencies to isolate performance testing
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: () => <div data-testid="drag-overlay" />,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  closestCenter: vi.fn(),
  useDroppable: () => ({ setNodeRef: () => {} }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  horizontalListSortingStrategy: 'horizontal',
  verticalListSortingStrategy: 'vertical',
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: (array: unknown[], oldIndex: number, newIndex: number): unknown[] => {
    const result = [...array];
    const [removed] = result.splice(oldIndex, 1);
    result.splice(newIndex, 0, removed);
    return result;
  },
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

vi.mock('../../contexts/SocketContext', () => ({
  useSocketContext: () => ({
    isConnected: true,
    socketId: 'test-socket',
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }),
}));

vi.mock('../../hooks/useRealtimeBoard', () => ({
  useRealtimeBoard: () => ({
    board: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../useApi', () => ({
  useApi: () => ({
    apiFetch: vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockedBoardData })
    })
  }),
}));

// Generate test data
const generateCards = (count: number, columnId: string) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i}`,
    title: `Card ${i + 1}`,
    description: `Description for card ${i + 1}`,
    priority: 'MEDIUM' as const,
    position: i,
    columnId,
    assigneeId: null,
    createdById: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignee: null,
    createdBy: { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
  }));
};

const generateColumns = (count: number, cardsPerColumn: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `column-${i}`,
    title: `Column ${i + 1}`,
    position: i,
    boardId: 'board-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cards: generateCards(cardsPerColumn, `column-${i}`),
  }));
};

const generateBoard = (columnCount: number, cardsPerColumn: number) => ({
  id: 'board-1',
  title: 'Test Board',
  description: 'Performance test board',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  columns: generateColumns(columnCount, cardsPerColumn),
});

describe('Board Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render small board (3 columns, 5 cards each) within performance threshold', () => {
    const board = generateBoard(3, 5);
    const mockSetBoard = vi.fn();
    const isConnected = true;
    const onlineUsers: Array<{ userId: string; user: { id: string; name: string; email: string } }> = [];
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(
      <Board 
        board={board} 
        setBoard={mockSetBoard} 
        isConnected={isConnected} 
        onlineUsers={onlineUsers} 
      />
    );
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Small board render time: ${renderTime.toFixed(2)}ms`);
    
    // Should render quickly (under 700ms for small boards in test environment)
    expect(renderTime).toBeLessThan(700);
    
    // Verify content is rendered
    expect(screen.getByText('Test Board')).toBeInTheDocument();
    // Note: There may be additional sortable contexts for cards within columns
    expect(screen.getAllByTestId('sortable-context').length).toBeGreaterThanOrEqual(3);
  });

  it('should render medium board (5 columns, 10 cards each) within performance threshold', () => {
    const board = generateBoard(5, 10);
    const mockSetBoard = vi.fn();
    const isConnected = true;
    const onlineUsers: Array<{ userId: string; user: { id: string; name: string; email: string } }> = [];
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(
      <Board 
        board={board} 
        setBoard={mockSetBoard} 
        isConnected={isConnected} 
        onlineUsers={onlineUsers} 
      />
    );
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Medium board render time: ${renderTime.toFixed(2)}ms`);
    
    // Should render reasonably fast (under 750ms for medium boards in test environment)
    expect(renderTime).toBeLessThan(750);
    
    // Verify content is rendered
    expect(screen.getByText('Test Board')).toBeInTheDocument();
  });

  it('should render large board (10 columns, 20 cards each) within performance threshold', () => {
    const board = generateBoard(10, 20);
    const mockSetBoard = vi.fn();
    const isConnected = true;
    const onlineUsers: Array<{ userId: string; user: { id: string; name: string; email: string } }> = [];
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(
      <Board 
        board={board} 
        setBoard={mockSetBoard} 
        isConnected={isConnected} 
        onlineUsers={onlineUsers} 
      />
    );
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Large board render time: ${renderTime.toFixed(2)}ms`);
    
    // Should render within acceptable time (under 2500ms for large boards in test environment)
    expect(renderTime).toBeLessThan(2500);
    
    // Verify content is rendered
    expect(screen.getByText('Test Board')).toBeInTheDocument();
  });

  it('should handle very large dataset (15 columns, 50 cards each) gracefully', () => {
    const board = generateBoard(15, 50);
    const mockSetBoard = vi.fn();
    const isConnected = true;
    const onlineUsers: Array<{ userId: string; user: { id: string; name: string; email: string } }> = [];
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(
      <Board 
        board={board} 
        setBoard={mockSetBoard} 
        isConnected={isConnected} 
        onlineUsers={onlineUsers} 
      />
    );
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Very large board render time: ${renderTime.toFixed(2)}ms`);
    
    // Should render within reasonable time even for very large datasets (under 3000ms in test environment)
    expect(renderTime).toBeLessThan(3000);
    
    // Verify content is rendered
    expect(screen.getByText('Test Board')).toBeInTheDocument();
  });

  it('should maintain performance with multiple re-renders', () => {
    const board = generateBoard(5, 10);
    const mockSetBoard = vi.fn();
    const isConnected = true;
    const onlineUsers: Array<{ userId: string; user: { id: string; name: string; email: string } }> = [];
    
    const renderTimes: number[] = [];
    
    // Perform multiple renders to test consistency
    for (let i = 0; i < 5; i++) {
      mockedBoardData = board;
      const { unmount } = render(
        <Board 
          board={board} 
          setBoard={mockSetBoard} 
          isConnected={isConnected} 
          onlineUsers={onlineUsers} 
        />
      );
      
      const startTime = performance.now();
      mockedBoardData = board;
      render(
        <Board 
          board={board} 
          setBoard={mockSetBoard} 
          isConnected={isConnected} 
          onlineUsers={onlineUsers} 
        />
      );
      const endTime = performance.now();
      
      renderTimes.push(endTime - startTime);
      unmount();
    }
    
    const averageTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    const maxTime = Math.max(...renderTimes);
    
    console.log(`Average render time: ${averageTime.toFixed(2)}ms`);
    console.log(`Max render time: ${maxTime.toFixed(2)}ms`);
    console.log(`Render times: ${renderTimes.map(t => t.toFixed(2)).join(', ')}ms`);
    
    // Average should be reasonable (under 200ms in test environment)
    expect(averageTime).toBeLessThan(200);
    
    // No single render should be excessively slow
    expect(maxTime).toBeLessThan(150);
    
    // Performance should be consistent (max shouldn't be more than 3x average)
    expect(maxTime).toBeLessThan(averageTime * 3);
  });

  it('should handle empty board efficiently', () => {
    const board = {
      id: 'empty-board',
      title: 'Empty Board',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columns: [],
    };
    
    const mockSetBoard = vi.fn();
    const isConnected = true;
    const onlineUsers: Array<{ userId: string; user: { id: string; name: string; email: string } }> = [];
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(
      <Board 
        board={board} 
        setBoard={mockSetBoard} 
        isConnected={isConnected} 
        onlineUsers={onlineUsers} 
      />
    );
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Empty board render time: ${renderTime.toFixed(2)}ms`);
    
    // Empty board should render very quickly (under 50ms, allowing for test environment overhead)
    expect(renderTime).toBeLessThan(50);
    
    expect(screen.getByText('Empty Board')).toBeInTheDocument();
  });
});
