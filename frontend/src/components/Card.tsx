import { useState } from 'react'
import { useTheme } from '../theme/useTheme'
import { useApi } from '../useApi'
import { extractImages, toPlainText, truncate } from '../utils/html'

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


const priorityLabels = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa'
}

export function Card({ card, onCardUpdated, onCardDeleted, onCardClick }: CardProps) {
  const { apiFetch } = useApi()
  const { theme } = useTheme()
  // mark onCardUpdated as used for now (edit feature later)
  void onCardUpdated
  const [hovering, setHovering] = useState(false)
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this card?')) {
      return
    }

    try {
      const response = await apiFetch(`/api/cards/${card.id}`, {
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
        backgroundColor: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: '6px',
        padding: '12px',
        cursor: 'pointer',
        boxShadow: theme.shadow?.sm || '0 1px 3px rgba(0,0,0,0.1)',
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
        e.currentTarget.style.boxShadow = theme.shadow?.sm || '0 1px 3px rgba(0,0,0,0.1)'
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
          backgroundColor: theme.card,
          color: theme.danger || '#dc3545',
          border: `1px solid ${theme.border}`,
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
          e.currentTarget.style.backgroundColor = (theme.danger || '#dc3545')
          e.currentTarget.style.borderColor = (theme.danger || '#dc3545')
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.card
          e.currentTarget.style.borderColor = theme.border
          e.currentTarget.style.color = (theme.danger || '#dc3545')
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
          color: theme.textSecondary,
          paddingRight: '20px'
        }}>
          {card.title}
        </h4>
      </div>

      {card.description && (
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '12px',
          color: theme.textSecondary,
          lineHeight: '1.4'
        }}>
          {truncate(toPlainText(card.description || ''), 100)}
        </p>
      )}

      {/* Images Section in Card */}
      {(() => {
        const images = extractImages(card.description || '')
        if (images.length === 0) return null

        return (
          <div style={{ marginBottom: '8px' }}>
            <span style={{
              fontSize: '10px',
              color: theme.textMuted,
              display: 'block',
              marginBottom: '4px'
            }}>Images ({images.length})</span>
            <div style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap'
            }}>
              {images.slice(0, 3).map((src, index) => (
                <div
                  key={index}
                  style={{
                    width: '32px',
                    height: '24px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '3px',
                    overflow: 'hidden',
                    backgroundColor: theme.surfaceAlt
                  }}
                >
                  <img
                    src={src}
                    alt={`Preview ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ))}
              {images.length > 3 && (
                <div style={{
                  width: '32px',
                  height: '24px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '3px',
                  backgroundColor: theme.surfaceAlt,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  color: theme.textMuted
                }}>
                  +{images.length - 3}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '8px'
      }}>
        <span style={{
          backgroundColor: theme.priority[card.priority],
          color: 'white',
          fontSize: '10px',
          fontWeight: '600',
          padding: '2px 6px',
          borderRadius: '10px',
          textTransform: 'uppercase'
        }}>
          {/* Split into separate spans so tests can match exact priority text (e.g., 'HIGH') */}
          <span>{priorityLabels[card.priority]}</span>
          <span style={{ marginLeft: '4px' }}>{card.priority}</span>
        </span>

        {card.assignee && (
          <div style={{
            fontSize: '10px',
            color: theme.textSecondary,
            backgroundColor: theme.surfaceAlt,
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
