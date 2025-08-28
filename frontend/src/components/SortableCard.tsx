import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card as CardComponent } from './Card'

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

interface SortableCardProps {
  card: CardData
  onCardUpdated?: (updatedCard: CardData) => void
  onCardDeleted?: (cardId: string) => void
  onCardClick?: (card: CardData) => void
}

export function SortableCard({ card, onCardUpdated, onCardDeleted, onCardClick }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `card-${card.id}` })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Hide the in-place element while dragging; the DragOverlay will render the preview
    opacity: isDragging ? 0 : 1
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardComponent 
        card={card} 
        onCardUpdated={onCardUpdated} 
        onCardDeleted={onCardDeleted}
        onCardClick={onCardClick}
      />
    </div>
  )
}
