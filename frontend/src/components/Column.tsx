import { useState, useEffect } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { SortableCard } from './SortableCard'

interface CardData {
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
  cards: CardData[]
}

interface ColumnProps {
  column: ColumnData
  onCardCreated?: (newCard: CardData) => void
  onColumnUpdated?: (updatedColumn: ColumnData) => void
  onColumnDeleted?: (columnId: string) => void
  onCardUpdated?: (updatedCard: CardData) => void
  onCardDeleted?: (cardId: string) => void
  onCardClick?: (card: CardData) => void
}

interface User {
  id: string
  name: string
  email: string
}

export function Column({ column, onCardCreated, onColumnUpdated, onColumnDeleted, onCardUpdated, onCardDeleted, onCardClick }: ColumnProps) {
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    assigneeId: ''
  })
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(column.title)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: `column-${column.id}` })

  useEffect(() => {
    // Fetch users for assignment
    fetch('http://localhost:3001/api/users')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setUsers(data.data)
        }
      })
      .catch(err => console.error('Error loading users:', err))
  }, [])

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setCreateLoading(true)
    try {
      // We need a default user for createdById - using first user or empty string
      const createdById = users.length > 0 ? users[0].id : ''
      
      const response = await fetch(`http://localhost:3001/api/columns/${column.id}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          assigneeId: formData.assigneeId || null,
          createdById
        })
      })

      const result = await response.json()
      if (result.success) {
        onCardCreated?.(result.data)
        setFormData({ title: '', description: '', priority: 'MEDIUM', assigneeId: '' })
        setShowCreateCard(false)
      } else {
        console.error('Failed to create card:', result.error)
      }
    } catch (err) {
      console.error('Error creating card:', err)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdateTitle = async () => {
    if (!titleValue.trim() || titleValue === column.title) {
      setTitleValue(column.title)
      setEditingTitle(false)
      return
    }

    try {
      const response = await fetch(`http://localhost:3001/api/columns/${column.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: titleValue.trim()
        })
      })

      const result = await response.json()
      if (result.success) {
        onColumnUpdated?.({ ...column, title: result.data.title })
        setEditingTitle(false)
      } else {
        console.error('Failed to update column')
        setTitleValue(column.title)
        setEditingTitle(false)
      }
    } catch (err) {
      console.error('Error updating column:', err)
      setTitleValue(column.title)
      setEditingTitle(false)
    }
  }

  const handleDeleteColumn = async () => {
    if (column.cards.length > 0) {
      alert('Cannot delete a column that contains cards. Please move or delete all cards first.')
      return
    }

    if (!confirm('Are you sure you want to delete this column?')) {
      return
    }

    setDeleteLoading(true)
    try {
      const response = await fetch(`http://localhost:3001/api/columns/${column.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        onColumnDeleted?.(column.id)
      } else {
        console.error('Failed to delete column')
      }
    } catch (err) {
      console.error('Error deleting column:', err)
    } finally {
      setDeleteLoading(false)
    }
  }
  return (
    <div style={{ 
      minWidth: '300px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        {editingTitle ? (
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleUpdateTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdateTitle()
              if (e.key === 'Escape') {
                setTitleValue(column.title)
                setEditingTitle(false)
              }
            }}
            style={{
              border: '1px solid #007bff',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'white',
              flex: 1,
              marginRight: '8px'
            }}
            autoFocus
          />
        ) : (
          <h3 
            style={{ 
              margin: 0, 
              fontSize: '16px', 
              cursor: 'pointer',
              flex: 1,
              color: '#000'
            }}
            onClick={() => setEditingTitle(true)}
          >
            {column.title}
          </h3>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            aria-label="Card count"
            style={{
              backgroundColor: '#eef2f7',
              color: '#374151',
              height: '24px',
              minWidth: '24px',
              padding: '0 8px',
              boxSizing: 'border-box',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              lineHeight: 1,
              userSelect: 'none'
            }}
          >
            {column.cards.length > 99 ? '99+' : column.cards.length}
          </div>
          <div style={{ width: '1px', height: '16px', backgroundColor: '#e5e7eb' }} />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteColumn()
            }}
            disabled={deleteLoading}
            style={{
              backgroundColor: deleteLoading ? '#999' : 'white',
              color: deleteLoading ? 'white' : '#dc3545',
              border: deleteLoading ? '1px solid #999' : '1px solid #e5e7eb',
              width: '24px',
              height: '24px',
              minWidth: '24px',
              padding: 0,
              boxSizing: 'border-box',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: deleteLoading ? 'not-allowed' : 'pointer',
              lineHeight: 1,
              colorScheme: 'light'
            }}
            title={deleteLoading ? 'Deleting…' : 'Delete column'}
            onMouseEnter={(e) => {
              if (!deleteLoading) {
                e.currentTarget.style.backgroundColor = '#dc3545'
                e.currentTarget.style.borderColor = '#dc3545'
                e.currentTarget.style.color = 'white'
              }
            }}
            onMouseLeave={(e) => {
              if (!deleteLoading) {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.color = '#dc3545'
              }
            }}
          >
            {deleteLoading ? (
              '…'
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
                style={{ display: 'block' }}
              >
                <path
                  d="M3 6h18M8 6V4h8v2m1 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <div ref={setDroppableNodeRef} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SortableContext items={column.cards.map(c => `card-${c.id}`)} strategy={verticalListSortingStrategy}>
          {column.cards
            .sort((a, b) => a.position - b.position)
            .map(card => (
              <SortableCard 
                key={card.id} 
                card={card}
                onCardUpdated={onCardUpdated}
                onCardDeleted={onCardDeleted}
                onCardClick={onCardClick}
              />
            ))}
        </SortableContext>
        
        {column.cards.length === 0 && !showCreateCard && (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#333',
            fontStyle: 'italic'
          }}>
            No cards in this column
          </div>
        )}

        {showCreateCard && (
          <div 
            style={{
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '8px'
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleCreateCard}>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter card title"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description (optional)"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' }))}
                  style={{
                    flex: 1,
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                </select>

                <select
                  value={formData.assigneeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigneeId: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '6px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <option value="">Sem responsável</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={createLoading || !formData.title.trim()}
                  style={{
                    backgroundColor: createLoading ? '#999' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: createLoading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    flex: 1
                  }}
                >
                  {createLoading ? 'Adding...' : 'Add Card'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCard(false)
                    setFormData({ title: '', description: '', priority: 'MEDIUM', assigneeId: '' })
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
        )}

        {!showCreateCard && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowCreateCard(true)}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#333',
              marginTop: '8px'
            }}
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  )
}
