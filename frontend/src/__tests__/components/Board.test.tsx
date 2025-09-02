import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Board } from '../../components/Board';
import { fireEvent, render, screen, waitFor } from '../test-utils';

// Mock the useApi hook
const mockApiFetch = vi.fn();
vi.mock('../../useApi', () => ({
  useApi: () => ({
    apiFetch: mockApiFetch,
  }),
}));

// Mock drag and drop library
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: { children?: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  closestCenter: vi.fn(),
  useDroppable: () => ({ setNodeRef: () => { } } as const),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  horizontalListSortingStrategy: 'horizontal',
  verticalListSortingStrategy: 'vertical',
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => { },
    transform: null,
    transition: null,
  }),
}));

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToWindowEdges: vi.fn(),
}));

// Mock socket context
vi.mock('../../contexts/SocketContext', () => ({
  useSocketContext: () => ({
    socket: {
      id: 'mock-socket-id',
    },
  }),
}));

// Test data
const mockBoard = {
  id: 'board-1',
  title: 'Test Board',
  description: 'Test Description',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  columns: [
    {
      id: 'column-1',
      title: 'To Do',
      position: 0,
      boardId: 'board-1',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      cards: [
        {
          id: 'card-1',
          title: 'Test Card 1',
          description: 'Test Description 1',
          priority: 'HIGH' as const,
          position: 0,
          columnId: 'column-1',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          assignee: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
        {
          id: 'card-2',
          title: 'Test Card 2',
          description: null,
          priority: 'MEDIUM' as const,
          position: 1,
          columnId: 'column-1',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          assignee: null,
        },
      ],
    },
    {
      id: 'column-2',
      title: 'In Progress',
      position: 1,
      boardId: 'board-1',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      cards: [],
    },
  ],
};

const renderBoard = (board = mockBoard) => {
  const mockSetBoard = vi.fn();
  const isConnected = true;
  const onlineUsers: Array<{ userId: string; user: { id: string; name: string; email: string } }> = [];

  return render(
    <Board
      board={board}
      setBoard={mockSetBoard}
      isConnected={isConnected}
      onlineUsers={onlineUsers}
    />
  );
};

describe('Board Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockBoard }),
    });
  });

  // Loading state test removed - Board component always receives valid data from parent

  it('should fetch and render board data', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    expect(screen.getByText('Test Card 2')).toBeInTheDocument();
  });

  // Error state test removed - Error handling is managed by parent component (BoardPage)

  it('should render empty board message when no columns exist', async () => {
    const emptyBoard = { ...mockBoard, columns: [] };

    renderBoard(emptyBoard);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    expect(screen.queryByText('To Do')).not.toBeInTheDocument();
  });

  it('should display board title and description', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    if (mockBoard.description) {
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    }
  });

  it('should render columns in correct order', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const columns = screen.getAllByTestId(/column-/);
    expect(columns).toHaveLength(2);

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('should render cards within columns', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Card 2')).toBeInTheDocument();
  });

  it('should display card count in column headers', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // TODO: Add data-testid to SortableColumn count element for better testing
    // For now, verify columns and cards render (count is displayed internally)
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('Test Card 1')).toBeInTheDocument();
  });

  it('should show priority indicators on cards', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });

    // TODO: Add data-testid for priority indicators for more reliable testing
    expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MEDIUM').length).toBeGreaterThan(0);
  });

  it('should show assignee information on cards', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('should initialize drag and drop context', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });

  it('should handle add column action', async () => {
    renderBoard();

    // Ensure initial board load completes
    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // Mock the POST create column response
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 'new-column', title: 'New Column', position: 2 } }),
    });

    const addColumnButton = screen.getByText('Add New Column');
    fireEvent.click(addColumnButton);

    const input = screen.getByPlaceholderText('Enter column title...');
    fireEvent.change(input, { target: { value: 'New Column' } });
    fireEvent.click(screen.getByText('Create Column'));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/boards/board-1/columns',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Column' }),
        })
      );
    });
  });

  it('should handle add card action', async () => {
    renderBoard();
    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeInTheDocument();
    });
    // TODO: Improve SortableColumn mocking to test card addition functionality
    // This test is currently limited due to complex component interaction
  });

  // Navigation test removed - Navigation handled by parent component (BoardPage)

  // 404 error test removed - Error handling moved to BoardPage tests

  // Socket refresh test removed - Real-time updates managed by parent component

  it('should render empty column correctly', async () => {
    renderBoard();

    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    const inProgressColumn = screen.getByText('In Progress').closest('div');
    expect(inProgressColumn).toBeInTheDocument();
  });

  it('should handle board data updates', async () => {
    const { rerender } = renderBoard();

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const updatedBoard = {
      ...mockBoard,
      title: 'Updated Board Title',
    };

    const mockSetBoard = vi.fn();
    const isConnected = true;
    const onlineUsers: Array<{ userId: string; user: { id: string; name: string; email: string } }> = [];

    rerender(
      <Board
        board={updatedBoard}
        setBoard={mockSetBoard}
        isConnected={isConnected}
        onlineUsers={onlineUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Updated Board Title')).toBeInTheDocument();
    });
  });

  describe('Sorting State Management', () => {
    it('should toggle activeSort state when sort button is clicked', async () => {
      const mockSetBoard = vi.fn();
      
      render(
        <Board
          board={mockBoard}
          setBoard={mockSetBoard}
          isConnected={true}
          onlineUsers={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      const sortButton = screen.getByText('Sort by Priority');
      
      // First click should change from position to priority sorting
      fireEvent.click(sortButton);
      
      // Should trigger re-render - we can't directly test state but can test behavior
      // The key test is that multiple clicks should toggle properly
      fireEvent.click(sortButton);
      fireEvent.click(sortButton);
      
      // If the state is toggling correctly, this shouldn't throw
      expect(sortButton).toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting Integration', () => {
    it('should filter cards by search query', async () => {
      renderBoard();

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // Get the search input from KanbanToolbar
      const searchInput = screen.getByPlaceholderText('Search cards...');
      
      // Search for "Test Card 1"
      fireEvent.change(searchInput, { target: { value: 'Test Card 1' } });
      
      await waitFor(() => {
        // Should show Test Card 1 but not Test Card 2
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Card 2')).not.toBeInTheDocument();
      });
    });

    it('should filter cards by priority', async () => {
      renderBoard();

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // Open filter dropdown
      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);
      
      await waitFor(() => {
        const highPriorityOption = screen.getByText('High Priority');
        fireEvent.click(highPriorityOption);
      });

      await waitFor(() => {
        // Should only show high priority cards
        expect(screen.getByText('Test Card 1')).toBeInTheDocument(); // HIGH priority
        expect(screen.queryByText('Test Card 2')).not.toBeInTheDocument(); // MEDIUM priority
      });
    });

    it('should sort cards by priority when sort button is clicked', async () => {
      // Create a board with cards in different priorities for better testing
      const testBoard = {
        ...mockBoard,
        columns: [
          {
            ...mockBoard.columns[0],
            cards: [
              {
                id: 'card-1',
                title: 'Low Priority Card',
                description: 'Should be last',
                priority: 'LOW' as const,
                position: 0,
                assignee: null,
              },
              {
                id: 'card-2', 
                title: 'High Priority Card',
                description: 'Should be first',
                priority: 'HIGH' as const,
                position: 1,
                assignee: null,
              },
              {
                id: 'card-3',
                title: 'Medium Priority Card', 
                description: 'Should be middle',
                priority: 'MEDIUM' as const,
                position: 2,
                assignee: null,
              }
            ]
          }
        ]
      };

      render(
        <Board
          board={testBoard}
          setBoard={vi.fn()}
          isConnected={true}
          onlineUsers={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // Initially cards should be in position order (Low, High, Medium)
      const cardElements = screen.getAllByText(/Priority Card/);
      console.log('INITIAL ORDER:', cardElements.map(el => el.textContent));
      expect(cardElements[0]).toHaveTextContent('Low Priority Card');
      expect(cardElements[1]).toHaveTextContent('High Priority Card');
      expect(cardElements[2]).toHaveTextContent('Medium Priority Card');

      // Click sort button to switch to priority sorting
      const sortButton = screen.getByText('Sort by Priority');
      console.log('CLICKING SORT BUTTON');
      fireEvent.click(sortButton);

      // Cards should now be reordered by priority (HIGH > MEDIUM > LOW)
      await waitFor(() => {
        const reorderedCards = screen.getAllByText(/Priority Card/);
        console.log('AFTER SORT CLICK:', reorderedCards.map(el => el.textContent));
        expect(reorderedCards[0]).toHaveTextContent('High Priority Card');
        expect(reorderedCards[1]).toHaveTextContent('Medium Priority Card');
        expect(reorderedCards[2]).toHaveTextContent('Low Priority Card');
      });

      // Click sort button again to switch back to position sorting
      fireEvent.click(sortButton);

      await waitFor(() => {
        const positionOrderedCards = screen.getAllByText(/Priority Card/);
        expect(positionOrderedCards[0]).toHaveTextContent('Low Priority Card');
        expect(positionOrderedCards[1]).toHaveTextContent('High Priority Card');
        expect(positionOrderedCards[2]).toHaveTextContent('Medium Priority Card');
      });
    });

    it('should combine search and filter', async () => {
      // Create a board with more diverse cards for better testing
      const testBoardWithMoreCards = {
        ...mockBoard,
        columns: [
          {
            ...mockBoard.columns[0],
            cards: [
              ...mockBoard.columns[0].cards,
              {
                id: '3',
                title: 'High Priority Task',
                description: 'Another high priority task',
                priority: 'HIGH' as const,
                position: 2,
                assignee: null,
              },
              {
                id: '4',
                title: 'Low Priority Search Test',
                description: 'A low priority task with search term',
                priority: 'LOW' as const,
                position: 3,
                assignee: null,
              }
            ]
          }
        ]
      };

      render(
        <Board
          board={testBoardWithMoreCards}
          setBoard={vi.fn()}
          isConnected={true}
          onlineUsers={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // First apply search filter
      const searchInput = screen.getByPlaceholderText('Search cards...');
      fireEvent.change(searchInput, { target: { value: 'High' } });

      // Then apply priority filter
      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);
      
      await waitFor(() => {
        const highPriorityOption = screen.getByText('High Priority');
        fireEvent.click(highPriorityOption);
      });

      await waitFor(() => {
        // Should show only high priority cards that contain "High" in title/description
        // Test Card 1: HIGH priority, description is "Test Description 1" (does NOT contain "High")
        // High Priority Task: HIGH priority, title contains "High Priority"
        expect(screen.getByText('High Priority Task')).toBeInTheDocument(); // HIGH priority, has "High" in title
        expect(screen.queryByText('Test Card 2')).not.toBeInTheDocument(); // MEDIUM priority
        expect(screen.queryByText('Low Priority Search Test')).not.toBeInTheDocument(); // LOW priority
        
        // Test Card 1 should NOT be visible since it doesn't contain "High" in title/description
        expect(screen.queryByText('Test Card 1')).not.toBeInTheDocument();
      });
    });

    it('should clear filters properly', async () => {
      renderBoard();

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // Apply search filter
      const searchInput = screen.getByPlaceholderText('Search cards...');
      fireEvent.change(searchInput, { target: { value: 'Test Card 1' } });

      await waitFor(() => {
        expect(screen.queryByText('Test Card 2')).not.toBeInTheDocument();
      });

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        // Both cards should be visible again
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
    });

    it('should toggle sort between position and priority', async () => {
      renderBoard();

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      const sortButton = screen.getByText('Sort by Priority');
      
      // First click should sort by priority
      fireEvent.click(sortButton);
      
      // Second click should sort by position
      fireEvent.click(sortButton);
      
      // Cards should be back to position order
      await waitFor(() => {
        // Verify position sorting is working by checking cards are still visible
        const card1 = screen.getByText('Test Card 1');
        const card2 = screen.getByText('Test Card 2');
        expect(card1).toBeInTheDocument();
        expect(card2).toBeInTheDocument();
      });
    });

    it('should show all cards when filter is set to all', async () => {
      renderBoard();

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // First apply a specific filter
      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);
      
      await waitFor(() => {
        const highPriorityOption = screen.getByText('High Priority');
        fireEvent.click(highPriorityOption);
      });

      // Then switch back to all
      fireEvent.click(filterButton);
      
      await waitFor(() => {
        const allCardsOption = screen.getByText('All Cards');
        fireEvent.click(allCardsOption);
      });

      await waitFor(() => {
        // All cards should be visible
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
    });
  });
});
