import { useState, useEffect } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { SortableCard } from './SortableCard'
import { useApi } from '../useApi'
import type { ApiResponse } from '../types/api'

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
  const { apiFetch } = useApi()

  useEffect(() => {
    // Fetch users for assignment
    apiFetch('/api/users')
      .then((response: Response) => response.json())
      .then((data: ApiResponse<User[]>) => {
        if (data.success) {
          setUsers(data.data)
        }
      })
      .catch((err: unknown) => console.error('Error loading users:', err))
  }, [])

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setCreateLoading(true)
    try {
      const response = await apiFetch(`/api/columns/${column.id}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          assigneeId: formData.assigneeId || null
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
      const response = await apiFetch(`/api/columns/${column.id}`, {
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
      const response = await apiFetch(`/api/columns/${column.id}`, {
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
    <div data-testid={`column-${column.id}`} style={{ 
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
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              border: '1px solid #007bff',
              borderRadius: '4px',
              boxSizing: 'border-box',
              padding: '0 8px',
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: '24px',
              height: '24px',
              color: '#213547',
              background: 'white',
              flex: 1,
              marginRight: '8px',
              minWidth: 0,
              outline: 'none'
            }}
            autoFocus
            aria-label="Edit column title"
          />
        ) : (
          <h3 
            style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: 600,
              lineHeight: '24px',
              height: '24px',
              cursor: 'pointer',
              flex: 1,
              color: '#000',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0
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
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    color: '#213547'
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
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    color: '#213547',
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
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    paddingRight: '36px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    color: '#213547',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'%236c757d\'><path d=\'M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z\'/></svg>")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    backgroundSize: '16px 16px'
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
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    paddingRight: '36px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    color: '#213547',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'%236c757d\'><path d=\'M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z\'/></svg>")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    backgroundSize: '16px 16px'
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
              padding: '16px',
              backgroundColor: '#f8f9fa',
              border: '2px dashed #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#6c757d',
              marginTop: '8px',
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
            + Add a card
          </button>
        )}
      </div>
    </div>
  )
}
