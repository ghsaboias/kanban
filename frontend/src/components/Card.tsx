import { useState } from 'react'
import { useAppearance } from '../appearance'
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
  // M&A specific fields
  deadline?: string | null
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null
  owner?: {
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


const riskLabels = {
  HIGH: 'Alto Risco',
  MEDIUM: 'Médio Risco',
  LOW: 'Baixo Risco'
}

// Helper function to format deadline
function formatDeadline(deadline: string): string {
  try {
    const date = new Date(deadline)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return `${Math.abs(diffDays)}d atrasado`
    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Amanhã'
    if (diffDays <= 7) return `${diffDays}d`

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return deadline
  }
}

// Helper function to check if deadline is urgent
function isDeadlineUrgent(deadline: string): boolean {
  try {
    const date = new Date(deadline)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 3 // Urgent if 3 days or less
  } catch {
    return false
  }
}

export function Card({ card, onCardUpdated, onCardDeleted, onCardClick }: CardProps) {
  const { apiFetch } = useApi()
  const { theme, config } = useAppearance()
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
        borderRadius: theme.radius?.md || '6px',
        padding: theme.spacing?.md || '12px',
        cursor: 'pointer',
        boxShadow: theme.shadow?.sm || '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s',
        position: 'relative',
        // Perf: keep paint work scoped to the card box
        contain: 'paint'
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        setHovering(true)
        e.currentTarget.style.boxShadow = theme.shadow?.md || '0 2px 6px rgba(0,0,0,0.15)'
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
          borderRadius: theme.radius?.sm || '6px',
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

      <div style={{ marginBottom: theme.spacing?.sm || '8px' }}>
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
          margin: `0 0 ${theme.spacing?.sm || '8px'} 0`,
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
          <div style={{ marginBottom: theme.spacing?.sm || '8px' }}>
            <span style={{
              fontSize: '10px',
              color: theme.textMuted,
              display: 'block',
              marginBottom: theme.spacing?.xs || '4px'
            }}>Images ({images.length})</span>
            <div style={{
              display: 'flex',
              gap: theme.spacing?.xs || '4px',
              flexWrap: 'wrap'
            }}>
              {images.slice(0, 3).map((src, index) => (
                <div
                  key={index}
                  style={{
                    width: '32px',
                    height: '24px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radius?.sm || '3px',
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
              {images.length > 3 && (
                <div style={{
                  width: '32px',
                  height: '24px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius?.sm || '3px',
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

      {/* Unified metadata row: priority, owner/assignee, deadline, risk */}
      {(() => {
        const emphasis = config.advanced?.emphasis || { owners: true, deadlines: true, riskFlags: true }
        const showPriority = card.priority
        const showOwner = emphasis.owners && (card.owner || card.assignee)
        const showDeadline = emphasis.deadlines && card.deadline
        const showRisk = emphasis.riskFlags && card.riskLevel

        return (showPriority || showOwner || showDeadline || showRisk) && (
          <div style={{ marginTop: theme.spacing?.sm || '8px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing?.xs || '4px' }}>
              {/* Priority */}
              {showPriority && (
                <div style={{
                  fontSize: '10px',
                  color: '#fff',
                  backgroundColor: theme.priority[card.priority],
                  padding: '2px 6px',
                  borderRadius: theme.radius?.md || '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textTransform: 'uppercase',
                  border: '1px solid transparent'
                }}>
                  <span>⏱</span>
                  <span>{card.priority}</span>
                </div>
              )}

              {/* Owner (fallback to assignee for legacy) */}
              {showOwner && (
                <div style={{
                  fontSize: '10px',
                  color: theme.emphasis?.owner || theme.textSecondary,
                  backgroundColor: theme.surfaceAlt + '80',
                  padding: '2px 6px',
                  borderRadius: theme.radius?.sm || '3px',
                  border: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>👤</span>
                  <span>{card.owner?.name || card.assignee?.name}</span>
                </div>
              )}

              {/* Deadline */}
              {showDeadline && card.deadline && (
                <div style={{
                  fontSize: '10px',
                  color: isDeadlineUrgent(card.deadline)
                    ? theme.emphasis?.deadline || theme.danger
                    : theme.emphasis?.deadline || theme.textSecondary,
                  backgroundColor: isDeadlineUrgent(card.deadline)
                    ? (theme.danger || '#dc3545') + '10'
                    : theme.surfaceAlt + '80',
                  padding: '2px 6px',
                  borderRadius: theme.radius?.sm || '3px',
                  border: `1px solid ${isDeadlineUrgent(card.deadline) ? theme.danger : theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: isDeadlineUrgent(card.deadline) ? 600 : 400
                }}>
                  <span>📅</span>
                  <span>{formatDeadline(card.deadline)}</span>
                </div>
              )}

              {/* Risk Level */}
              {showRisk && card.riskLevel && (
                <div style={{
                  fontSize: '10px',
                  color: theme.emphasis?.riskFlag || (
                    card.riskLevel === 'HIGH' ? theme.danger :
                      card.riskLevel === 'MEDIUM' ? theme.warning :
                        theme.textSecondary
                  ),
                  backgroundColor: card.riskLevel === 'HIGH'
                    ? (theme.danger || '#dc3545') + '10'
                    : card.riskLevel === 'MEDIUM'
                      ? (theme.warning || '#ffc107') + '10'
                      : theme.surfaceAlt + '80',
                  padding: '2px 6px',
                  borderRadius: theme.radius?.sm || '3px',
                  border: `1px solid ${card.riskLevel === 'HIGH' ? theme.danger :
                    card.riskLevel === 'MEDIUM' ? theme.warning :
                      theme.border
                    }`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: card.riskLevel !== 'LOW' ? 600 : 400
                }}>
                  <span>⚠️</span>
                  <span>{riskLabels[card.riskLevel]}</span>
                </div>
              )}


            </div>
          </div>
        )
      })()}
    </div>
  )
}
