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

interface ModernCardProps {
  card: CardData
  onCardUpdated?: (updatedCard: CardData) => void
  onCardDeleted?: (cardId: string) => void
  onCardClick?: (card: CardData) => void
}

export function ModernCard({ card, onCardUpdated, onCardDeleted, onCardClick }: ModernCardProps) {
  const { apiFetch } = useApi()
  const { theme } = useTheme()
  const [hovering, setHovering] = useState(false)

  // Mark onCardUpdated as used for now (edit feature later)
  void onCardUpdated

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
    // Don't open modal if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    onCardClick?.(card)
  }

  const cardStyle = {
    backgroundColor: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius?.md || '8px',
    padding: '16px',
    cursor: 'pointer',
    boxShadow: theme.shadow?.sm || '0 1px 3px rgba(0,0,0,0.08)',
    transition: 'all 0.2s ease',
    position: 'relative' as const,
    userSelect: 'none' as const
  }

  const titleStyle = {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: theme.textPrimary,
    lineHeight: '1.3',
    paddingRight: '60px' // Space for drag handle and options
  }

  const descriptionStyle = {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: theme.textSecondary,
    lineHeight: '1.4'
  }

  const footerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px'
  }

  const priorityBadgeStyle = {
    backgroundColor: theme.priority[card.priority],
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: theme.radius?.sm || '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em'
  }

  const assigneeAvatarStyle = {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: theme.accent,
    color: theme.accentText,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    border: `2px solid ${theme.surface}`,
    boxShadow: theme.shadow?.sm || 'none'
  }

  const dragHandleStyle = {
    position: 'absolute' as const,
    top: '12px',
    right: '40px',
    opacity: hovering ? 1 : 0,
    transition: 'opacity 0.2s ease',
    cursor: 'grab',
    padding: '4px',
    borderRadius: theme.radius?.sm || '4px',
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.textMuted
  }

  const optionsButtonStyle = {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    opacity: hovering ? 1 : 0,
    transition: 'opacity 0.2s ease',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: theme.radius?.sm || '4px',
    backgroundColor: 'transparent',
    border: `1px solid ${theme.border}`,
    color: theme.textMuted,
    fontSize: '14px'
  }

  return (
    <div
      style={cardStyle}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        setHovering(true)
        e.currentTarget.style.boxShadow = theme.shadow?.md || '0 2px 8px rgba(0,0,0,0.10)'
        e.currentTarget.style.transform = 'scale(1.01)'
      }}
      onMouseLeave={(e) => {
        setHovering(false)
        e.currentTarget.style.boxShadow = theme.shadow?.sm || '0 1px 3px rgba(0,0,0,0.08)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {/* Drag Handle */}
      <button
        aria-label="Drag handle"
        style={dragHandleStyle}
        onPointerDown={(e) => e.stopPropagation()}
      >
        ⋮⋮
      </button>

      {/* Options Menu */}
      <button
        aria-label="Card options"
        style={optionsButtonStyle}
        onClick={(e) => {
          e.stopPropagation()
          handleDelete() // For now, just delete. Later can be a menu
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.surfaceAlt || '#f6f8fa'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        ⋯
      </button>

      {/* Card Content */}
      <div>
        <h4 style={titleStyle}>{card.title}</h4>

        {card.description && (
          <p style={descriptionStyle}>
            {truncate(toPlainText(card.description), 80)}
          </p>
        )}

        {/* Images Section */}
        {(() => {
          const images = extractImages(card.description || '')
          if (images.length === 0) return null

          return (
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap' as const
              }}>
                {images.slice(0, 2).map((src, index) => (
                  <div
                    key={index}
                    style={{
                      width: '48px',
                      height: '32px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.radius?.sm || '4px',
                      overflow: 'hidden',
                      backgroundColor: theme.surfaceAlt
                    }}
                  >
                    <img
                      src={src}
                      alt={`Preview ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                ))}
                {images.length > 2 && (
                  <div style={{
                    width: '48px',
                    height: '32px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radius?.sm || '4px',
                    backgroundColor: theme.surfaceAlt,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: theme.textMuted
                  }}>
                    +{images.length - 2}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Footer with Priority and Assignee */}
        <div style={footerStyle}>
          <span style={priorityBadgeStyle}>
            {card.priority}
          </span>

          {card.assignee && (
            <div
              style={assigneeAvatarStyle}
              title={`${card.assignee.name} (${card.assignee.email})`}
            >
              {card.assignee.name?.charAt(0) || '?'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
