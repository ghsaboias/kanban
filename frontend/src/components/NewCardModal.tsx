import { useEffect, useState } from 'react'
import { useTheme } from '../theme/useTheme'
import type { ApiResponse } from '../types/api'
import { useApi } from '../useApi'

interface User {
  id: string
  name: string
  email: string
}

interface Column {
  id: string
  title: string
  position: number
  cards: CardData[]
}

interface NewCardModalProps {
  isOpen: boolean
  onClose: () => void
  columns: Column[]
  onCardCreated: (columnId: string, newCard: CardData) => void
}

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

export function NewCardModal({ isOpen, onClose, columns, onCardCreated }: NewCardModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [createLoading, setCreateLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    assigneeId: '',
    columnId: columns.length > 0 ? columns[0].id : ''
  })
  const { apiFetch } = useApi()
  const { theme } = useTheme()

  useEffect(() => {
    if (isOpen) {
      // Reset form data and set default column to first column
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assigneeId: '',
        columnId: columns.length > 0 ? columns[0].id : ''
      })

      // Fetch users for assignment
      apiFetch('/api/users')
        .then((response: Response) => response.json())
        .then((data: ApiResponse<User[]>) => {
          if (data.success) {
            setUsers(Array.isArray(data.data) ? data.data : [])
          }
        })
        .catch((err: unknown) => console.error('Error loading users:', err))
    }
  }, [apiFetch, isOpen, columns])

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setCreateLoading(true)
    try {
      const response = await apiFetch(`/api/columns/${formData.columnId}/cards`, {
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
        onCardCreated(formData.columnId, result.data)
        onClose()
      } else {
        console.error('Failed to create card:', result.error)
      }
    } catch (err) {
      console.error('Error creating card:', err)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const modalBackdropStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }

  const modalStyle = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.lg || '12px',
    padding: theme.spacing?.lg || '24px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: theme.shadow?.lg || '0 4px 12px rgba(0,0,0,0.15)'
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: `${theme.spacing?.sm || '8px'} ${theme.spacing?.sm || '12px'}`,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.sm || '4px',
    backgroundColor: theme.inputBg,
    fontSize: '14px',
    fontFamily: 'inherit',
    color: theme.textPrimary,
    marginBottom: theme.spacing?.sm || '12px',
    outline: 'none'
  }

  const selectStyle = {
    ...inputStyle,
    paddingRight: '36px',
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
    backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'%236c757d\'><path d=\'M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z\'/></svg>")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    backgroundSize: '16px 16px'
  }

  const buttonStyle = {
    padding: `${theme.spacing?.sm || '8px'} ${theme.spacing?.md || '16px'}`,
    borderRadius: theme.radius?.sm || '4px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease'
  }

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: createLoading ? theme.muted : theme.accent,
    color: theme.accentText,
    marginRight: theme.spacing?.sm || '12px'
  }

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.muted,
    color: theme.accentText
  }

  return (
    <div 
      style={modalBackdropStyle} 
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 
          id="modal-title"
          style={{
            margin: `0 0 ${theme.spacing?.lg || '20px'} 0`,
            fontSize: '20px',
            fontWeight: '600',
            color: theme.textPrimary
          }}
        >
          Create New Card
        </h2>

        <form onSubmit={handleCreateCard}>
          {/* Column Selector */}
          <div style={{ marginBottom: theme.spacing?.sm || '12px' }}>
            <label 
              htmlFor="column-select"
              style={{
                display: 'block',
                marginBottom: theme.spacing?.xs || '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: theme.textSecondary
              }}
            >
              Column
            </label>
            <select
              id="column-select"
              value={formData.columnId}
              onChange={(e) => setFormData(prev => ({ ...prev, columnId: e.target.value }))}
              style={selectStyle}
              required
            >
              {columns
                .sort((a, b) => a.position - b.position)
                .map(column => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
            </select>
          </div>

          {/* Title */}
          <div style={{ marginBottom: theme.spacing?.sm || '12px' }}>
            <label 
              htmlFor="card-title"
              style={{
                display: 'block',
                marginBottom: theme.spacing?.xs || '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: theme.textSecondary
              }}
            >
              Title
            </label>
            <input
              id="card-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter card title"
              style={inputStyle}
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: theme.spacing?.sm || '12px' }}>
            <label 
              htmlFor="card-description"
              style={{
                display: 'block',
                marginBottom: theme.spacing?.xs || '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: theme.textSecondary
              }}
            >
              Description
            </label>
            <textarea
              id="card-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description (optional)"
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical' as const
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: theme.spacing?.sm || '12px', marginBottom: theme.spacing?.lg || '20px' }}>
            {/* Priority */}
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="card-priority"
                style={{
                  display: 'block',
                  marginBottom: theme.spacing?.xs || '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.textSecondary
                }}
              >
                Priority
              </label>
              <select
                id="card-priority"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' }))}
                style={selectStyle}
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
              </select>
            </div>

            {/* Assignee */}
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="card-assignee"
                style={{
                  display: 'block',
                  marginBottom: theme.spacing?.xs || '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.textSecondary
                }}
              >
                Assignee
              </label>
              <select
                id="card-assignee"
                value={formData.assigneeId}
                onChange={(e) => setFormData(prev => ({ ...prev, assigneeId: e.target.value }))}
                style={selectStyle}
              >
                <option value="">Sem responsável</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={createLoading || !formData.title.trim()}
              style={{
                ...primaryButtonStyle,
                cursor: createLoading || !formData.title.trim() ? 'not-allowed' : 'pointer',
                opacity: createLoading || !formData.title.trim() ? 0.7 : 1
              }}
            >
              {createLoading ? 'Creating...' : 'Create Card'}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              style={secondaryButtonStyle}
              disabled={createLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
