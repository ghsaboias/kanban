import { describe, expect, it, vi } from 'vitest'
import { BoardPage } from '../../components/BoardPage'
import { SocketProvider } from '../../contexts/SocketContext'
import { render, screen } from '../test-utils'

// Mock the Board component used inside BoardPage to avoid deep rendering
vi.mock('../../components/Board', () => ({
  Board: ({ board }: { board?: { id: string } | null }) => <div>Board Component (id: {board?.id})</div>
}))

// Mock React Router components and hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'abc123' }),
    Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
  };
})

// Mock useApi hook
vi.mock('../../useApi', () => ({
  useApi: () => ({
    apiFetch: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/activities')) {
        // Mock activities response
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        });
      } else {
        // Mock board response
        return Promise.resolve({
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
        });
      }
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
  it('renders loading state initially', () => {
    render(
      <SocketProvider>
        <BoardPage />
      </SocketProvider>
    )

    expect(screen.getByText('Loading board...')).toBeInTheDocument()
  })

  it('renders back link when board is loaded', async () => {
    render(
      <SocketProvider>
        <BoardPage />
      </SocketProvider>
    )

    await expect(screen.findByText('← Back to Boards')).resolves.toBeInTheDocument()
  })

  it('renders activity feed toggle button', async () => {
    render(
      <SocketProvider>
        <BoardPage />
      </SocketProvider>
    )

    await expect(screen.findByText('Ver Atividades')).resolves.toBeInTheDocument()
  })
})