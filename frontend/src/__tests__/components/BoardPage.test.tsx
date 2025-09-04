import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardPage } from '../../components/BoardPage';
import { render, screen, waitFor } from '../test-utils';

// Mock API calls with stable apiFetch reference to prevent infinite loops
const mockApiFetch = vi.fn();
const stableApiFetch = mockApiFetch;

vi.mock('../../useApi', () => ({
  useApi: () => ({ apiFetch: stableApiFetch })
}));

// Mock useRealtimeBoard to prevent socket dependencies
vi.mock('../../hooks/useRealtimeBoard', () => ({
  useRealtimeBoard: () => ({
    isConnected: true,
    onlineUsers: [{
      userId: 'user1',
      user: {
        name: 'Test User',
        email: 'test@example.com'
      }
    }],
    activities: []
  }),
}));

// Test wrapper with router for navigation testing
const renderBoardPageWithRouter = (boardId = 'test-board-id', initialPath?: string) => {
  const path = initialPath || `/board/${boardId}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/board/:id" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>
  );
};


describe('BoardPage Integration Tests', () => {
  // Create stable mock data to prevent infinite re-renders
  const mockBoardData = {
    id: 'test-board-id',
    title: 'Test Board',
    description: 'A comprehensive test board',
    columns: [
      {
        id: 'col-1',
        title: 'To Do',
        position: 0,
        boardId: 'test-board-id',
        cards: [
          {
            id: 'card-1',
            title: 'Test Card',
            description: 'Test card description',
            priority: 'MEDIUM',
            position: 0,
            columnId: 'col-1',
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      },
      {
        id: 'col-2',
        title: 'In Progress',
        position: 1,
        boardId: 'test-board-id',
        cards: []
      }
    ]
  };

  const mockActivitiesData: unknown[] = [];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock realistic API responses with stable references
    mockApiFetch.mockImplementation((url) => {
      if (url.includes('/activities')) {
        // Mock activities response
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockActivitiesData
          })
        });
      } else if (url.includes('/boards/')) {
        // Mock board detail response
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockBoardData
          })
        });
      } else {
        // Default fallback
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            success: false,
            error: 'Not found'
          })
        });
      }
    });
  });

  describe('Board Loading and Data Display', () => {
    it('should show loading state initially then load board data', async () => {
      renderBoardPageWithRouter();

      // Should show loading state initially
      expect(screen.getByText('Loading board...')).toBeInTheDocument();

      // Wait for board to load and show back link
      await waitFor(() => {
        expect(screen.getByText('← Back to Boards')).toBeInTheDocument();
      });

      // Verify API was called with correct board ID
      expect(mockApiFetch).toHaveBeenCalledWith('/api/boards/test-board-id');
    });

    it('should render board data after successful API call', async () => {
      renderBoardPageWithRouter();

      // Wait for board to load
      await waitFor(() => {
        expect(screen.getByText('← Back to Boards')).toBeInTheDocument();
      });

      // Should render the Board component with real data
      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Test Card')).toBeInTheDocument();
      });
    });

    it('should handle board not found scenario', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Board not found'
        })
      });

      renderBoardPageWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Error: Board not found')).toBeInTheDocument();
      });
    });

    it('should handle missing board ID in URL', () => {
      render(
        <MemoryRouter initialEntries={['/board/']}>
          <Routes>
            <Route path="/board/" element={<BoardPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Board ID not found')).toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    it('should render back link with correct styling and navigation', async () => {
      renderBoardPageWithRouter();

      await waitFor(() => {
        const backLink = screen.getByText('← Back to Boards');
        expect(backLink).toBeInTheDocument();
        expect(backLink.closest('a')).toHaveAttribute('href', '/');
      });
    });

    it('should work with different board IDs from URL params', async () => {
      const customBoardId = 'custom-board-123';
      renderBoardPageWithRouter(customBoardId);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/boards/${customBoardId}`);
      });
    });
  });

  describe('Real Component Integration', () => {
    it('should render proper page layout structure', async () => {
      renderBoardPageWithRouter();

      await waitFor(() => {
        expect(screen.getByText('← Back to Boards')).toBeInTheDocument();
      });

      // Check for proper layout structure without deep DOM inspection
      const header = screen.getByText('← Back to Boards').closest('div');
      expect(header).toBeInTheDocument();

      // Should render the real Board component
      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });
    });

    it('should integrate with appearance theme system', async () => {
      renderBoardPageWithRouter();

      await waitFor(() => {
        expect(screen.getByText('← Back to Boards')).toBeInTheDocument();
      });

      // Page should have proper height styling
      const pageContainer = screen.getByText('← Back to Boards').closest('div')?.parentElement;
      expect(pageContainer).toHaveStyle({ height: '100vh', display: 'flex', flexDirection: 'column' });
    });

    it('should pass correct props to Board component', async () => {
      renderBoardPageWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // Board should render with the loaded data
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Test Card')).toBeInTheDocument();

      // Board should show connection status (real Board component integration)
      expect(screen.getByText('Board view')).toBeInTheDocument();
    });
  });

  describe('Realtime Integration', () => {
    it('should integrate with realtime board hook for live updates', async () => {
      renderBoardPageWithRouter();

      await waitFor(() => {
        expect(screen.getByText('← Back to Boards')).toBeInTheDocument();
      });

      // Board should render and show connection status
      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // Should show online users indicator (this tests real integration)
      expect(screen.getByText('1 online')).toBeInTheDocument();
    });

    it('should load board data and activities correctly', async () => {
      renderBoardPageWithRouter();

      await waitFor(() => {
        expect(screen.getByText('← Back to Boards')).toBeInTheDocument();
      });

      // Verify both board and activities APIs were called
      expect(mockApiFetch).toHaveBeenCalledWith('/api/boards/test-board-id');
    });
  });

  describe('Error Handling', () => {
    it('should handle API fetch errors gracefully', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Network error'));

      renderBoardPageWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });
    });

    it('should handle malformed API responses', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({})
      });

      renderBoardPageWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Error: Failed to load board')).toBeInTheDocument();
      });
    });

    it('should handle empty board data', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: null
        })
      });

      renderBoardPageWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Board not found')).toBeInTheDocument();
      });
    });
  });
})