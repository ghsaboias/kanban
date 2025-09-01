import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardsList } from '../../components/BoardsList';
import { fireEvent, render, screen, waitFor } from '../test-utils';

// Mock React Router components and hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  };
})

type TestBoard = {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count: { columns: number }
}

const mockApiFetch = vi.fn()

vi.mock('../../useApi', () => ({
  useApi: () => ({ apiFetch: mockApiFetch })
}))

describe('BoardsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders boards after loading', async () => {
    const boards: TestBoard[] = [
      { id: 'b1', title: 'Board 1', description: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _count: { columns: 0 } },
      { id: 'b2', title: 'Board 2', description: 'desc', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _count: { columns: 2 } },
    ]
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: boards })
    })

    render(<BoardsList />)

    expect(screen.getByText('Loading boards...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Board 1')).toBeInTheDocument()
      expect(screen.getByText('Board 2')).toBeInTheDocument()
    })
  })

  it('creates a board from the form', async () => {
    const boards: TestBoard[] = []
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: boards })
    })

    render(<BoardsList />)

    await waitFor(() => {
      expect(screen.getByText('Kanban Boards')).toBeInTheDocument()
    })

    // Open form
    fireEvent.click(screen.getByText('+ Create Board'))

    // Next call should be the POST
    const created = { id: 'new', title: 'New Board', description: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _count: { columns: 0 } }
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: created })
    })

    fireEvent.change(screen.getByPlaceholderText('Enter board title'), { target: { value: 'New Board' } })
    fireEvent.click(screen.getByText('Create Board'))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/boards', expect.objectContaining({ method: 'POST' }))
      expect(screen.getByText('New Board')).toBeInTheDocument()
    })
  })
})
