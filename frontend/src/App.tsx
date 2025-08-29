import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { BoardsList } from './components/BoardsList'
import { BoardPage } from './components/BoardPage'
import { SocketProvider } from './contexts/SocketContext'
import './App.css'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#fafbfc' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid #e1e5e9',
          backgroundColor: '#fff'
        }}>
          <h1 style={{ margin: 0, fontSize: '16px', color: '#111' }}>Kanban</h1>
          <div>
            <SignedOut>
              <div style={{ display: 'flex', gap: '8px' }}>
                <SignInButton />
                <SignUpButton />
              </div>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </header>
        
        <SignedOut>
          <div style={{ padding: '24px' }}>
            <p style={{ color: '#111' }}>Please sign in to continue.</p>
          </div>
        </SignedOut>

        <SignedIn>
          <SocketProvider>
            <Routes>
              <Route path="/" element={<BoardsList />} />
              <Route path="/board/:id" element={<BoardPage />} />
            </Routes>
          </SocketProvider>
        </SignedIn>
      </div>
    </Router>
  )
}

export default App
