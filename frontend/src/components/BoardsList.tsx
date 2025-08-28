import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface Board {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count: {
    columns: number
  }
}

export function BoardsList() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:3001/api/boards')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setBoards(data.data)
        } else {
          setError('Failed to load boards')
        }
      })
      .catch(err => {
        setError('Error connecting to API: ' + err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading boards...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div style={{ padding: '20px' }}>
      <h1>Kanban Boards</h1>
      {boards.length === 0 ? (
        <p>No boards found</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {boards.map(board => (
            <Link 
              key={board.id} 
              to={`/board/${board.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ 
                border: '1px solid #ccc', 
                borderRadius: '8px', 
                padding: '16px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                backgroundColor: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
              }}
              >
                <h3 style={{ margin: '0 0 8px 0' }}>{board.title}</h3>
                {board.description && <p style={{ margin: '0 0 12px 0', color: '#666' }}>{board.description}</p>}
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>
                  {board._count.columns} columns
                </p>
                <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                  Created: {new Date(board.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}