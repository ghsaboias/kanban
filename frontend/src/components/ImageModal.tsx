import { createPortal } from 'react-dom'
import { useAppearance } from '../appearance'

interface ImageModalProps {
    selectedImage: string | null
    onClose: () => void
}

export function ImageModal({ selectedImage, onClose }: ImageModalProps) {
    const { theme } = useAppearance()

    if (!selectedImage) return null

    return createPortal(
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
                padding: theme.spacing?.lg || '20px'
            }}
            onClick={onClose}
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
                        borderRadius: theme.radius?.md || '8px',
                        boxShadow: theme.shadow?.lg || '0 20px 60px rgba(0, 0, 0, 0.5)'
                    }}
                    onClick={onClose}
                />
            </div>
        </div>,
        document.body
    )
}
