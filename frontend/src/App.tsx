import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import './App.css'
import { BoardPage } from './components/BoardPage'
import { BoardsList } from './components/BoardsList'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { UISwitcher } from './components/UISwitcher'
import { SocketProvider } from './contexts/SocketContext'
import { useTheme } from './theme/useTheme'

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
        <UISwitcher />
      </div>
    </Router>
  )
}

export default App
