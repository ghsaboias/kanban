import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Board } from '../../components/Board';

let mockedBoardData: any = null;

// Mock all dependencies to isolate performance testing
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: any }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: () => <div data-testid="drag-overlay" />,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: any }) => <div data-testid="sortable-context">{children}</div>,
  horizontalListSortingStrategy: 'horizontal',
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
  useApi: () => {
    const mockApiFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockedBoardData })
    });
    // Set up the apiFetch property for compatibility
    const m: any = mockApiFetch;
    m.apiFetch = mockApiFetch;
    return m;
  },
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
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(<Board boardId="board-1" />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Small board render time: ${renderTime.toFixed(2)}ms`);
    
    // Should render quickly (under 50ms for small boards)
    expect(renderTime).toBeLessThan(50);
    
    // Verify content is rendered
    expect(screen.getByText('Test Board')).toBeInTheDocument();
    expect(screen.getAllByTestId('sortable-context')).toHaveLength(3); // 3 columns
  });

  it('should render medium board (5 columns, 10 cards each) within performance threshold', () => {
    const board = generateBoard(5, 10);
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(<Board boardId="board-1" />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Medium board render time: ${renderTime.toFixed(2)}ms`);
    
    // Should render reasonably fast (under 100ms for medium boards)
    expect(renderTime).toBeLessThan(100);
    
    // Verify content is rendered
    expect(screen.getByText('Test Board')).toBeInTheDocument();
  });

  it('should render large board (10 columns, 20 cards each) within performance threshold', () => {
    const board = generateBoard(10, 20);
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(<Board boardId="board-1" />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Large board render time: ${renderTime.toFixed(2)}ms`);
    
    // Should render within acceptable time (under 200ms for large boards)
    expect(renderTime).toBeLessThan(200);
    
    // Verify content is rendered
    expect(screen.getByText('Test Board')).toBeInTheDocument();
  });

  it('should handle very large dataset (15 columns, 50 cards each) gracefully', () => {
    const board = generateBoard(15, 50);
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(<Board boardId="board-1" />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Very large board render time: ${renderTime.toFixed(2)}ms`);
    
    // Should render within reasonable time even for very large datasets (under 500ms)
    expect(renderTime).toBeLessThan(500);
    
    // Verify content is rendered
    expect(screen.getByText('Test Board')).toBeInTheDocument();
  });

  it('should maintain performance with multiple re-renders', () => {
    const board = generateBoard(5, 10);
    
    const renderTimes: number[] = [];
    
    // Perform multiple renders to test consistency
    for (let i = 0; i < 5; i++) {
      mockedBoardData = board;
      const { unmount } = render(<Board boardId="board-1" />);
      
      const startTime = performance.now();
      mockedBoardData = board;
      render(<Board boardId="board-1" />);
      const endTime = performance.now();
      
      renderTimes.push(endTime - startTime);
      unmount();
    }
    
    const averageTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    const maxTime = Math.max(...renderTimes);
    
    console.log(`Average render time: ${averageTime.toFixed(2)}ms`);
    console.log(`Max render time: ${maxTime.toFixed(2)}ms`);
    console.log(`Render times: ${renderTimes.map(t => t.toFixed(2)).join(', ')}ms`);
    
    // Average should be reasonable
    expect(averageTime).toBeLessThan(100);
    
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
    
    const startTime = performance.now();
    mockedBoardData = board;
    render(<Board boardId="board-1" />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    console.log(`Empty board render time: ${renderTime.toFixed(2)}ms`);
    
    // Empty board should render very quickly (under 20ms)
    expect(renderTime).toBeLessThan(20);
    
    expect(screen.getByText('Empty Board')).toBeInTheDocument();
  });
});
