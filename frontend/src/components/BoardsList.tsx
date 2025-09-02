import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../useApi'
import type { ApiResponse } from '../types/api'
import { useTheme } from '../theme/useTheme'
import { useAsyncOperation } from '../hooks/useAsyncOperation'

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
  const { theme } = useTheme()
  const [boards, setBoards] = useState<Board[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', template: 'none' })
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { apiFetch } = useApi()
  
  // Use async operation hook for loading boards
  const {
    loading,
    error,
    execute: loadBoards,
    setError
  } = useAsyncOperation<Board[]>()
  
  // Use async operation hook for creating boards
  const {
    loading: createLoading,
    execute: executeCreateBoard
  } = useAsyncOperation<Board>()

  const templates = [
    {
      key: 'ma-pipeline-en',
      name: 'M&A Pipeline (EN)',
      description: 'Prospecting → Screening → Materials Preparation → NDA/Teaser → Management Presentation → LOI → Due Diligence → SPA/SHA → Closing',
      columns: [
        'Prospecting',
        'Screening', 
        'Materials Preparation (CIM/Info Pack)',
        'NDA/Teaser (GTM)',
        'Management Presentation',
        'LOI',
        'Due Diligence',
        'SPA/SHA',
        'Closing',
      ],
    },
  ]

  const createTemplateColumns = async (boardId: string, templateKey: string) => {
    const template = templates.find(t => t.key === templateKey)
    if (!template) return

    for (const columnTitle of template.columns) {
      try {
        await apiFetch(`/api/boards/${boardId}/columns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: columnTitle })
        })
      } catch (error) {
        console.warn('Failed to create column:', columnTitle, error)
      }
    }
  }

  useEffect(() => {
    const fetchBoards = async () => {
      const response = await apiFetch('/api/boards')
      const data: ApiResponse<Board[]> = await response.json()
      
      if (data.success) {
        setBoards(data.data)
        return data.data
      } else {
        throw new Error(data.error || 'Failed to load boards')
      }
    }
    
    loadBoards(fetchBoards)
  }, [apiFetch, loadBoards])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCreateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    const createBoardOperation = async () => {
      const response = await apiFetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null
        })
      })

      const result = await response.json()
      if (result.success) {
        const boardId = result.data.id
        
        // If template is selected, create columns from template
        if (formData.template !== 'none') {
          await createTemplateColumns(boardId, formData.template)
        }
        
        setBoards(prev => [result.data, ...prev])
        setFormData({ title: '', description: '', template: 'none' })
        setShowCreateForm(false)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create board')
      }
    }

    try {
      await executeCreateBoard(createBoardOperation)
    } catch {
      // Error is handled by useAsyncOperation
    }
  }


  const handleEditBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBoard || !formData.title.trim()) return

    const editBoardOperation = async () => {
      const response = await apiFetch(`/api/boards/${editingBoard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null
        })
      })

      const result = await response.json()
      if (result.success) {
        setBoards(prev => prev.map(board =>
          board.id === editingBoard.id ? result.data : board
        ))
        setFormData({ title: '', description: '', template: 'none' })
        setEditingBoard(null)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update board')
      }
    }

    try {
      await executeCreateBoard(editBoardOperation)
    } catch {
      // Error is handled by useAsyncOperation
    }
  }

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      return
    }

    setDeleteLoading(boardId)
    try {
      const response = await apiFetch(`/api/boards/${boardId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        setBoards(prev => prev.filter(board => board.id !== boardId))
      } else {
        setError('Failed to delete board')
      }
    } catch {
      setError('Error deleting board')
    } finally {
      setDeleteLoading(null)
    }
  }

  const startEdit = (board: Board) => {
    setEditingBoard(board)
    setFormData({ title: board.title, description: board.description || '', template: 'none' })
    setShowCreateForm(true)
  }

  if (loading) return <div>Loading boards...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div style={{ padding: theme.spacing?.lg || '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing?.xl || '24px' }}>
        <h1 style={{ margin: 0, color: theme.textPrimary }}>Kanban Boards</h1>
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowCreateDropdown(!showCreateDropdown)}
            style={{
              backgroundColor: theme.accent,
              color: theme.accentText,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radius?.sm || '6px',
              padding: `${theme.spacing?.sm || '10px'} ${theme.spacing?.md || '16px'}`,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            + Create Board
            <span style={{ fontSize: '12px' }}>▼</span>
          </button>
          {showCreateDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radius?.md || '8px',
              boxShadow: theme.shadow?.lg || '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 10,
              minWidth: '200px'
            }}>
              <button
                onClick={() => {
                  setShowCreateForm(true)
                  setShowCreateDropdown(false)
                }}
                style={{
                  width: '100%',
                  padding: `${theme.spacing?.sm || '10px'} ${theme.spacing?.md || '16px'}`,
                  backgroundColor: 'transparent',
                  color: theme.textPrimary,
                  border: 'none',
                  borderRadius: `${theme.radius?.md || '8px'} ${theme.radius?.md || '8px'} 0 0`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  borderBottom: `1px solid ${theme.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceAlt || 'rgba(0,0,0,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                Create Empty Board
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(true)
                  setShowCreateDropdown(false)
                }}
                style={{
                  width: '100%',
                  padding: `${theme.spacing?.sm || '10px'} ${theme.spacing?.md || '16px'}`,
                  backgroundColor: 'transparent',
                  color: theme.textPrimary,
                  border: 'none',
                  borderRadius: `0 0 ${theme.radius?.md || '8px'} ${theme.radius?.md || '8px'}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceAlt || 'rgba(0,0,0,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                Create from Template
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius?.md || '8px',
          padding: theme.spacing?.lg || '20px',
          marginBottom: theme.spacing?.xl || '24px'
        }}>
          <h3 style={{ margin: `0 0 ${theme.spacing?.md || '16px'} 0`, color: theme.textPrimary }}>
            {editingBoard ? 'Edit Board' : 'Create New Board'}
          </h3>
          <form onSubmit={editingBoard ? handleEditBoard : handleCreateBoard}>
            <div style={{ marginBottom: theme.spacing?.md || '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: theme.textPrimary }}>
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter board title"
                style={{
                  width: '100%',
                  padding: `${theme.spacing?.sm || '8px'} ${theme.spacing?.md || '12px'}`,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius?.sm || '4px',
                  fontSize: '14px',
                  color: theme.textPrimary,
                  backgroundColor: theme.inputBg
                }}
                required
              />
            </div>
            <div style={{ marginBottom: theme.spacing?.md || '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: theme.textPrimary }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter board description (optional)"
                rows={3}
                style={{
                  width: '100%',
                  padding: `${theme.spacing?.sm || '8px'} ${theme.spacing?.md || '12px'}`,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius?.sm || '4px',
                  fontSize: '14px',
                  color: theme.textPrimary,
                  backgroundColor: theme.inputBg,
                  resize: 'vertical'
                }}
              />
            </div>
            {!editingBoard && (
              <div style={{ marginBottom: theme.spacing?.md || '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: theme.textPrimary }}>
                  Template
                </label>
                <select
                  value={formData.template}
                  onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing?.sm || '8px'} ${theme.spacing?.md || '12px'}`,
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radius?.sm || '4px',
                    fontSize: '14px',
                    color: theme.textPrimary,
                    backgroundColor: theme.inputBg
                  }}
                >
                  <option value="none">Empty Board (No Template)</option>
                  {templates.map(template => (
                    <option key={template.key} value={template.key}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {formData.template !== 'none' && (
                  <div style={{ 
                    marginTop: '4px', 
                    fontSize: '12px', 
                    color: theme.textSecondary,
                    fontStyle: 'italic'
                  }}>
                    {templates.find(t => t.key === formData.template)?.description}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: theme.spacing?.md || '12px' }}>
              <button
                type="submit"
                disabled={createLoading || !formData.title.trim()}
                style={{
                  backgroundColor: createLoading ? theme.muted : theme.accent,
                  color: theme.accentText,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius?.sm || '4px',
                  padding: '8px 16px',
                  cursor: createLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {createLoading
                  ? (editingBoard ? 'Updating...' : 'Creating...')
                  : (editingBoard ? 'Update Board' : 'Create Board')
                }
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setFormData({ title: '', description: '', template: 'none' })
                  setEditingBoard(null)
                }}
                style={{
                  backgroundColor: theme.muted,
                  color: theme.accentText,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius?.sm || '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {boards.length === 0 ? (
        <p>No boards found</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {boards.map(board => (
            <div
              key={board.id}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius?.md || '8px',
                padding: theme.spacing?.md || '16px',
                transition: 'box-shadow 0.2s',
                backgroundColor: theme.card,
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                display: 'flex',
                gap: '4px'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startEdit(board)
                  }}
                  style={{
                    backgroundColor: theme.accent,
                    color: theme.accentText,
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radius?.sm || '4px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBoard(board.id)
                  }}
                  disabled={deleteLoading === board.id}
                  style={{
                    backgroundColor: deleteLoading === board.id ? theme.muted : (theme.danger || '#dc3545'),
                    color: theme.accentText,
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radius?.sm || '4px',
                    padding: '4px 8px',
                    cursor: deleteLoading === board.id ? 'not-allowed' : 'pointer',
                    fontSize: '10px'
                  }}
                >
                  {deleteLoading === board.id ? '...' : 'Delete'}
                </button>
              </div>

              <Link
                to={`/board/${board.id}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <h3 style={{ margin: '0 0 8px 0', paddingRight: '80px', color: theme.textPrimary }}>{board.title}</h3>
                {board.description && <p style={{ margin: '0 0 12px 0', color: theme.textSecondary }}>{board.description}</p>}
                <p style={{ fontSize: '14px', color: theme.textSecondary, margin: '0 0 8px 0' }}>
                  {(board._count?.columns ?? 0)} columns
                </p>
                <p style={{ fontSize: '12px', color: theme.textSecondary, margin: 0 }}>
                  Created: {new Date(board.createdAt).toLocaleDateString()}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
