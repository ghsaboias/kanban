import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../../appearance';
import { KanbanToolbar } from '../KanbanToolbar';

// Mock the useApi hook
const mockApiFetch = vi.fn();
vi.mock('../../useApi', () => ({
  useApi: () => ({
    apiFetch: mockApiFetch,
  }),
}));

// Mock users API response
const mockUsers = [
  { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
  { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
];

const mockColumns = [
  { id: 'column-1', title: 'To Do', position: 0, cards: [] },
  { id: 'column-2', title: 'In Progress', position: 1, cards: [] },
  { id: 'column-3', title: 'Done', position: 2, cards: [] },
];

const renderWithProvider = (component: React.ReactNode) => {
  return render(
    <AppearanceProvider>
      {component}
    </AppearanceProvider>
  )
}

describe('KanbanToolbar', () => {
  const mockProps = {
    onFilter: vi.fn(),
    onSort: vi.fn(),
    onSearch: vi.fn(),
    onNewCard: vi.fn(),
    onExpandView: vi.fn(),
    onShowMoreOptions: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock users API response
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockUsers }),
    });
  })

  describe('Button Interactions', () => {
    it('should render all toolbar buttons', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      expect(screen.getByText('Board view')).toBeInTheDocument()
      expect(screen.getByText('Filter')).toBeInTheDocument()
      expect(screen.getByText('Sort by Priority')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search cards...')).toBeInTheDocument()
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('should call onExpandView when expand button is clicked', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const expandButton = screen.getByTitle('Expand view')
      fireEvent.click(expandButton)

      expect(mockProps.onExpandView).toHaveBeenCalledTimes(1)
    })

    it('should call onSort when sort button is clicked', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const sortButton = screen.getByText('Sort by Priority')
      fireEvent.click(sortButton)

      expect(mockProps.onSort).toHaveBeenCalledWith()
    })

    it('should call onSearch when search input changes', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search cards...')
      fireEvent.change(searchInput, { target: { value: 'test search' } })

      expect(mockProps.onSearch).toHaveBeenCalledWith('test search')
    })
  })

  describe('Filter Dropdown', () => {
    it('should show filter dropdown when filter button is clicked', async () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const filterButton = screen.getByText('Filter')
      fireEvent.click(filterButton)

      await waitFor(() => {
        expect(screen.getByText('All Cards')).toBeInTheDocument()
        expect(screen.getByText('High Priority')).toBeInTheDocument()
        expect(screen.getByText('Medium Priority')).toBeInTheDocument()
        expect(screen.getByText('Low Priority')).toBeInTheDocument()
      })
    })

    it('should call onFilter when filter option is selected', async () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const filterButton = screen.getByText('Filter')
      fireEvent.click(filterButton)

      await waitFor(() => {
        const highPriorityOption = screen.getByText('High Priority')
        fireEvent.click(highPriorityOption)
      })

      expect(mockProps.onFilter).toHaveBeenCalledWith('high')
    })

    it('should hide filter dropdown after selection', async () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const filterButton = screen.getByText('Filter')
      fireEvent.click(filterButton)

      await waitFor(() => {
        const allCardsOption = screen.getByText('All Cards')
        fireEvent.click(allCardsOption)
      })

      await waitFor(() => {
        expect(screen.queryByText('High Priority')).not.toBeInTheDocument()
      })
    })

    it('should apply active styling to selected filter', async () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const filterButton = screen.getByText('Filter')
      fireEvent.click(filterButton)

      await waitFor(() => {
        const mediumPriorityOption = screen.getByText('Medium Priority')
        fireEvent.click(mediumPriorityOption)
      })

      // Filter button should show active styling when not "all"
      expect(filterButton.parentElement?.style.backgroundColor).not.toBe('transparent')
    })
  })

  describe('More Options Dropdown', () => {
    it('should show more options dropdown when more button is clicked', async () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const moreButton = screen.getByTitle('More options')
      fireEvent.click(moreButton)

      await waitFor(() => {
        expect(screen.getByText('📤 Export Board')).toBeInTheDocument()
        expect(screen.getByText('⚙️ Board Settings')).toBeInTheDocument()
      })
    })

    it('should hide more options dropdown after selection', async () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const moreButton = screen.getByTitle('More options')
      fireEvent.click(moreButton)

      await waitFor(() => {
        const exportOption = screen.getByText('📤 Export Board')
        fireEvent.click(exportOption)
      })

      await waitFor(() => {
        expect(screen.queryByText('📤 Export Board')).not.toBeInTheDocument()
      })
    })
  })

  describe('New Button Dropdown', () => {
    it('should show new dropdown when new button is clicked', async () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      await waitFor(() => {
        expect(screen.getByText('✏️ New Card')).toBeInTheDocument()
        expect(screen.getByText('📋 New Column')).toBeInTheDocument()
        expect(screen.getByText('📄 From Template')).toBeInTheDocument()
      })
    })

    it('should open modal when New Card is clicked', async () => {
      const propsWithColumns = {
        ...mockProps,
        columns: mockColumns,
      };

      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      await waitFor(() => {
        const newCardOption = screen.getByText('✏️ New Card')
        fireEvent.click(newCardOption)
      })

      await waitFor(() => {
        expect(screen.getByText('Create New Card')).toBeInTheDocument()
      })
    })

    it('should hide new dropdown after selection', async () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      await waitFor(() => {
        const newCardOption = screen.getByText('✏️ New Card')
        fireEvent.click(newCardOption)
      })

      await waitFor(() => {
        expect(screen.queryByText('✏️ New Card')).not.toBeInTheDocument()
      })
    })
  })

  describe('Search Functionality', () => {
    it('should update search input value', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search cards...') as HTMLInputElement
      fireEvent.change(searchInput, { target: { value: 'test query' } })

      expect(searchInput.value).toBe('test query')
    })

    it('should call onSearch on every keystroke', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search cards...')

      fireEvent.change(searchInput, { target: { value: 't' } })
      expect(mockProps.onSearch).toHaveBeenCalledWith('t')

      fireEvent.change(searchInput, { target: { value: 'te' } })
      expect(mockProps.onSearch).toHaveBeenCalledWith('te')

      fireEvent.change(searchInput, { target: { value: 'test' } })
      expect(mockProps.onSearch).toHaveBeenCalledWith('test')
    })
  })

  describe('Visual Feedback', () => {
    it('should apply hover styles to buttons', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const sortButton = screen.getByText('Sort by Priority')

      // Test mouse enter
      fireEvent.mouseEnter(sortButton)
      expect(sortButton.style.backgroundColor).not.toBe('transparent')

      // Test mouse leave
      fireEvent.mouseLeave(sortButton)
      expect(sortButton.style.backgroundColor).toBe('transparent')
    })

    it('should show search input focus styles', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search cards...')

      fireEvent.focus(searchInput)
      // Focus styles are applied via onFocus handler
      expect(searchInput.style.borderColor).not.toBe('')

      fireEvent.blur(searchInput)
      // Blur styles are applied via onBlur handler
    })
  })

  describe('Accessibility', () => {
    it('should have proper titles for icon buttons', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      expect(screen.getByTitle('Expand view')).toBeInTheDocument()
      expect(screen.getByTitle('More options')).toBeInTheDocument()
    })

    it('should have proper placeholder for search input', () => {
      renderWithProvider(<KanbanToolbar {...mockProps} />)

      expect(screen.getByPlaceholderText('Search cards...')).toBeInTheDocument()
    })
  })

  describe('New Card Modal Functionality', () => {
    const propsWithColumns = {
      ...mockProps,
      columns: mockColumns,
      onCardCreated: vi.fn(),
      onShowCreateColumn: vi.fn(),
    };

    it('should open New Card modal when dropdown option is clicked', async () => {
      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      await waitFor(() => {
        const newCardOption = screen.getByText('✏️ New Card')
        fireEvent.click(newCardOption)
      })

      await waitFor(() => {
        expect(screen.getByText('Create New Card')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Enter card title')).toBeInTheDocument()
      })
    })

    it('should display column selector with first column selected by default', async () => {
      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      // Open dropdown and click New Card
      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      const newCardOption = screen.getByText('✏️ New Card')
      fireEvent.click(newCardOption)

      await waitFor(() => {
        const columnSelect = screen.getByDisplayValue('To Do')
        expect(columnSelect).toBeInTheDocument()

        // Check all columns are available as options
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThanOrEqual(3)
        expect(screen.getByRole('option', { name: 'To Do' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'In Progress' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Done' })).toBeInTheDocument()
      })
    })

    it('should allow changing the selected column', async () => {
      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      // Open New Card modal
      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      const newCardOption = screen.getByText('✏️ New Card')
      fireEvent.click(newCardOption)

      await waitFor(() => {
        const columnSelect = screen.getByDisplayValue('To Do')
        fireEvent.change(columnSelect, { target: { value: 'column-2' } })

        expect(screen.getByDisplayValue('In Progress')).toBeInTheDocument()
      })
    })

    it('should create card in selected column when form is submitted', async () => {
      const mockOnCardCreated = vi.fn()

      // Mock users API response first
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockUsers }),
      });

      // Mock successful card creation second
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'new-card',
            title: 'New Test Card',
            description: 'Test description',
            priority: 'MEDIUM',
            position: 0,
            assignee: null
          }
        }),
      });

      renderWithProvider(<KanbanToolbar {...propsWithColumns} onCardCreated={mockOnCardCreated} />)

      // Open New Card modal
      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      const newCardOption = screen.getByText('✏️ New Card')
      fireEvent.click(newCardOption)

      await waitFor(() => {
        // Fill out the form
        const titleInput = screen.getByPlaceholderText('Enter card title')
        const descriptionTextarea = screen.getByPlaceholderText('Enter description (optional)')
        const columnSelect = screen.getByDisplayValue('To Do')

        fireEvent.change(titleInput, { target: { value: 'New Test Card' } })
        fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } })
        fireEvent.change(columnSelect, { target: { value: 'column-2' } })
      })

      // Submit form
      const createButton = screen.getByRole('button', { name: /create card/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        // Check that the card creation API call was made (should be the second call after users)
        const calls = mockApiFetch.mock.calls;
        const cardCreationCall = calls.find(call => call[0] === '/api/columns/column-2/cards');

        expect(cardCreationCall).toBeDefined();
        if (cardCreationCall) {
          expect(cardCreationCall[1]).toMatchObject({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: 'New Test Card',
              description: 'Test description',
              priority: 'MEDIUM',
              assigneeId: null,
              deadline: null,
              riskLevel: null,
              ownerId: null
            })
          });
        }
      })

      await waitFor(() => {
        expect(mockOnCardCreated).toHaveBeenCalledWith('column-2', expect.objectContaining({
          id: 'new-card',
          title: 'New Test Card'
        }))
      })
    })

    it('should close modal when Cancel button is clicked', async () => {
      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      // Open New Card modal
      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      const newCardOption = screen.getByText('✏️ New Card')
      fireEvent.click(newCardOption)

      await waitFor(() => {
        expect(screen.getByText('Create New Card')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Create New Card')).not.toBeInTheDocument()
      })
    })

    it('should close modal when clicking backdrop', async () => {
      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      // Open New Card modal
      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      const newCardOption = screen.getByText('✏️ New Card')
      fireEvent.click(newCardOption)

      await waitFor(() => {
        expect(screen.getByText('Create New Card')).toBeInTheDocument()
      })

      // Click on modal backdrop
      const modalBackdrop = screen.getByTestId('modal-backdrop')
      fireEvent.click(modalBackdrop)

      await waitFor(() => {
        expect(screen.queryByText('Create New Card')).not.toBeInTheDocument()
      })
    })

    it('should load users for assignee dropdown', async () => {
      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      // Open New Card modal
      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      const newCardOption = screen.getByText('✏️ New Card')
      fireEvent.click(newCardOption)

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith('/api/users')
      })

      await waitFor(() => {
        // Check that assignee dropdown has the loaded users
        const userOptions = screen.getAllByRole('option');
        const userNames = userOptions.map(option => option.textContent);

        expect(userNames).toContain('John Doe');
        expect(userNames).toContain('Jane Smith');
      })
    })

    it('should call onShowCreateColumn when New Column option is clicked', async () => {
      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      await waitFor(() => {
        const newColumnOption = screen.getByText('📋 New Column')
        fireEvent.click(newColumnOption)
      })

      expect(propsWithColumns.onShowCreateColumn).toHaveBeenCalledWith(true)
    })

    it('should close dropdown after clicking New Column', async () => {
      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      await waitFor(() => {
        const newColumnOption = screen.getByText('📋 New Column')
        fireEvent.click(newColumnOption)
      })

      await waitFor(() => {
        expect(screen.queryByText('📋 New Column')).not.toBeInTheDocument()
      })
    })

    it('should open Template Import modal when From Template is clicked', async () => {
      renderWithProvider(<KanbanToolbar {...propsWithColumns} />)

      const newButton = screen.getByText('New')
      fireEvent.click(newButton)

      await waitFor(() => {
        const templateOption = screen.getByText('📄 From Template')
        fireEvent.click(templateOption)
      })

      await waitFor(() => {
        expect(screen.getByText('Import From Template')).toBeInTheDocument()
      })
    })
  })
})
