import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import './App.css'
import { Suspense, lazy } from 'react'
const BoardsList = lazy(() => import('./components/BoardsList').then(m => ({ default: m.BoardsList })))
const BoardPage = lazy(() => import('./components/BoardPage').then(m => ({ default: m.BoardPage })))
import { AppearanceControl } from './appearance'
import { SocketProvider } from './contexts/SocketContext'
import { useAppearance } from './appearance'

function App() {
  const { theme } = useAppearance()
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: theme.background }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `${theme.spacing?.sm || '10px'} ${theme.spacing?.md || '16px'}`,
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.surface
        }}>
          <h1 style={{ margin: 0, fontSize: '16px', color: theme.textPrimary }}>Kanban</h1>
          <div>
            <SignedOut>
              <div style={{ display: 'flex', gap: theme.spacing?.sm || '8px' }}>
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
          <div style={{ padding: theme.spacing?.xl || '24px' }}>
            <p style={{ color: theme.textPrimary }}>Please sign in to continue.</p>
          </div>
        </SignedOut>

        <SignedIn>
          <SocketProvider>
            <Suspense fallback={<div style={{ padding: (theme.spacing?.md || '16px') }}>Loading…</div>}>
              <Routes>
                <Route path="/" element={<BoardsList />} />
                <Route path="/board/:id" element={<BoardPage />} />
              </Routes>
            </Suspense>
          </SocketProvider>
        </SignedIn>
        <AppearanceControl />
      </div>
    </Router>
  )
}

export default App
