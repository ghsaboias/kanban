import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { BoardsList } from './components/BoardsList'
import { BoardPage } from './components/BoardPage'
import { SocketProvider } from './contexts/SocketContext'
import './App.css'
import { useTheme } from './theme/ThemeProvider'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'

function App() {
  const { theme } = useTheme()
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: theme.background }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.surface
        }}>
          <h1 style={{ margin: 0, fontSize: '16px', color: theme.textPrimary }}>Kanban</h1>
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
            <p style={{ color: theme.textPrimary }}>Please sign in to continue.</p>
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
        <ThemeSwitcher />
      </div>
    </Router>
  )
}

export default App
