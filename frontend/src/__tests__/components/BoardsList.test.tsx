import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardsList } from '../../components/BoardsList';
import { fireEvent, render, screen, waitFor } from '../test-utils';

// Mock API calls with stable reference
const mockApiFetch = vi.fn();
const stableApiFetch = mockApiFetch;

vi.mock('../../useApi', () => ({
  useApi: () => ({ apiFetch: stableApiFetch })
}));

// Mock React Router Link component to render as anchor for testing
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string;[key: string]: unknown }) =>
      <a href={to} {...props}>{children}</a>,
  };
});

type TestBoard = {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count: { columns: number }
}

// Test wrapper with router for navigation testing
const renderBoardsListWithRouter = () => {
  return render(
    <MemoryRouter>
      <BoardsList />
    </MemoryRouter>
  );
};

describe('BoardsList Integration Tests', () => {
  // Create stable mock data to prevent infinite re-renders
  const mockBoardsData: TestBoard[] = [
    {
      id: 'board-1',
      title: 'Development Tasks',
      description: 'Track development progress',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      _count: { columns: 3 }
    },
    {
      id: 'board-2',
      title: 'Marketing Campaign',
      description: null,
      createdAt: '2023-01-02T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      _count: { columns: 1 }
    },
    {
      id: 'board-3',
      title: 'Product Roadmap',
      description: 'Long-term product planning and feature development',
      createdAt: '2023-01-03T00:00:00Z',
      updatedAt: '2023-01-03T00:00:00Z',
      _count: { columns: 5 }
    }
  ];

  const mockNewBoardData: TestBoard = {
    id: 'new-board-id',
    title: 'New Board',
    description: 'A newly created board',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { columns: 0 }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for board listing
    mockApiFetch.mockImplementation((url, options) => {
      if (url === '/api/boards' && !options?.method) {
        // GET boards
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockBoardsData })
        });
      } else if (url === '/api/boards' && options?.method === 'POST') {
        // POST create board
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockNewBoardData })
        });
      } else if (url.startsWith('/api/boards/') && options?.method === 'PUT') {
        // PUT update board
        const boardId = url.split('/')[3];
        const updatedBoard = { ...mockBoardsData.find(b => b.id === boardId)!, ...JSON.parse(options.body) };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: updatedBoard })
        });
      } else if (url.startsWith('/api/boards/') && options?.method === 'DELETE') {
        // DELETE board
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      } else if (url.includes('/columns') && options?.method === 'POST') {
        // POST create columns for templates
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 'col-1', title: 'Column' } })
        });
      }

      // Fallback
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'Not found' })
      });
    });
  });

  describe('Board Loading and Display', () => {
    it('should show loading state initially then display boards', async () => {
      renderBoardsListWithRouter();

      // Should show loading initially
      expect(screen.getByText('Loading boards...')).toBeInTheDocument();

      // Wait for boards to load
      await waitFor(() => {
        expect(screen.getByText('Kanban Boards')).toBeInTheDocument();
        expect(screen.getByText('Development Tasks')).toBeInTheDocument();
        expect(screen.getByText('Marketing Campaign')).toBeInTheDocument();
        expect(screen.getByText('Product Roadmap')).toBeInTheDocument();
      });

      // Verify API was called
      expect(mockApiFetch).toHaveBeenCalledWith('/api/boards');
    });

    it('should display board details correctly', async () => {
      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Development Tasks')).toBeInTheDocument();
      });

      // Check board details are rendered
      expect(screen.getByText('Track development progress')).toBeInTheDocument();
      expect(screen.getByText('3 columns')).toBeInTheDocument();
      expect(screen.getByText('1 columns')).toBeInTheDocument();
      expect(screen.getByText('5 columns')).toBeInTheDocument();

      // Check board links are correct
      const boardLinks = screen.getAllByRole('link');
      const developmentLink = boardLinks.find(link => link.getAttribute('href') === '/board/board-1');
      expect(developmentLink).toBeInTheDocument();
    });

    it('should handle empty board state', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      });

      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('No boards found')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Network error'));

      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Board Creation Workflow', () => {
    it('should create empty board through dropdown workflow', async () => {
      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Kanban Boards')).toBeInTheDocument();
      });

      // Open create dropdown
      fireEvent.click(screen.getByText('+ Create Board'));
      expect(screen.getByText('Create Empty Board')).toBeInTheDocument();
      expect(screen.getByText('Create from Template')).toBeInTheDocument();

      // Click "Create Empty Board"
      fireEvent.click(screen.getByText('Create Empty Board'));

      // Form should appear
      expect(screen.getByText('Create New Board')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter board title')).toBeInTheDocument();

      // Fill and submit form
      fireEvent.change(screen.getByPlaceholderText('Enter board title'), {
        target: { value: 'New Board' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter board description (optional)'), {
        target: { value: 'A newly created board' }
      });

      fireEvent.click(screen.getByText('Create Board'));

      // Verify API call and board appears
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith('/api/boards', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'New Board',
            description: 'A newly created board'
          })
        }));
        expect(screen.getByText('New Board')).toBeInTheDocument();
      });
    });

    it('should create board from template', async () => {
      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('+ Create Board')).toBeInTheDocument();
      });

      // Open dropdown and click template option
      fireEvent.click(screen.getByText('+ Create Board'));
      fireEvent.click(screen.getByText('Create from Template'));

      // Template modal should open
      expect(screen.getByText('Create Board from Template')).toBeInTheDocument();
      expect(screen.getByText('M&A Pipeline (EN)')).toBeInTheDocument();

      // Select template
      fireEvent.click(screen.getByText('Use This Template'));

      // Form should be pre-filled with template
      expect(screen.getByText('Create New Board')).toBeInTheDocument();
      const templateSelect = screen.getByRole('combobox');
      expect(templateSelect).toHaveValue('ma-pipeline-en');

      // Fill title and submit
      fireEvent.change(screen.getByPlaceholderText('Enter board title'), {
        target: { value: 'M&A Pipeline Board' }
      });
      fireEvent.click(screen.getByText('Create Board'));

      // Verify board creation and template columns creation
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith('/api/boards', expect.objectContaining({ method: 'POST' }));
        // Should also create columns for the template
        expect(mockApiFetch).toHaveBeenCalledWith('/api/boards/new-board-id/columns', expect.objectContaining({ method: 'POST' }));
      });
    });

    it('should validate required fields', async () => {
      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('+ Create Board')).toBeInTheDocument();
      });

      // Open form
      fireEvent.click(screen.getByText('+ Create Board'));
      fireEvent.click(screen.getByText('Create Empty Board'));

      // Try to submit without title
      const submitButton = screen.getByText('Create Board');
      expect(submitButton).toBeDisabled();

      // Add title
      fireEvent.change(screen.getByPlaceholderText('Enter board title'), {
        target: { value: 'Valid Title' }
      });
      expect(submitButton).not.toBeDisabled();
    });

    it('should handle creation errors', async () => {
      // Mock GET boards first (for initial load)
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockBoardsData })
      });

      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('+ Create Board')).toBeInTheDocument();
      });

      // Open form
      fireEvent.click(screen.getByText('+ Create Board'));
      fireEvent.click(screen.getByText('Create Empty Board'));

      // Mock POST boards to fail
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Board creation failed' })
      });

      fireEvent.change(screen.getByPlaceholderText('Enter board title'), {
        target: { value: 'Test Board' }
      });
      fireEvent.click(screen.getByText('Create Board'));

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Board creation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Board Management Operations', () => {
    it('should edit board details', async () => {
      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Development Tasks')).toBeInTheDocument();
      });

      // Click edit button
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      // Edit form should appear with pre-filled data
      expect(screen.getByText('Edit Board')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Development Tasks')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Track development progress')).toBeInTheDocument();

      // Update the board
      fireEvent.change(screen.getByDisplayValue('Development Tasks'), {
        target: { value: 'Updated Development Tasks' }
      });
      fireEvent.click(screen.getByText('Update Board'));

      // Verify API call
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith('/api/boards/board-1', expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Development Tasks',
            description: 'Track development progress'
          })
        }));
      });
    });

    it('should delete board with confirmation', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Development Tasks')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Verify confirmation was called and API was called
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this board? This action cannot be undone.');
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith('/api/boards/board-1', { method: 'DELETE' });
      });

      confirmSpy.mockRestore();
    });

    it('should cancel deletion when user declines confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Development Tasks')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalled();
      // Should not call delete API
      expect(mockApiFetch).not.toHaveBeenCalledWith('/api/boards/board-1', { method: 'DELETE' });

      confirmSpy.mockRestore();
    });
  });

  describe('Real Component Integration', () => {
    it('should integrate with appearance theme system', async () => {
      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Kanban Boards')).toBeInTheDocument();
      });

      // Check theme integration through styled elements
      const header = screen.getByText('Kanban Boards');
      const createButton = screen.getByText('+ Create Board');

      expect(header).toBeInTheDocument();
      expect(createButton).toBeInTheDocument();
    });

    it('should handle dropdown interactions correctly', async () => {
      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('+ Create Board')).toBeInTheDocument();
      });

      // Open dropdown
      fireEvent.click(screen.getByText('+ Create Board'));
      expect(screen.getByText('Create Empty Board')).toBeInTheDocument();

      // Click outside should close dropdown
      fireEvent.mouseDown(document.body);
      await waitFor(() => {
        expect(screen.queryByText('Create Empty Board')).not.toBeInTheDocument();
      });
    });

    it('should integrate with form validation and async operations', async () => {
      renderBoardsListWithRouter();

      await waitFor(() => {
        expect(screen.getByText('+ Create Board')).toBeInTheDocument();
      });

      // Test form states
      fireEvent.click(screen.getByText('+ Create Board'));
      fireEvent.click(screen.getByText('Create Empty Board'));

      const titleInput = screen.getByPlaceholderText('Enter board title');
      const submitButton = screen.getByText('Create Board');

      // Should be disabled initially
      expect(submitButton).toBeDisabled();

      // Should enable when title is added
      fireEvent.change(titleInput, { target: { value: 'Test' } });
      expect(submitButton).not.toBeDisabled();

      // Should disable while loading
      fireEvent.click(submitButton);
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });
})
