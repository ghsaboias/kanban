import { useParams, Link } from 'react-router-dom'
import { Board } from './Board'

export function BoardPage() {
  const { id } = useParams<{ id: string }>()
  
  if (!id) {
    return <div>Board ID not found</div>
  }

  return (
    <div>
      <div style={{ 
        padding: '10px 20px', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #e1e5e9',
        marginBottom: '0'
      }}>
        <Link 
          to="/"
          style={{ 
            color: '#007bff',
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