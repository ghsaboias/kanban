import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { RichTextEditor } from './RichTextEditor'
import { hasContent, extractImages } from '../utils/html'
import { useApi } from '../useApi'
import type { ApiResponse } from '../types/api'

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

interface User {
  id: string
  name: string
  email: string
}

interface CardDetailModalProps {
  card: CardData
  isOpen: boolean
  onClose: () => void
  onCardUpdated: (updatedCard: CardData) => void
}

const priorityLabels = {
  HIGH: 'Alta',
  MEDIUM: 'Média', 
  LOW: 'Baixa'
}

const priorityColors = {
  HIGH: '#ff6b6b',
  MEDIUM: '#ffd93d',
  LOW: '#6bcf7f'
}

export function CardDetailModal({ card, isOpen, onClose, onCardUpdated }: CardDetailModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  // Local visibility state to enable entry transition without parent rAF
  const [visible, setVisible] = useState(false)
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || '',
    priority: card.priority,
    assigneeId: card.assignee?.id || ''
  })
  const modalRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const { apiFetch } = useApi()

  useEffect(() => {
    if (isOpen) {
      // allow one frame so initial render uses closed styles, then animate open
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      // Reset form data when modal opens
      setFormData({
        title: card.title,
        description: card.description || '',
        priority: card.priority,
        assigneeId: card.assignee?.id || ''
      })
      
      // Focus title input
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen, card])

  useEffect(() => {
    // Fetch users for assignment dropdown
    apiFetch('/api/users')
      .then((response: Response) => response.json())
      .then((data: ApiResponse<User[]>) => {
        if (data.success) {
          setUsers(data.data)
        }
      })
      .catch((err: unknown) => console.error('Error loading users:', err))
  }, [apiFetch])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await apiFetch(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: hasContent(formData.description) ? formData.description : null,
          priority: formData.priority,
          assigneeId: formData.assigneeId || null
        })
      })

      const result = await response.json()
      if (result.success) {
        onCardUpdated(result.data)
        onClose()
      } else {
        console.error('Failed to update card:', result.error)
      }
    } catch (err) {
      console.error('Error updating card:', err)
    } finally {
      setLoading(false)
    }
  }

  const hasChanges = () => {
    return (
      formData.title.trim() !== card.title ||
      formData.description.trim() !== (card.description || '') ||
      formData.priority !== card.priority ||
      formData.assigneeId !== (card.assignee?.id || '')
    )
  }

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: visible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
        transition: 'background-color 200ms ease',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        pointerEvents: isOpen ? 'auto' : 'none'
      }}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        style={{
          width: 'min(400px, 100vw)',
          height: '100vh',
          backgroundColor: 'white',
          boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e1e1e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <input
            ref={titleInputRef}
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '20px',
              fontWeight: '600',
              color: '#333',
              background: 'transparent',
              flex: 1,
              marginRight: '16px',
              minWidth: 0
            }}
            placeholder="Card title"
          />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#666',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxSizing: 'border-box'
        }}>
          {/* Status Section */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: priorityColors[formData.priority]
              }}></div>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>Status</span>
            </div>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                color: '#111827',
                cursor: 'pointer',
                boxSizing: 'border-box',
                maxWidth: '100%'
              }}
            >
              <option value="LOW">{priorityLabels.LOW}</option>
              <option value="MEDIUM">{priorityLabels.MEDIUM}</option>
              <option value="HIGH">{priorityLabels.HIGH}</option>
            </select>
          </div>

          {/* Assign Section */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#666'
              }}>👤</div>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>Assign</span>
            </div>
            <select
              value={formData.assigneeId}
              onChange={(e) => setFormData(prev => ({ ...prev, assigneeId: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                color: '#111827',
                cursor: 'pointer',
                boxSizing: 'border-box',
                maxWidth: '100%'
              }}
            >
              <option value="">Sem responsável</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          {/* Description Section */}
          <div style={{ width: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#666'
              }}>📝</div>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>Description</span>
            </div>
            <RichTextEditor
              value={formData.description}
              onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
            />
            
            {/* Image Preview */}
            {(() => {
              const images = extractImages(formData.description)
              if (images.length === 0) return null
              
              return (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    display: 'block', 
                    marginBottom: '6px' 
                  }}>Images ({images.length})</span>
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    flexWrap: 'wrap' 
                  }}>
                    {images.map((src, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedImage(src)}
                        style={{
                          width: '60px',
                          height: '40px',
                          border: '1px solid #e1e1e1',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          backgroundColor: '#f8f9fa'
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
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Add Property Button */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #e1e1e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666',
              width: 'fit-content'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e8e8e8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5'
            }}
          >
            <span>+</span>
            Add a property
          </button>

          {/* Comments Section */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#666'
              }}>💬</div>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>Comments</span>
            </div>
          <textarea
            placeholder="Add a comment..."
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '12px',
              border: '1px solid #e1e1e1',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#213547',
              backgroundColor: '#f8f9fa',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              boxSizing: 'border-box',
              maxWidth: '100%',
              overflowWrap: 'anywhere'
            }}
          />
          </div>
        </div>

        {/* Footer */}
        {hasChanges() && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e1e1e1',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #e1e1e1',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#666',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !formData.title.trim()}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: loading ? '#999' : '#007bff',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // Image Modal
  const imageModal = selectedImage && (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px'
      }}
      onClick={() => setSelectedImage(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img
          src={selectedImage}
          alt="Full size"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}
          onClick={() => setSelectedImage(null)}
        />
      </div>
    </div>
  )

  return (
    <>
      {createPortal(modalContent, document.body)}
      {imageModal && createPortal(imageModal, document.body)}
    </>
  )
}
