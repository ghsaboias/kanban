import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../useApi'
import type { ApiResponse } from '../types/api'
import { useTheme } from '../theme/ThemeProvider'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '' })
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const apiFetch = useApi()

  useEffect(() => {
    apiFetch('/api/boards')
      .then((response: Response) => response.json())
      .then((data: ApiResponse<Board[]>) => {
        if (data.success) {
          setBoards(data.data)
        } else {
          setError('Failed to load boards')
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError('Error connecting to API: ' + msg)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setCreateLoading(true)
    try {
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
        setBoards(prev => [result.data, ...prev])
        setFormData({ title: '', description: '' })
        setShowCreateForm(false)
      } else {
        setError('Failed to create board')
      }
    } catch (err) {
      setError('Error creating board')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBoard || !formData.title.trim()) return

    setCreateLoading(true)
    try {
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
        setFormData({ title: '', description: '' })
        setEditingBoard(null)
      } else {
        setError('Failed to update board')
      }
    } catch (err) {
      setError('Error updating board')
    } finally {
      setCreateLoading(false)
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
    } catch (err) {
      setError('Error deleting board')
    } finally {
      setDeleteLoading(null)
    }
  }

  const startEdit = (board: Board) => {
    setEditingBoard(board)
    setFormData({ title: board.title, description: board.description || '' })
    setShowCreateForm(true)
  }

  if (loading) return <div>Loading boards...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, color: theme.textPrimary }}>Kanban Boards</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            backgroundColor: theme.accent,
            color: theme.accentText,
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          + Create Board
        </button>
      </div>

      {showCreateForm && (
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: theme.textPrimary }}>
            {editingBoard ? 'Edit Board' : 'Create New Board'}
          </h3>
          <form onSubmit={editingBoard ? handleEditBoard : handleCreateBoard}>
            <div style={{ marginBottom: '16px' }}>
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
                  padding: '8px 12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: theme.textPrimary,
                  backgroundColor: theme.inputBg
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
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
                  padding: '8px 12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: theme.textPrimary,
                  backgroundColor: theme.inputBg,
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={createLoading || !formData.title.trim()}
                style={{
                  backgroundColor: createLoading ? theme.muted : theme.accent,
                  color: theme.accentText,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
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
                  setFormData({ title: '', description: '' })
                  setEditingBoard(null)
                }}
                style={{
                  backgroundColor: theme.muted,
                  color: theme.accentText,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
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
                borderRadius: '8px',
                padding: '16px',
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
                    borderRadius: '4px',
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
                    borderRadius: '4px',
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
