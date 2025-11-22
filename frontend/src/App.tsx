import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { UserProvider } from './context/UserContext'
import Home from './pages/Home'
import AppHome from './pages/AppHome'
import LevelSet from './pages/LevelSet'
import LevelSetGuess from './pages/LevelSetGuess'
import LevelConfig from './pages/LevelConfig'
import MyCustomLevels from './pages/MyCustomLevels'
import AppDraw from './pages/AppDraw'
import ChallengeDraw from './pages/ChallengeDraw'
import ChallengeGuess from './pages/ChallengeGuess'
import ConfigAI from './pages/ConfigAI'
import Introduction from './pages/Introduction'
import Login from './pages/Login'
import AppLogin from './pages/AppLogin'
import AppDonate from './pages/AppDonate'
import Room from './pages/Room'
import MultiplayerGame from './pages/MultiplayerGame'
import SingleGame from './pages/SingleGame'
import Gallery from './pages/Gallery'
import './App.css'

function App() {
  return (
    <AntApp>
      <UserProvider>
        <Router>
          <div className="app-shell">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/app/home" element={<AppHome />} />
              <Route path="/app/level-set" element={<LevelSet />} />
              <Route path="/app/level-set-guess" element={<LevelSetGuess />} />
              <Route path="/app/level-config" element={<LevelConfig />} />
              <Route path="/app/my-custom-levels" element={<MyCustomLevels />} />
              <Route path="/app/draw" element={<AppDraw />} />
              <Route path="/app/challenge-draw" element={<ChallengeDraw />} />
              <Route path="/app/challenge-guess" element={<ChallengeGuess />} />
              <Route path="/app/introduction" element={<Introduction />} />
              <Route path="/app/configAI" element={<ConfigAI />} />
              <Route path="/app/gallery" element={<Gallery />} />
              <Route path="/app/donate" element={<AppDonate />} />
              <Route path="/app/login" element={<AppLogin />} />
              <Route path="/login" element={<Login />} />
              <Route path="/rooms" element={<Room />} />
              <Route path="/game" element={<MultiplayerGame />} />
              <Route path="/game/single" element={<SingleGame />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </UserProvider>
    </AntApp>
  )
}

export default App
