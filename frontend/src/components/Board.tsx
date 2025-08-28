import { useState, useEffect } from 'react'
import { Column } from './Column'

interface Card {
  id: string
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  position: number
  assignee: {
    id: string
    name: string
    email: string
  } | null
}

interface ColumnData {
  id: string
  title: string
  position: number
  cards: Card[]
}

interface BoardData {
  id: string
  title: string
  description: string | null
  columns: ColumnData[]
}

interface BoardProps {
  boardId: string
}

export function Board({ boardId }: BoardProps) {
  const [board, setBoard] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`http://localhost:3001/api/boards/${boardId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setBoard(data.data)
        } else {
          setError('Failed to load board')
        }
      })
      .catch(err => {
        setError('Error connecting to API: ' + err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [boardId])

  if (loading) return <div>Loading board...</div>
  if (error) return <div>Error: {error}</div>
  if (!board) return <div>Board not found</div>

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1>{board.title}</h1>
        {board.description && <p style={{ color: '#666' }}>{board.description}</p>}
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        overflowX: 'auto',
        minHeight: '400px'
      }}>
        {board.columns
          .sort((a, b) => a.position - b.position)
          .map(column => (
            <Column key={column.id} column={column} />
          ))}
      </div>
    </div>
  )
}