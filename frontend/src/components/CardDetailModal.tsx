import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppearance } from '../appearance'
import type { ApiResponse } from '../types/api'
import { useApi } from '../useApi'
import { hasContent } from '../utils/html'
import { CardFormFields } from './CardFormFields'
import { CardModalFooter } from './CardModalFooter'
import { CardModalHeader } from './CardModalHeader'
import { ImageModal } from './ImageModal'

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



export function CardDetailModal({ card, isOpen, onClose, onCardUpdated }: CardDetailModalProps) {
  const { theme } = useAppearance()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  // Local visibility state to enable entry transition without parent rAF
  const [visible, setVisible] = useState(false)
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || '',
    priority: card.priority,
    assigneeId: card.assignee?.id || '',
    // M&A fields
    deadline: card.deadline || '',
    riskLevel: card.riskLevel || '',
    ownerId: card.owner?.id || ''
  })
  const modalRef = useRef<HTMLDivElement>(null)
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
        assigneeId: card.assignee?.id || '',
        deadline: card.deadline || '',
        riskLevel: card.riskLevel || '',
        ownerId: card.owner?.id || ''
      })
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

  const handleFormDataChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const handleImageSelect = (src: string) => {
    setSelectedImage(src)
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
          assigneeId: formData.assigneeId || null,
          // M&A fields
          deadline: formData.deadline || null,
          riskLevel: formData.riskLevel || null,
          ownerId: formData.ownerId || null
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
      formData.assigneeId !== (card.assignee?.id || '') ||
      // M&A fields changes
      formData.deadline !== (card.deadline || '') ||
      formData.riskLevel !== (card.riskLevel || '') ||
      formData.ownerId !== (card.owner?.id || '')
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
          boxShadow: theme.shadow?.md || '-2px 0 10px rgba(0, 0, 0, 0.1)',
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
        <CardModalHeader
          title={formData.title}
          onTitleChange={(title) => handleFormDataChange('title', title)}
          onClose={onClose}
        />

        {/* Content */}
        <div style={{
          flex: 1,
          padding: theme.spacing?.lg || '20px',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing?.lg || '24px',
          boxSizing: 'border-box'
        }}>
          <CardFormFields
            formData={formData}
            users={users}
            onFormDataChange={handleFormDataChange}
            onImageSelect={handleImageSelect}
          />
        </div>

        {/* Footer */}
        <CardModalFooter
          hasChanges={hasChanges()}
          loading={loading}
          title={formData.title}
          onCancel={onClose}
          onSave={handleSave}
        />
      </div>
    </div>
  )

  // Image Modal Component

  return (
    <>
      {createPortal(modalContent, document.body)}
      <ImageModal
        selectedImage={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  )
}
