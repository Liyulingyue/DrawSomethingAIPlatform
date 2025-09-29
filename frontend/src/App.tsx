import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Room from './pages/Room'
import DrawingRoom from './pages/DrawingRoom'
import './App.css'

function App() {
  return (
    <UserProvider>
      <Router>
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/rooms" element={<Room />} />
            <Route path="/game" element={<DrawingRoom />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </UserProvider>
  )
}

export default App
