import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '../../../shared/realtime'
import { useTheme } from '../theme/useTheme'
import type { ApiResponse } from '../types/api'
import { useToast } from '../ui/useToast'
import { useApi } from '../useApi'
import { hasContent, toPlainText } from '../utils/html'
import { Card as CardView } from './Card'
import { Suspense, lazy } from 'react'
const CardDetailModal = lazy(() => import('./CardDetailModal').then(m => ({ default: m.CardDetailModal })))
const ExportModal = lazy(() => import('./ExportModal').then(m => ({ default: m.ExportModal })))
import type { ExportOptions } from './ExportModal'
import { KanbanColumns } from './KanbanColumns'
import { KanbanHeader } from './KanbanHeader'
import { KanbanToolbar } from './KanbanToolbar'

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
  isCompact?: boolean
}

export function Board({ board, setBoard, isConnected, onlineUsers, isCompact }: BoardProps) {
  const { apiFetch } = useApi()
  const { theme } = useTheme()
  const [showCreateColumn, setShowCreateColumn] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeSort, setActiveSort] = useState('position')
  const [showExportModal, setShowExportModal] = useState(false)
  const reloadBoard = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/boards/${board.id}`)
      const result: ApiResponse<BoardData> = await res.json()
      if (result.success) {
        setBoard(result.data)
      }
    } catch (e) {
      console.warn('Failed to reload board', e)
    }
  }, [apiFetch, board.id, setBoard])
  const { success: toastSuccess, error: toastError } = useToast()

  // Configure sensors with activation constraints to allow click events
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )


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

  // Filter, sort, and search functions  
  const filteredAndSortedColumns = board.columns.map(column => {
    let filteredCards = column.cards

    // Apply search filter
    if (searchQuery.trim()) {
      filteredCards = filteredCards.filter(card =>
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply priority filter
    if (activeFilter !== 'all') {
      filteredCards = filteredCards.filter(card =>
        card.priority.toLowerCase() === activeFilter.toLowerCase()
      )
    }

    // Apply sorting
    if (activeSort === 'priority') {
      const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 }
      filteredCards = [...filteredCards].sort((a, b) =>
        priorityOrder[a.priority] - priorityOrder[b.priority]
      )
    } else {
      // Default position sort
      filteredCards = [...filteredCards].sort((a, b) => a.position - b.position)
    }

    return {
      ...column,
      cards: filteredCards
    }
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.background }}>
      {/* Toolbar */}
      <KanbanToolbar
        onFilter={setActiveFilter}
        onSort={() => setActiveSort(prev => prev === 'position' ? 'priority' : 'position')}
        onSearch={setSearchQuery}
        onNewCard={() => console.log('Create new card')}
        onExpandView={() => console.log('Expand view - toggle full screen')}
        onShowMoreOptions={() => console.log('More options clicked')}
        onExportClick={() => setShowExportModal(true)}
        onReloadBoard={reloadBoard}
        onCardCreated={(columnId, newCard) => {
          setBoard(prev => prev ? {
            ...prev,
            columns: prev.columns.map(c =>
              c.id === columnId ? { ...c, cards: [...c.cards, newCard] } : c
            )
          } : null)
        }}
        onShowCreateColumn={setShowCreateColumn}
        columns={board.columns}
        activeSort={activeSort}
        activeFilter={activeFilter}
        isCompact={isCompact}
        boardId={board.id}
      />

      {/* Header */}
      <KanbanHeader
        title={board.title}
        description={board.description}
        isConnected={isConnected}
        onlineUsers={onlineUsers}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        collisionDetection={closestCenter}
      >
        <KanbanColumns
          columns={filteredAndSortedColumns}
          onCardCreated={(columnId, newCard) => {
            setBoard(prev => prev ? {
              ...prev,
              columns: prev.columns.map(c =>
                c.id === columnId ? { ...c, cards: [...c.cards, newCard] } : c
              )
            } : null)
          }}
          onColumnUpdated={(updatedColumn) => {
            setBoard(prev => prev ? {
              ...prev,
              columns: prev.columns.map(c =>
                c.id === updatedColumn.id ? updatedColumn : c
              )
            } : null)
          }}
          onColumnDeleted={(columnId) => {
            setBoard(prev => prev ? {
              ...prev,
              columns: prev.columns.filter(c => c.id !== columnId)
            } : null)
          }}
          onCardUpdated={(columnId, updatedCard) => {
            setBoard(prev => prev ? {
              ...prev,
              columns: prev.columns.map(c =>
                c.id === columnId ? {
                  ...c,
                  cards: c.cards.map(card =>
                    card.id === updatedCard.id ? updatedCard : card
                  )
                } : c
              )
            } : null)
          }}
          onCardDeleted={(columnId, cardId) => {
            setBoard(prev => prev ? {
              ...prev,
              columns: prev.columns.map(c =>
                c.id === columnId ? {
                  ...c,
                  cards: c.cards.filter(card => card.id !== cardId)
                } : c
              )
            } : null)
          }}
          onCardClick={handleCardClick}
          showCreateColumn={showCreateColumn}
          onShowCreateColumn={setShowCreateColumn}
          onCreateColumn={async (title) => {
            setCreateLoading(true)
            try {
              const response = await apiFetch(`/api/boards/${board.id}/columns`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  title: title.trim()
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
              } else {
                console.error('Failed to create column', result.error)
                throw new Error(result.error || 'Failed to create column')
              }
            } catch (err) {
              console.error('Error creating column', err)
              throw err
            } finally {
              setCreateLoading(false)
            }
          }}
          createLoading={createLoading}
        />

        <DragOverlay>
          {activeCard ? (
            <div style={{ pointerEvents: 'none', minWidth: 280 }}>
              <CardView card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Suspense fallback={null}>
        {selectedCard && (
          <CardDetailModal
            card={selectedCard}
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onCardUpdated={handleCardUpdated}
          />
        )}
      </Suspense>

      {/* Export Modal */}
      <Suspense fallback={null}>
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onConfirm={(options: ExportOptions) => {
          setShowExportModal(false)
          try {
            const slugify = (s: string) => s
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
            const ts = (() => {
              const d = new Date()
              const pad = (n: number) => String(n).padStart(2, '0')
              return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
            })()
            const slug = slugify(board.title || 'board')

            const sourceColumns = options.honorFilters ? filteredAndSortedColumns : board.columns

            // Helper: download
            const download = (filename: string, content: BlobPart, type: string) => {
              const blob = new Blob([content], { type })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = filename
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }

            // Helper: CSV encode
            const toCsv = <T extends Record<string, unknown>>(rows: T[], headers: string[]): string => {
              const escape = (v: unknown) => {
                if (v === null || v === undefined) return ''
                const s = String(v)
                if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
                return s
              }
              const lines = [headers.join(',')]
              for (const row of rows) {
                lines.push(headers.map(h => escape(row[h])).join(','))
              }
              return lines.join('\n')
            }

            let filesGenerated = 0
            // JSON
            if (options.exportJson) {
              const jsonPayload = {
                id: board.id,
                title: board.title,
                description: board.description,
                columns: sourceColumns.map(col => ({
                  id: col.id,
                  title: col.title,
                  position: col.position,
                  cards: col.cards.map(card => ({
                    id: card.id,
                    title: card.title,
                    description_html: card.description,
                    description_text: card.description ? toPlainText(card.description) : '',
                    priority: card.priority,
                    position: card.position,
                    assignee: card.assignee ? {
                      id: card.assignee.id,
                      name: card.assignee.name,
                      email: card.assignee.email
                    } : null
                  }))
                }))
              }
              const filename = `board-${slug}-${ts}.json`
              download(filename, JSON.stringify(jsonPayload, null, 2), 'application/json')
              filesGenerated++
            }

            // Cards CSV
            if (options.exportCardsCsv) {
              const rows: Array<Record<string, unknown>> = []
              for (const col of sourceColumns) {
                for (const card of col.cards) {
                  rows.push({
                    id: card.id,
                    title: card.title,
                    column_title: col.title,
                    priority: card.priority,
                    assignee_name: card.assignee?.name || '',
                    assignee_email: card.assignee?.email || '',
                    description_text: card.description ? toPlainText(card.description) : ''
                  })
                }
              }
              const headers = ['id', 'title', 'column_title', 'priority', 'assignee_name', 'assignee_email', 'description_text']
              const csv = toCsv(rows, headers)
              const filename = `cards-${slug}-${ts}.csv`
              download(filename, csv, 'text/csv;charset=utf-8')
              filesGenerated++
            }

            // Columns CSV
            if (options.exportColumnsCsv) {
              const totalVisibleCards = sourceColumns.reduce((sum, c) => sum + c.cards.length, 0)
              const rows = sourceColumns.map(col => {
                const cardCount = col.cards.length
                const priorityHigh = col.cards.filter(c => c.priority === 'HIGH').length
                const priorityMedium = col.cards.filter(c => c.priority === 'MEDIUM').length
                const priorityLow = col.cards.filter(c => c.priority === 'LOW').length
                const assignedCount = col.cards.filter(c => !!c.assignee).length
                const unassignedCount = cardCount - assignedCount
                const distinctAssignees = new Set(col.cards.filter(c => !!c.assignee).map(c => c.assignee!.id)).size
                const withDescriptionCount = col.cards.filter(c => !!c.description && hasContent(c.description || '')).length
                const percentAssigned = cardCount > 0 ? assignedCount / cardCount : 0
                const percentOfBoard = totalVisibleCards > 0 ? cardCount / totalVisibleCards : 0
                return {
                  id: col.id,
                  title: col.title,
                  position: col.position,
                  card_count: cardCount,
                  priority_high_count: priorityHigh,
                  priority_medium_count: priorityMedium,
                  priority_low_count: priorityLow,
                  assigned_count: assignedCount,
                  unassigned_count: unassignedCount,
                  percent_assigned: percentAssigned,
                  distinct_assignees_count: distinctAssignees,
                  with_description_count: withDescriptionCount,
                  percent_of_board_cards: percentOfBoard
                }
              })
              const headers = [
                'id', 'title', 'position', 'card_count',
                'priority_high_count', 'priority_medium_count', 'priority_low_count',
                'assigned_count', 'unassigned_count', 'percent_assigned',
                'distinct_assignees_count', 'with_description_count', 'percent_of_board_cards'
              ]
              const csv = toCsv(rows, headers)
              const filename = `columns-${slug}-${ts}.csv`
              download(filename, csv, 'text/csv;charset=utf-8')
              filesGenerated++
            }
            if (filesGenerated > 0) {
              const parts: string[] = []
              if (options.exportJson) parts.push('JSON')
              if (options.exportCardsCsv) parts.push('cards CSV')
              if (options.exportColumnsCsv) parts.push('columns CSV')
              toastSuccess(`Exported ${parts.join(', ')} for "${board.title}"`)
            }
          } catch (err) {
            console.error('Export failed:', err)
            toastError('Export failed. Please try again.')
          }
        }}
      />
      </Suspense>
    </div>
  )
}
