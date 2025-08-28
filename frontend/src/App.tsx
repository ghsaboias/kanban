import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { BoardsList } from './components/BoardsList'
import { BoardPage } from './components/BoardPage'
import './App.css'

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#fafbfc' }}>
        <Routes>
          <Route path="/" element={<BoardsList />} />
          <Route path="/board/:id" element={<BoardPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
