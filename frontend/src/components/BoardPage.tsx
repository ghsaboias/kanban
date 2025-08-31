import { useParams, Link } from 'react-router-dom'
import { Board } from './Board'
import { useTheme } from '../theme/ThemeProvider'

export function BoardPage() {
  const { theme } = useTheme()
  const { id } = useParams<{ id: string }>()
  
  if (!id) {
    return <div>Board ID not found</div>
  }

  return (
    <div>
      <div style={{ 
        padding: '10px 20px', 
        backgroundColor: theme.surfaceAlt, 
        borderBottom: `1px solid ${theme.border}`,
        marginBottom: '0'
      }}>
        <Link 
          to="/"
          style={{ 
            color: theme.accent,
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          ← Back to Boards
        </Link>
      </div>
      <Board boardId={id} />
    </div>
  )
}
