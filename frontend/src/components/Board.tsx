import { useState, useCallback, useRef, useEffect } from 'react'
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { Card as CardView } from './Card'
import { SortableColumn } from './SortableColumn'
import { CardDetailModal } from './CardDetailModal'
import { useApi } from '../useApi'
import type { ApiResponse } from '../types/api'
import type { User } from '../../../shared/realtime'

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

export interface BoardData {
  id: string
  title: string
  description: string | null
  columns: ColumnData[]
}

interface BoardProps {
  board: BoardData
  setBoard: React.Dispatch<React.SetStateAction<BoardData | null>>
  isConnected: boolean
  onlineUsers: Array<{ userId: string; user: User }>
}

export function Board({ board, setBoard, isConnected, onlineUsers }: BoardProps) {
  const { apiFetch } = useApi()
  const [showCreateColumn, setShowCreateColumn] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [columnTitle, setColumnTitle] = useState('')
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Configure sensors with activation constraints to allow click events
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!columnTitle.trim()) return

    setCreateLoading(true)
    try {
      const response = await apiFetch(`/api/boards/${board.id}/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: columnTitle.trim()
        })
      })

      const result: ApiResponse<ColumnData> = await response.json()
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
        // You might want to show an error to the user here
        console.error('Failed to create column', result.error)
      }
    } catch (err) {
      console.error('Error creating column', err)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const activeId = String(active.id)
    if (activeId.startsWith('card-')) {
      const cardId = activeId.replace('card-', '')
      for (const col of board.columns) {
        const card = col.cards.find(c => c.id === cardId)
        if (card) {
          setActiveCard(card)
          break
        }
      }
    } else {
      setActiveCard(null)
    }
  }, [board])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Column reordering
    if (activeId.startsWith('column-') && overId.startsWith('column-')) {
      const oldIndex = board.columns.findIndex(c => `column-${c.id}` === activeId)
      const newIndex = board.columns.findIndex(c => `column-${c.id}` === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const prevColumns = board.columns
      const reordered = arrayMove(prevColumns, oldIndex, newIndex).map((c, idx) => ({ ...c, position: idx }))
      setBoard({ ...board, columns: reordered })

      try {
        await apiFetch(`/api/columns/${prevColumns[oldIndex].id}/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: newIndex })
        })
      } catch {
        setBoard({ ...board, columns: prevColumns })
      }
      return
    }

    // Card DnD (reorder or move)
    if (activeId.startsWith('card-')) {
      const cardId = activeId.replace('card-', '')
      const sourceColIndex = board.columns.findIndex(col => col.cards.some(c => c.id === cardId))
      if (sourceColIndex === -1) return
      const sourceCol = board.columns[sourceColIndex]
      const fromIndex = sourceCol.cards.findIndex(c => c.id === cardId)
      if (fromIndex === -1) return

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
        targetIndex = board.columns[targetColIndex].cards.length
      } else {
        return
      }

      if (sourceColIndex === targetColIndex && fromIndex === targetIndex) return

      const prevBoard = board

      const nextColumns = board.columns.map(c => ({ ...c, cards: [...c.cards] }))

      if (sourceColIndex === targetColIndex) {
        const col = nextColumns[sourceColIndex]
        col.cards = arrayMove(col.cards, fromIndex, targetIndex).map((card, idx) => ({ ...card, position: idx }))
        setBoard({ ...board, columns: nextColumns })
        try {
          await apiFetch(`/api/cards/${cardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: targetIndex })
          })
        } catch (err) {
          console.error('Card reorder failed, reverting to previous state:', err)
          setBoard(prevBoard)
        }
      } else {
        const fromCol = nextColumns[sourceColIndex]
        const toCol = nextColumns[targetColIndex]
        const [moved] = fromCol.cards.splice(fromIndex, 1)
        toCol.cards.splice(targetIndex, 0, moved)
        fromCol.cards = fromCol.cards.map((card, idx) => ({ ...card, position: idx }))
        toCol.cards = toCol.cards.map((card, idx) => ({ ...card, position: idx }))
        setBoard({ ...board, columns: nextColumns })
        try {
          await apiFetch(`/api/cards/${cardId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId: board.columns[targetColIndex].id, position: targetIndex })
          })
        } catch (err) {
          console.error('Card move failed, reverting to previous state:', err)
          setBoard(prevBoard)
        }
      }
    }
    setActiveCard(null)
  }, [board, setBoard, apiFetch])

  const handleDragCancel = useCallback(() => {
    setActiveCard(null)
  }, [])

  const handleCardClick = useCallback((card: Card) => {
    setSelectedCard(card)
    setIsModalOpen(true)
  }, [])

  const closeTimerRef = useRef<number | null>(null)

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  useEffect(() => {
    if (!isModalOpen && selectedCard) {
      closeTimerRef.current = window.setTimeout(() => {
        setSelectedCard(null)
        closeTimerRef.current = null
      }, 200)
    } else if (isModalOpen && closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [isModalOpen, selectedCard])

  const handleCardUpdated = useCallback((updatedCard: Card) => {
    setBoard(prev => {
      if (!prev) return prev
      return {
        ...prev,
        columns: prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card => 
            card.id === updatedCard.id ? updatedCard : card
          )
        }))
      }
    })
  }, [setBoard])

  // Keep modal card data in sync with board state from websockets
  useEffect(() => {
    if (selectedCard && board) {
      let foundCard: Card | null = null
      for (const column of board.columns) {
        const card = column.cards.find(c => c.id === selectedCard.id)
        if (card) {
          foundCard = card
          break
        }
      }

      if (foundCard && JSON.stringify(foundCard) !== JSON.stringify(selectedCard)) {
        setSelectedCard(foundCard)
      } else if (!foundCard) {
        // Card was deleted by another user, close the modal
        handleModalClose()
      }
    }
  }, [board, selectedCard, handleModalClose])

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h1 style={{ color: '#000', margin: '0 0 8px 0' }}>{board.title}</h1>
            {board.description && <p style={{ color: '#333', margin: 0 }}>{board.description}</p>}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: isConnected ? '#28a745' : '#dc3545'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#28a745' : '#dc3545'
              }} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            
            {onlineUsers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666' }}>
                <span>👥</span>
                <span>{onlineUsers.length} online</span>
                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                  {onlineUsers.slice(0, 3).map((user) => (
                    <div
                      key={user.userId}
                      title={`${user.user.name} (${user.user.email})`}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#007bff',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {user.user.name?.charAt(0) || '?'}
                    </div>
                  ))}
                  {onlineUsers.length > 3 && (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      +{onlineUsers.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd} 
        onDragCancel={handleDragCancel} 
        collisionDetection={closestCenter}
      >
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
                    setBoard(prev => prev ? { ...prev, columns: prev.columns.map(c => c.id === column.id ? { ...c, cards: [...c.cards, newCard] } : c) } : null)
                  }}
                  onColumnUpdated={(updatedColumn) => {
                    setBoard(prev => prev ? { ...prev, columns: prev.columns.map(c => c.id === updatedColumn.id ? updatedColumn : c) } : null)
                  }}
                  onColumnDeleted={(columnId) => {
                    setBoard(prev => prev ? { ...prev, columns: prev.columns.filter(c => c.id !== columnId) } : null)
                  }}
                  onCardUpdated={(updatedCard) => {
                    setBoard(prev => prev ? { ...prev, columns: prev.columns.map(c => c.id === column.id ? { ...c, cards: c.cards.map(card => card.id === updatedCard.id ? updatedCard : card) } : c) } : null)
                  }}
                  onCardDeleted={(cardId) => {
                    setBoard(prev => prev ? { ...prev, columns: prev.columns.map(c => c.id === column.id ? { ...c, cards: c.cards.filter(card => card.id !== cardId) } : c) } : null)
                  }}
                  onCardClick={handleCardClick}
                />
              ))}
          </SortableContext>

          <div style={{ minWidth: '300px', display: 'flex', alignItems: 'flex-start' }}>
            {showCreateColumn ? (
              <div style={{ backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '16px', width: '100%' }}>
                <form onSubmit={handleCreateColumn}>
                  <input
                    type="text"
                    value={columnTitle}
                    onChange={(e) => setColumnTitle(e.target.value)}
                    placeholder="Enter column title"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', color: '#213547', backgroundColor: '#f8f9fa', marginBottom: '12px' }}
                    autoFocus
                    required
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" disabled={createLoading || !columnTitle.trim()} style={{ backgroundColor: createLoading ? '#999' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: createLoading ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                      {createLoading ? 'Adding...' : 'Add'}
                    </button>
                    <button type="button" onClick={() => { setShowCreateColumn(false); setColumnTitle('') }} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button onClick={() => setShowCreateColumn(true)} style={{ width: '100%', padding: '16px', backgroundColor: '#f8f9fa', border: '2px dashed #dee2e6', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#6c757d', transition: 'border-color 0.2s, color 0.2s' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#007bff'; (e.currentTarget as HTMLButtonElement).style.color = '#007bff' }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#dee2e6'; (e.currentTarget as HTMLButtonElement).style.color = '#6c757d' }}>
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

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onCardUpdated={handleCardUpdated}
        />
      )}
    </div>
  )
}
