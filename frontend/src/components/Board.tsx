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
  const [showCreateColumn, setShowCreateColumn] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [columnTitle, setColumnTitle] = useState('')

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

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!columnTitle.trim()) return

    setCreateLoading(true)
    try {
      const response = await fetch(`http://localhost:3001/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: columnTitle.trim()
        })
      })

      const result = await response.json()
      if (result.success) {
        const newColumn: ColumnData = {
          ...result.data,
          cards: []
        }
        setBoard(prev => prev ? {
          ...prev,
          columns: [...prev.columns, newColumn]
        } : null)
        setColumnTitle('')
        setShowCreateColumn(false)
      } else {
        setError('Failed to create column')
      }
    } catch (err) {
      setError('Error creating column')
    } finally {
      setCreateLoading(false)
    }
  }

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
        minHeight: '400px',
        paddingBottom: '20px'
      }}>
        {board.columns
          .sort((a, b) => a.position - b.position)
          .map(column => (
            <Column 
              key={column.id} 
              column={column}
              onCardCreated={(newCard) => {
                setBoard(prev => prev ? {
                  ...prev,
                  columns: prev.columns.map(col => 
                    col.id === column.id 
                      ? { ...col, cards: [...col.cards, newCard] }
                      : col
                  )
                } : null)
              }}
              onColumnUpdated={(updatedColumn) => {
                setBoard(prev => prev ? {
                  ...prev,
                  columns: prev.columns.map(col => 
                    col.id === updatedColumn.id 
                      ? updatedColumn
                      : col
                  )
                } : null)
              }}
              onColumnDeleted={(columnId) => {
                setBoard(prev => prev ? {
                  ...prev,
                  columns: prev.columns.filter(col => col.id !== columnId)
                } : null)
              }}
              onCardUpdated={(updatedCard) => {
                setBoard(prev => prev ? {
                  ...prev,
                  columns: prev.columns.map(col => 
                    col.id === column.id 
                      ? {
                          ...col,
                          cards: col.cards.map(card => 
                            card.id === updatedCard.id ? updatedCard : card
                          )
                        }
                      : col
                  )
                } : null)
              }}
              onCardDeleted={(cardId) => {
                setBoard(prev => prev ? {
                  ...prev,
                  columns: prev.columns.map(col => 
                    col.id === column.id 
                      ? {
                          ...col,
                          cards: col.cards.filter(card => card.id !== cardId)
                        }
                      : col
                  )
                } : null)
              }}
            />
          ))}
        
        {/* Add Column Button */}
        <div style={{ 
          minWidth: '300px',
          display: 'flex',
          alignItems: 'flex-start'
        }}>
          {showCreateColumn ? (
            <div style={{
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              padding: '16px',
              width: '100%'
            }}>
              <form onSubmit={handleCreateColumn}>
                <input
                  type="text"
                  value={columnTitle}
                  onChange={(e) => setColumnTitle(e.target.value)}
                  placeholder="Enter column title"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    marginBottom: '12px'
                  }}
                  autoFocus
                  required
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    disabled={createLoading || !columnTitle.trim()}
                    style={{
                      backgroundColor: createLoading ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: createLoading ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {createLoading ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateColumn(false)
                      setColumnTitle('')
                    }}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateColumn(true)}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '2px dashed #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6c757d',
                transition: 'border-color 0.2s, color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#007bff'
                e.currentTarget.style.color = '#007bff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#dee2e6'
                e.currentTarget.style.color = '#6c757d'
              }}
            >
              + Add Column
            </button>
          )}
        </div>
      </div>
    </div>
  )
}