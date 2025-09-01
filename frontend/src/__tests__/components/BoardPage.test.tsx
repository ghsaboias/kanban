import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BoardPage } from '../../components/BoardPage'
import { SocketProvider } from '../../contexts/SocketContext'

// Mock the Board component used inside BoardPage to avoid deep rendering
vi.mock('../../components/Board', () => ({
  Board: ({ board }: { board?: { id: string } | null }) => <div>Board Component (id: {board?.id})</div>
}))

// Mock useApi hook
vi.mock('../../useApi', () => ({
  useApi: () => ({
    apiFetch: vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          id: 'abc123',
          title: 'Test Board',
          description: 'Test Description',
          columns: []
        }
      })
    })
  })
}))

// Mock useSocket hook
vi.mock('../../hooks/useSocket', () => ({
  useSocket: () => ({
    isConnected: true,
    socketId: 'test-socket-id',
    error: null,
    joinBoard: vi.fn(),
    leaveBoard: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  })
}))

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token')
  })
}))

// Mock useRealtimeBoard hook
vi.mock('../../hooks/useRealtimeBoard', () => ({
  useRealtimeBoard: () => ({
    isConnected: true,
    onlineUsers: [],
    activities: []
  })
}))

describe('BoardPage', () => {
  it('renders back link and Board with route id', async () => {
    render(
      <SocketProvider>
        <MemoryRouter initialEntries={[{ pathname: '/board/abc123' }] }>
          <Routes>
            <Route path="/board/:id" element={<BoardPage />} />
          </Routes>
        </MemoryRouter>
      </SocketProvider>
    )

    // Wait for loading to complete and back button to appear
    await expect(screen.findByText('← Back to Boards')).resolves.toBeInTheDocument()
    
    // Wait for async data loading and Board component
    await expect(screen.findByText(/Board Component/)).resolves.toHaveTextContent('(id: abc123)')
  })

  it('displays activity feed toggle button', async () => {
    render(
      <SocketProvider>
        <MemoryRouter initialEntries={[{ pathname: '/board/abc123' }]}>
          <Routes>
            <Route path="/board/:id" element={<BoardPage />} />
          </Routes>
        </MemoryRouter>
      </SocketProvider>
    )

    await expect(screen.findByText('Ver Atividades')).resolves.toBeInTheDocument()
  })

  it('handles loading state while fetching board data', async () => {
    // This would require more complex mocking of the useApi hook to simulate loading
    // For now, we verify the component renders and shows loading state initially  
    render(
      <SocketProvider>
        <MemoryRouter initialEntries={[{ pathname: '/board/loading-test' }]}>
          <Routes>
            <Route path="/board/:id" element={<BoardPage />} />
          </Routes>
        </MemoryRouter>
      </SocketProvider>
    )

    // Initially shows loading state, then loads normally
    expect(screen.getByText('Loading board...')).toBeInTheDocument()
    
    // Wait for actual loading to complete and back link to appear
    await expect(screen.findByText('← Back to Boards')).resolves.toBeInTheDocument()
  })
})