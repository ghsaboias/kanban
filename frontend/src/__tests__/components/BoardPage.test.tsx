import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BoardPage } from '../../components/BoardPage'

// Mock the Board component used inside BoardPage to avoid deep rendering
vi.mock('../../components/Board', () => ({
  Board: ({ boardId }: any) => <div>Board Component (id: {boardId})</div>
}))

describe('BoardPage', () => {
  it('renders back link and Board with route id', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/board/abc123' }] }>
        <Routes>
          <Route path="/board/:id" element={<BoardPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('← Back to Boards')).toBeInTheDocument()
    expect(screen.getByText(/Board Component/)).toHaveTextContent('(id: abc123)')
  })
})

