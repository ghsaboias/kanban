import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useTheme } from '../theme/useTheme'
import { SortableColumn } from './SortableColumn'

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

interface KanbanColumnsProps {
  columns: ColumnData[]
  onCardCreated?: (columnId: string, newCard: CardData) => void
  onColumnUpdated?: (updatedColumn: ColumnData) => void
  onColumnDeleted?: (columnId: string) => void
  onCardUpdated?: (columnId: string, updatedCard: CardData) => void
  onCardDeleted?: (columnId: string, cardId: string) => void
  onCardClick?: (card: CardData) => void
  showCreateColumn?: boolean
  onShowCreateColumn?: (show: boolean) => void
  onCreateColumn?: (title: string) => Promise<void>
  createLoading?: boolean
}

export function KanbanColumns({
  columns,
  onCardCreated,
  onColumnUpdated,
  onColumnDeleted,
  onCardUpdated,
  onCardDeleted,
  onCardClick,
  showCreateColumn = false,
  onShowCreateColumn,
  onCreateColumn,
  createLoading = false
}: KanbanColumnsProps) {
  const { theme } = useTheme()

  const containerStyle = {
    display: 'flex',
    gap: '20px',
    overflowX: 'auto' as const,
    minHeight: '500px',
    padding: '24px',
    paddingBottom: '40px',
    backgroundColor: theme.background,
    // Perf: create its own compositing layer to make horizontal scroll smoother
    willChange: 'transform',
    transform: 'translateZ(0)'
  }

  const createColumnContainerStyle = {
    minWidth: '320px',
    display: 'flex',
    alignItems: 'flex-start'
  }

  const createColumnFormStyle = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.lg || '12px',
    padding: '20px',
    width: '100%',
    boxShadow: theme.shadow?.sm || 'none'
  }

  const createColumnButtonStyle = {
    width: '100%',
    padding: '20px',
    backgroundColor: 'transparent',
    border: `2px dashed ${theme.border}`,
    borderRadius: theme.radius?.lg || '12px',
    cursor: 'pointer',
    fontSize: '16px',
    color: theme.textMuted,
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px'
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '12px 16px',
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.sm || '6px',
    fontSize: '16px',
    color: theme.textPrimary,
    backgroundColor: theme.inputBg,
    marginBottom: '16px',
    outline: 'none'
  }

  const buttonStyle = {
    padding: '10px 20px',
    borderRadius: theme.radius?.sm || '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease'
  }

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.accent,
    color: theme.accentText,
    marginRight: '12px'
  }

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.muted,
    color: theme.accentText
  }

  const handleCreateColumn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    
    if (!title.trim()) return
    
    try {
      await onCreateColumn?.(title.trim())
      onShowCreateColumn?.(false)
    } catch (error) {
      console.error('Error creating column:', error)
    }
  }

  return (
    <div style={containerStyle}>
      <SortableContext
        items={columns.map(c => `column-${c.id}`)}
        strategy={horizontalListSortingStrategy}
      >
        {columns
          .sort((a, b) => a.position - b.position)
          .map(column => (
            <SortableColumn
              key={column.id}
              column={column}
              onCardCreated={(newCard) => onCardCreated?.(column.id, newCard)}
              onColumnUpdated={onColumnUpdated}
              onColumnDeleted={onColumnDeleted}
              onCardUpdated={(updatedCard) => onCardUpdated?.(column.id, updatedCard)}
              onCardDeleted={(cardId) => onCardDeleted?.(column.id, cardId)}
              onCardClick={onCardClick}
            />
          ))}
      </SortableContext>

      {/* Create New Column */}
      <div style={createColumnContainerStyle}>
        {showCreateColumn ? (
          <div style={createColumnFormStyle}>
            <form onSubmit={handleCreateColumn}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: theme.textPrimary
              }}>
                Add New Column
              </h3>
              
              <input
                name="title"
                type="text"
                placeholder="Enter column title..."
                style={inputStyle}
                autoFocus
                required
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.accent || '#007AFF'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.border || '#e1e8ed'
                }}
              />
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    ...primaryButtonStyle,
                    backgroundColor: createLoading ? theme.muted : theme.accent,
                    cursor: createLoading ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!createLoading) {
                      e.currentTarget.style.backgroundColor = theme.accentHover || '#0056CC'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!createLoading) {
                      e.currentTarget.style.backgroundColor = theme.accent || '#007AFF'
                    }
                  }}
                >
                  {createLoading ? 'Creating...' : 'Create Column'}
                </button>
                
                <button
                  type="button"
                  onClick={() => onShowCreateColumn?.(false)}
                  style={secondaryButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.textMuted || '#8e959d'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.muted || '#6c757d'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => onShowCreateColumn?.(true)}
            style={createColumnButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = theme.accent || '#007AFF'
              e.currentTarget.style.color = theme.accent || '#007AFF'
              e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f6f8fa'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.border || '#e1e8ed'
              e.currentTarget.style.color = theme.textMuted || '#6c757d'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <span style={{ fontSize: '24px' }}>+</span>
            <span>Add New Column</span>
          </button>
        )}
      </div>
    </div>
  )
}
