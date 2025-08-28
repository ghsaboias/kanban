import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Column as ColumnComponent } from './Column'

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

interface SortableColumnProps {
  column: ColumnData
  onCardCreated?: (newCard: CardData) => void
  onColumnUpdated?: (updatedColumn: ColumnData) => void
  onColumnDeleted?: (columnId: string) => void
  onCardUpdated?: (updatedCard: CardData) => void
  onCardDeleted?: (cardId: string) => void
  onCardClick?: (card: CardData) => void
}

export function SortableColumn({
  column,
  onCardCreated,
  onColumnUpdated,
  onColumnDeleted,
  onCardUpdated,
  onCardDeleted,
  onCardClick
}: SortableColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `column-${column.id}` })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ColumnComponent
        column={column}
        onCardCreated={onCardCreated}
        onColumnUpdated={onColumnUpdated}
        onColumnDeleted={onColumnDeleted}
        onCardUpdated={onCardUpdated}
        onCardDeleted={onCardDeleted}
        onCardClick={onCardClick}
      />
    </div>
  )
}
