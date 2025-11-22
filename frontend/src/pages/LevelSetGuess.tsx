import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, message, Button } from 'antd'
import { LockOutlined, PlayCircleOutlined } from '@ant-design/icons'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { GUESS_LEVEL_CONFIGS, type GuessLevelConfig } from '../config/guessLevels'
import './LevelSet.css'

// 本地存储 key
const COMPLETED_GUESS_LEVELS_KEY = 'completed_guess_levels'

function LevelSetGuess() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  // 获取已完成的关卡列表
  const getCompletedLevels = (): Set<string> => {
    try {
      const stored = localStorage.getItem(COMPLETED_GUESS_LEVELS_KEY)
      if (stored) {
        return new Set(JSON.parse(stored))
      }
    } catch (error) {
      console.error('读取已完成的猜词关卡失败:', error)
    }
    return new Set()
  }

  // 检查关卡是否已完成
  const isLevelCompleted = (levelId: string): boolean => {
    const completed = getCompletedLevels()
    return completed.has(levelId)
  }

  const handleStartChallenge = (level: GuessLevelConfig, e: React.MouseEvent) => {
    e.stopPropagation()
    if (level.status === 'coming-soon') {
      message.info(`${level.title}关卡即将推出，敬请期待！`)
      return
    }

    console.log(`开始猜词挑战: ${level.id} - ${level.title}`)

    // 导航到猜词游戏页面，从第一个关键词开始
    navigate(`/app/challenge-guess?level=${level.id}&keywordIndex=0`)
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      <div className="level-set-container">
        <div className="level-set-content">
        <h1 className="level-set-title">猜词闯关</h1>
        <p className="level-set-subtitle">看到AI生成的图片，猜出对应的词语。每关10个词，按随机顺序挑战</p>

        <div className="level-cards-grid">
          {GUESS_LEVEL_CONFIGS.map((level) => (
            <Card
              key={level.id}
              hoverable={false}
              className={`level-card ${level.status === 'coming-soon' ? 'level-card-locked' : ''}`}
            >
              {level.status === 'coming-soon' && (
                <div className="level-card-lock-overlay">
                  <LockOutlined className="level-card-lock-icon" />
                  <span className="level-card-lock-text">待更新...</span>
                </div>
              )}
              {level.difficulty && (
                <div className="level-card-difficulty-badge">
                  {level.difficulty}
                </div>
              )}
              <div className="level-card-icon">{level.icon}</div>
              <h3 className="level-card-title">{level.title}</h3>
              <p className="level-card-description">{level.description}</p>
              <div className="level-card-info">
                <span className="level-keyword-count">📝 {level.keywords.length} 个词语</span>
              </div>
              <div className="level-card-buttons">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={(e) => handleStartChallenge(level, e)}
                  disabled={level.status === 'coming-soon'}
                  className="level-card-button"
                >
                  开始挑战
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <AppFooter className="app-footer-light" />
      </div>
      </div>
    </>
  )
}

export default LevelSetGuess