import { useState } from 'react'
import { toPlainText, truncate } from '../utils/html'

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

interface CardProps {
  card: CardData
  onCardUpdated?: (updatedCard: CardData) => void
  onCardDeleted?: (cardId: string) => void
  onCardClick?: (card: CardData) => void
}

const priorityColors = {
  HIGH: '#ff6b6b',
  MEDIUM: '#ffd93d',
  LOW: '#6bcf7f'
}

const priorityLabels = {
  HIGH: 'Alta',
  MEDIUM: 'Média', 
  LOW: 'Baixa'
}

export function Card({ card, onCardUpdated, onCardDeleted, onCardClick }: CardProps) {
  // mark onCardUpdated as used for now (edit feature later)
  void onCardUpdated
  const [hovering, setHovering] = useState(false)
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this card?')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:3001/api/cards/${card.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        onCardDeleted?.(card.id)
      } else {
        console.error('Failed to delete card')
      }
    } catch (err) {
      console.error('Error deleting card:', err)
    }
  }
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on delete button
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    onCardClick?.(card)
  }

  return (
    <div 
      style={{
        backgroundColor: 'white',
        border: '1px solid #e1e1e1',
        borderRadius: '6px',
        padding: '12px',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s',
        position: 'relative'
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        setHovering(true)
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={(e) => {
        setHovering(false)
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      <button
        aria-label="Delete card"
        title="Delete card"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          handleDelete()
        }}
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          backgroundColor: 'white',
          color: '#dc3545',
          border: '1px solid #e5e7eb',
          width: '20px',
          height: '20px',
          minWidth: '20px',
          padding: 0,
          boxSizing: 'border-box',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          lineHeight: 1,
          opacity: hovering ? 1 : 0,
          pointerEvents: hovering ? 'auto' : 'none',
          transition: 'opacity 150ms ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#dc3545'
          e.currentTarget.style.borderColor = '#dc3545'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white'
          e.currentTarget.style.borderColor = '#e5e7eb'
          e.currentTarget.style.color = '#dc3545'
        }}
      >
        <svg
          width="10"
          height="10"
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
      </button>

      <div style={{ marginBottom: '8px' }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '14px', 
          fontWeight: '600',
          color: '#333',
          paddingRight: '20px'
        }}>
          {card.title}
        </h4>
      </div>
      
      {card.description && (
        <p style={{ 
          margin: '0 0 8px 0', 
          fontSize: '12px', 
          color: '#333',
          lineHeight: '1.4'
        }}>
          {truncate(toPlainText(card.description), 100)}
        </p>
      )}
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: '8px'
      }}>
        <span style={{
          backgroundColor: priorityColors[card.priority],
          color: 'white',
          fontSize: '10px',
          fontWeight: '600',
          padding: '2px 6px',
          borderRadius: '10px',
          textTransform: 'uppercase'
        }}>
          {priorityLabels[card.priority]}
        </span>
        
        {card.assignee && (
          <div style={{ 
            fontSize: '10px', 
            color: '#333',
            backgroundColor: '#f0f0f0',
            padding: '2px 6px',
            borderRadius: '10px'
          }}>
            {card.assignee.name}
          </div>
        )}
      </div>
    </div>
  )
}
