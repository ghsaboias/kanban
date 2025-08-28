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

export function Card({ card }: CardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e1e1e1',
      borderRadius: '6px',
      padding: '12px',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'box-shadow 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
    }}
    >
      <div style={{ marginBottom: '8px' }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '14px', 
          fontWeight: '600',
          color: '#333'
        }}>
          {card.title}
        </h4>
      </div>
      
      {card.description && (
        <p style={{ 
          margin: '0 0 8px 0', 
          fontSize: '12px', 
          color: '#666',
          lineHeight: '1.4'
        }}>
          {card.description.length > 100 
            ? `${card.description.substring(0, 100)}...` 
            : card.description
          }
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
            color: '#666',
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