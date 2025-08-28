import { useState, useEffect, useCallback } from 'react'
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core'
import type { DragStartEvent } from '@dnd-kit/core'
import { Card as CardView } from './Card'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableColumn } from './SortableColumn'

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
  const [activeCard, setActiveCard] = useState<Card | null>(null)

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const activeId = String(active.id)
    if (!board) return
    if (activeId.startsWith('card-')) {
      const cardId = activeId.replace('card-', '')
      for (const col of board.columns) {
        const card = col.cards.find(c => c.id === cardId)
        if (card) {
          setActiveCard(card)
          break
        }
      }
    }
  }, [board])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!board || !over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Column reordering
    if (activeId.startsWith('column-') && overId.startsWith('column-')) {
      const oldIndex = board.columns.findIndex(c => `column-${c.id}` === activeId)
      const newIndex = board.columns.findIndex(c => `column-${c.id}` === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const prevColumns = board.columns
      const reordered = arrayMove(prevColumns, oldIndex, newIndex).map((c, idx) => ({ ...c, position: idx }))
      setBoard(prev => prev ? { ...prev, columns: reordered } : prev)

      try {
        await fetch(`http://localhost:3001/api/columns/${prevColumns[oldIndex].id}/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: newIndex })
        })
      } catch (err) {
        // rollback on error
        setBoard(prev => prev ? { ...prev, columns: prevColumns } : prev)
      }
      return
    }

    // Card DnD (reorder or move)
    if (activeId.startsWith('card-')) {
      const cardId = activeId.replace('card-', '')
      // find source column and index
      const sourceColIndex = board.columns.findIndex(col => col.cards.some(c => c.id === cardId))
      if (sourceColIndex === -1) return
      const sourceCol = board.columns[sourceColIndex]
      const fromIndex = sourceCol.cards.findIndex(c => c.id === cardId)
      if (fromIndex === -1) return

      // determine target column and index
      let targetColIndex = sourceColIndex
      let targetIndex = fromIndex

      if (overId.startsWith('card-')) {
        const overCardId = overId.replace('card-', '')
        targetColIndex = board.columns.findIndex(col => col.cards.some(c => c.id === overCardId))
        if (targetColIndex === -1) return
        const overCol = board.columns[targetColIndex]
        targetIndex = overCol.cards.findIndex(c => c.id === overCardId)
      } else if (overId.startsWith('column-')) {
        targetColIndex = board.columns.findIndex(col => `column-${col.id}` === overId)
        if (targetColIndex === -1) return
        const overCol = board.columns[targetColIndex]
        targetIndex = overCol.cards.length
      } else {
        return
      }

      if (sourceColIndex === targetColIndex && fromIndex === targetIndex) return

      const prevBoard = board

      // optimistic update
      const nextColumns = board.columns.map(c => ({ ...c, cards: [...c.cards] }))

      if (sourceColIndex === targetColIndex) {
        const col = nextColumns[sourceColIndex]
        col.cards = arrayMove(col.cards, fromIndex, targetIndex).map((card, idx) => ({ ...card, position: idx }))
        setBoard(prev => prev ? { ...prev, columns: nextColumns } : prev)
        try {
          await fetch(`http://localhost:3001/api/cards/${cardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: targetIndex })
          })
        } catch (err) {
          setBoard(prevBoard)
        }
      } else {
        const fromCol = nextColumns[sourceColIndex]
        const toCol = nextColumns[targetColIndex]
        const [moved] = fromCol.cards.splice(fromIndex, 1)
        toCol.cards.splice(targetIndex, 0, moved)
        // reindex positions
        fromCol.cards = fromCol.cards.map((card, idx) => ({ ...card, position: idx }))
        toCol.cards = toCol.cards.map((card, idx) => ({ ...card, position: idx }))
        setBoard(prev => prev ? { ...prev, columns: nextColumns } : prev)
        try {
          await fetch(`http://localhost:3001/api/cards/${cardId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId: board.columns[targetColIndex].id, position: targetIndex })
          })
        } catch (err) {
          setBoard(prevBoard)
        }
      }
    }
    setActiveCard(null)
  }, [board])

  const handleDragCancel = useCallback(() => {
    setActiveCard(null)
  }, [])

  if (loading) return <div>Loading board...</div>
  if (error) return <div>Error: {error}</div>
  if (!board) return <div>Board not found</div>

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1>{board.title}</h1>
        {board.description && <p style={{ color: '#666' }}>{board.description}</p>}
      </div>
      
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} collisionDetection={closestCenter}>
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          overflowX: 'auto',
          minHeight: '400px',
          paddingBottom: '20px'
        }}>
          <SortableContext 
            items={board.columns.map(c => `column-${c.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {board.columns
              .sort((a, b) => a.position - b.position)
              .map(column => (
                <SortableColumn 
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
          </SortableContext>

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
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#007bff'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#007bff'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#dee2e6'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#6c757d'
                }}
              >
                + Add Column
              </button>
            )}
          </div>
        </div>
        <DragOverlay>
          {activeCard ? (
            <div style={{ pointerEvents: 'none', minWidth: 280 }}>
              <CardView card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
