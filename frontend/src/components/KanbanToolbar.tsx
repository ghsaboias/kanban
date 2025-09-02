import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppearance } from '../appearance'
import { useApi } from '../useApi'
import { NewCardModal } from './NewCardModal'
import { TemplateImportModal } from './TemplateImportModal'

interface Column {
  id: string
  title: string
  position: number
  cards: CardData[]
}

interface KanbanToolbarProps {
  onFilter?: (filter: string) => void
  onSort?: () => void
  onSearch?: (query: string) => void
  onNewCard?: () => void
  onExpandView?: () => void
  onShowMoreOptions?: () => void
  onExportClick?: () => void
  onReloadBoard?: () => Promise<void> | void
  onCardCreated?: (columnId: string, newCard: CardData) => void
  onShowCreateColumn?: (show: boolean) => void
  columns?: Column[]
  activeSort?: string
  activeFilter?: string
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

export function KanbanToolbar({
  onFilter,
  onSort,
  onSearch,
  onExpandView,
  onExportClick,
  onReloadBoard,
  onCardCreated,
  onShowCreateColumn,
  columns = [],
  activeSort = 'position',
  activeFilter = 'all',
  isCompact,
  boardId,
}: KanbanToolbarProps & { isCompact?: boolean, boardId?: string }) {
  const { theme } = useAppearance()
  const { apiFetch } = useApi()
  const [searchQuery, setSearchQuery] = useState('')
  const rightRef = useRef<HTMLDivElement>(null)
  const [rightWidth, setRightWidth] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [showNewDropdown, setShowNewDropdown] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [moreMenuPos, setMoreMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showNewCardModal, setShowNewCardModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const moreOptionsRef = useRef<HTMLDivElement>(null)
  const moreDropdownRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const newDropdownRef = useRef<HTMLDivElement>(null)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const handleFilter = (filter: string) => {
    onFilter?.(filter)
    setShowFilters(false)
  }

  const handleSort = () => {
    onSort?.()
  }

  const handleDeleteAllColumns = async () => {
    if (deletingAll) return
    if (!columns || columns.length === 0) return
    const ok = window.confirm('Clear the board? This will delete all columns and cards. This cannot be undone.')
    if (!ok) return
    try {
      setDeletingAll(true)
      for (const col of columns) {
        const cards = Array.isArray(col.cards) ? col.cards : []
        for (const card of cards) {
          try {
            await apiFetch(`/api/cards/${card.id}`, { method: 'DELETE' })
          } catch {
            console.warn('Failed to delete card', card.id)
          }
        }
        try {
          await apiFetch(`/api/columns/${col.id}`, { method: 'DELETE' })
        } catch {
          console.warn('Failed to delete column', col.id)
        }
      }
      // Refresh board to reflect changes locally
      await onReloadBoard?.()
    } finally {
      setDeletingAll(false)
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // Close More menu if click is outside both the button wrapper and the portal dropdown
      if (
        showMoreOptions &&
        moreOptionsRef.current &&
        !moreOptionsRef.current.contains(target) &&
        (!moreDropdownRef.current || !moreDropdownRef.current.contains(target))
      ) {
        setShowMoreOptions(false)
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false)
      }
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target as Node)) {
        setShowNewDropdown(false)
      }
    }

    if (showMoreOptions || showFilters || showNewDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreOptions, showFilters, showNewDropdown])

  // Measure right controls width so the left scroller doesn't underlap it
  useEffect(() => {
    const el = rightRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      // Add small buffer for gaps
      setRightWidth(Math.ceil(rect.width) + 8)
    }

    measure()

    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure())
      ro.observe(el)
    } else {
      window.addEventListener('resize', measure)
    }

    return () => {
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', measure)
    }
  }, [])

  const toolbarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing?.md || '16px'} ${theme.spacing?.lg || '24px'}`,
    backgroundColor: theme.surface,
    borderBottom: `1px solid ${theme.border}`,
    boxShadow: theme.shadow?.sm || 'none'
  }

  const leftSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing?.sm || '12px',
    flex: 1,
    minWidth: 0,
    overflowX: 'auto' as const,
    // Allow dropdowns (Filter/More) to render outside the row height without being clipped
    overflowY: 'visible' as const,
    whiteSpace: 'nowrap' as const,
    WebkitOverflowScrolling: 'touch' as const,
    maxWidth: `calc(100% - ${rightWidth}px)`
  }

  const rightSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing?.sm || '8px',
    flexShrink: 0
  }

  const buttonStyle = {
    padding: isCompact ? '8px 8px' : '8px 12px',
    backgroundColor: 'transparent',
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.sm || '4px',
    color: theme.textSecondary,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: isCompact ? '4px' : '6px',
    transition: 'all 0.2s ease'
  }

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.accent,
    color: theme.accentText,
    borderColor: theme.accent
  }

  const searchInputStyle = {
    padding: isCompact ? '8px 8px' : '8px 12px',
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.sm || '4px',
    backgroundColor: theme.inputBg,
    color: theme.textPrimary,
    fontSize: '14px',
    width: isCompact ? '180px' : '240px',
    minWidth: isCompact ? '80px' : '120px',
    outline: 'none',
    flexShrink: 1
  }

  const newButtonStyle = {
    padding: isCompact ? '8px 12px' : '8px 16px',
    backgroundColor: theme.accent,
    color: theme.accentText,
    border: 'none',
    borderRadius: theme.radius?.sm || '4px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: isCompact ? '4px' : '6px',
    transition: 'all 0.2s ease'
  }

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    marginTop: theme.spacing?.xs || '4px',
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.md || '6px',
    boxShadow: theme.shadow?.lg || '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '160px',
    zIndex: 1000
  }

  const dropdownItemStyle = {
    padding: `${theme.spacing?.sm || '8px'} ${theme.spacing?.md || '12px'}`,
    fontSize: '14px',
    color: theme.textSecondary,
    cursor: 'pointer',
    borderBottom: `1px solid ${theme.border}`,
    transition: 'background-color 0.2s ease'
  }

  return (
    <div style={toolbarStyle}>
      <div style={leftSectionStyle}>
        {/* Board View Tab */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isCompact ? 0 : (theme.spacing?.xs || '4px'),
          padding: isCompact ? '8px 8px' : '8px 16px',
          backgroundColor: theme.accent,
          color: theme.accentText,
          borderRadius: theme.radius?.sm || '4px',
          fontSize: '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'padding 0.3s ease, gap 0.3s ease'
        }}>
          <span aria-hidden>🧠</span>
          <span style={{
            maxWidth: isCompact ? '0px' : '200px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            opacity: isCompact ? 0 : 1,
            transition: 'max-width 0.25s ease, opacity 0.2s ease'
          }}>
            Board view
          </span>
        </div>

        {/* Filter Button */}
        <div ref={filterRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              ...activeFilter !== 'all' ? activeButtonStyle : buttonStyle,
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (activeFilter === 'all') {
                e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
              }
            }}
            onMouseLeave={(e) => {
              if (activeFilter === 'all') {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            {isCompact ? 'Filter' : 'Filter'}
          </button>

          {showFilters && (
            <div style={dropdownStyle}>
              {['all', 'high', 'medium', 'low'].map((filter) => (
                <div
                  key={filter}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor: activeFilter === filter ? theme.surfaceAlt : 'transparent'
                  }}
                  onClick={() => handleFilter(filter)}
                  onMouseEnter={(e) => {
                    if (activeFilter !== filter) {
                      e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeFilter !== filter) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {filter === 'all' ? 'All Cards' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Priority`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sort Button */}
        <button
          onClick={() => handleSort()}
          style={{
            ...activeSort !== 'position' ? activeButtonStyle : buttonStyle,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            if (activeSort === 'position') {
              e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
            }
          }}
          onMouseLeave={(e) => {
            if (activeSort === 'position') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        >
          {isCompact ? 'Priority' : 'Sort by Priority'}
        </button>

        {/* Clear Board */}
        <button
          onClick={handleDeleteAllColumns}
          disabled={deletingAll}
          style={{
            ...buttonStyle,
            color: deletingAll ? theme.accentText : (theme.danger || '#dc3545'),
            borderColor: deletingAll ? theme.muted : (theme.danger || '#dc3545'),
            backgroundColor: deletingAll ? theme.muted : 'transparent',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
          title="Clear board"
          onMouseEnter={(e) => {
            if (!deletingAll) e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
          }}
          onMouseLeave={(e) => {
            if (!deletingAll) e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {deletingAll ? 'Clearing…' : 'Clear Board'}
        </button>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={searchInputStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.accent || '#007AFF'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.border || '#e1e8ed'
          }}
        />

        {/* Expand Button */}
        <button
          onClick={onExpandView}
          style={{
            ...buttonStyle,
            flexShrink: 0
          }}
          title="Expand view"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <span>🔍</span>
        </button>

        {/* More Options */}
        <div ref={moreOptionsRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => {
              if (!showMoreOptions) {
                const el = moreOptionsRef.current
                if (el) {
                  const rect = el.getBoundingClientRect()
                  setMoreMenuPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width })
                }
              }
              setShowMoreOptions(prev => !prev)
            }}
            style={{
              ...buttonStyle,
              flexShrink: 0
            }}
            title="More options"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <span>⋯</span>
          </button>

          {showMoreOptions && moreMenuPos && createPortal(
            <div
              ref={moreDropdownRef}
              style={{
                position: 'fixed',
                top: `${moreMenuPos.top}px`,
                left: `${moreMenuPos.left}px`,
                marginTop: theme.spacing?.xs || '4px',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius?.md || '6px',
                boxShadow: theme.shadow?.lg || '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '200px',
                zIndex: 9999
              }}
            >
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  onExportClick?.()
                  setShowMoreOptions(false)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                📤 Export Board
              </div>
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  console.log('Board settings')
                  setShowMoreOptions(false)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                ⚙️ Board Settings
              </div>
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  console.log('View activity')
                  setShowMoreOptions(false)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                📊 View Activity
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      <div ref={rightRef} style={rightSectionStyle}>
        {/* New Button */}
        <div ref={newDropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNewDropdown(!showNewDropdown)}
            style={newButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.accentHover || '#0056CC'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.accent || '#007AFF'
            }}
          >
            New
            <span style={{ fontSize: '12px' }}>▼</span>
          </button>

          {showNewDropdown && (
            <div style={{
              ...dropdownStyle,
              right: '0',
              left: 'auto'
            }}>
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  setShowNewCardModal(true)
                  setShowNewDropdown(false)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                ✏️ New Card
              </div>
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  onShowCreateColumn?.(true)
                  setShowNewDropdown(false)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                📋 New Column
              </div>
              <div
                style={dropdownItemStyle}
                onClick={() => {
                  setShowTemplateModal(true)
                  setShowNewDropdown(false)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f8f9fa'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                📄 From Template
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Card Modal */}
      <NewCardModal
        isOpen={showNewCardModal}
        onClose={() => setShowNewCardModal(false)}
        columns={columns}
        onCardCreated={(columnId, newCard) => {
          onCardCreated?.(columnId, newCard)
          setShowNewCardModal(false)
        }}
      />

      {/* Template Import Modal */}
      {showTemplateModal && (
        <TemplateImportModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          boardId={boardId || ''}
          existingColumns={columns.map(c => ({ id: c.id, title: c.title, position: c.position, cardCount: (Array.isArray(c.cards) ? c.cards.length : 0) }))}
          onAfterApply={async () => { await onReloadBoard?.() }}
        />
      )}
    </div>
  )
}
