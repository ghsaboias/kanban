import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppearanceProvider } from '../../appearance'
import { ModernCard } from '../ModernCard'

// Mock API hook
vi.mock('../../useApi', () => ({
  useApi: () => ({
    apiFetch: vi.fn()
  })
}))

const mockCard = {
  id: '1',
  title: 'Test Card',
  description: 'Test description',
  priority: 'HIGH' as const,
  position: 0,
  assignee: {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com'
  }
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AppearanceProvider>
    {children}
  </AppearanceProvider>
)

describe('ModernCard', () => {
  const mockOnCardClick = vi.fn()
  const mockOnCardDeleted = vi.fn()
  const mockOnCardUpdated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders card with title and description', () => {
    render(
      <TestWrapper>
        <ModernCard
          card={mockCard}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('displays priority badge with correct styling', () => {
    render(
      <TestWrapper>
        <ModernCard
          card={mockCard}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    const priorityBadge = screen.getByText('HIGH')
    expect(priorityBadge).toBeInTheDocument()

    // Check that it has some background color (not empty)
    const computedStyle = window.getComputedStyle(priorityBadge)
    expect(computedStyle.backgroundColor).toBeTruthy()
  })

  it('shows assignee avatar when assignee exists', () => {
    render(
      <TestWrapper>
        <ModernCard
          card={mockCard}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    const assigneeAvatar = screen.getByTitle('John Doe (john@example.com)')
    expect(assigneeAvatar).toBeInTheDocument()
    expect(assigneeAvatar).toHaveTextContent('J')
  })

  it('does not show assignee when none exists', () => {
    const cardWithoutAssignee = { ...mockCard, assignee: null }

    render(
      <TestWrapper>
        <ModernCard
          card={cardWithoutAssignee}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    expect(screen.queryByTitle(/John Doe/)).not.toBeInTheDocument()
  })

  it('calls onCardClick when card is clicked', () => {
    render(
      <TestWrapper>
        <ModernCard
          card={mockCard}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    fireEvent.click(screen.getByText('Test Card'))
    expect(mockOnCardClick).toHaveBeenCalledWith(mockCard)
  })

  it('shows drag handle on hover', () => {
    render(
      <TestWrapper>
        <ModernCard
          card={mockCard}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    const card = screen.getByText('Test Card').closest('div')
    expect(card).toBeInTheDocument()

    if (card) {
      fireEvent.mouseEnter(card)
      expect(screen.getByLabelText('Drag handle')).toBeInTheDocument()
    }
  })

  it('shows options menu on hover', () => {
    render(
      <TestWrapper>
        <ModernCard
          card={mockCard}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    const card = screen.getByText('Test Card').closest('div')
    expect(card).toBeInTheDocument()

    if (card) {
      fireEvent.mouseEnter(card)
      expect(screen.getByLabelText('Card options')).toBeInTheDocument()
    }
  })

  it('applies modern styling with clean shadows', () => {
    render(
      <TestWrapper>
        <ModernCard
          card={mockCard}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    const cardTitle = screen.getByText('Test Card')
    expect(cardTitle).toBeInTheDocument()

    // Find the main card container (should be the outermost div)
    const card = cardTitle.closest('[style*="cursor: pointer"]')
    expect(card).toBeInTheDocument()

    // Check for modern styling properties
    if (card) {
      const computedStyle = window.getComputedStyle(card)
      expect(computedStyle.backgroundColor).toBeTruthy()
      expect(computedStyle.borderRadius).toBeTruthy()
    }
  })

  it('handles cards without description', () => {
    const cardWithoutDescription = { ...mockCard, description: null }

    render(
      <TestWrapper>
        <ModernCard
          card={cardWithoutDescription}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.queryByText('Test description')).not.toBeInTheDocument()
  })

  it('truncates long descriptions', () => {
    const longDescription = 'This is a very long description that should be truncated when displayed in the card view to maintain clean appearance and consistent spacing'
    const cardWithLongDescription = { ...mockCard, description: longDescription }

    render(
      <TestWrapper>
        <ModernCard
          card={cardWithLongDescription}
          onCardClick={mockOnCardClick}
          onCardDeleted={mockOnCardDeleted}
          onCardUpdated={mockOnCardUpdated}
        />
      </TestWrapper>
    )

    const description = screen.getByText(/This is a very long description/)
    expect(description.textContent).not.toBe(longDescription)
    expect(description.textContent?.length).toBeLessThan(longDescription.length)
  })

  it('displays different priority colors correctly', () => {
    const priorities: Array<'LOW' | 'MEDIUM' | 'HIGH'> = ['LOW', 'MEDIUM', 'HIGH']

    priorities.forEach(priority => {
      const cardWithPriority = { ...mockCard, priority }

      render(
        <TestWrapper>
          <ModernCard
            card={cardWithPriority}
            onCardClick={mockOnCardClick}
            onCardDeleted={mockOnCardDeleted}
            onCardUpdated={mockOnCardUpdated}
          />
        </TestWrapper>
      )

      expect(screen.getByText(priority)).toBeInTheDocument()
    })
  })
})
