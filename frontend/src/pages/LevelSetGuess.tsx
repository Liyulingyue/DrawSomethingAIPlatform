import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, message, Button } from 'antd'
import { LockOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { GUESS_LEVEL_CONFIGS, type GuessLevelConfig } from '../config/guessLevels'
import type { LevelConfig } from '../config/levels'
import './LevelSet.css'

// 本地存储 key
const CUSTOM_LEVELS_KEY = 'custom_levels'

// 获取自定义关卡列表
const getCustomLevels = (): LevelConfig[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_LEVELS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('读取自定义关卡失败:', error)
  }
  return []
}

function LevelSetGuess() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const [customLevels] = useState<LevelConfig[]>(getCustomLevels())

  // 只获取猜词闯关类型的自定义关卡，并转换为GuessLevelConfig格式
  const guessCustomLevels: GuessLevelConfig[] = customLevels
    .filter(level => level.type === 'guess' && level.keywords && level.keywords.length > 0)
    .map(level => ({
      ...level,
      keywords: level.keywords!,
      status: level.status as 'available' | 'coming-soon'
    }))

  // 合并预设关卡和自定义关卡
  const allLevels = [...GUESS_LEVEL_CONFIGS, ...guessCustomLevels]

  // 无需登录 - 用户可以使用自定义配置调用绘画API

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

  const handleAddCustomLevel = () => {
    navigate('/app/level-config')
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      <div className="level-set-container">
        <div className="level-set-content">
        <h1 className="level-set-title">猜词闯关(Beta)</h1>
        <p className="level-set-subtitle">看到AI生成的图片，猜出对应的词语。每关10个词，按随机顺序挑战</p>

        <div className="level-cards-grid">
          {allLevels.map((level) => (
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

          {/* 创建自定义关卡卡片 */}
          <Card
            hoverable
            className="level-card level-card-create"
            onClick={handleAddCustomLevel}
          >
            <div className="level-card-create-content">
              <PlusOutlined className="level-card-create-icon" />
              <h3 className="level-card-create-title">我的自定义关卡</h3>
              <p className="level-card-create-description">
                查看和管理你的自定义关卡
              </p>
            </div>
          </Card>
        </div>
        <AppFooter className="app-footer-light" />
      </div>
      </div>
    </>
  )
}

export default LevelSetGuess