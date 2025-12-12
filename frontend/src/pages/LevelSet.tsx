import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, message, Button, Modal, Tag } from 'antd'
import { LockOutlined, PlayCircleOutlined, UnorderedListOutlined, CheckCircleOutlined, CheckCircleFilled, PlusOutlined } from '@ant-design/icons'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { LEVEL_CONFIGS, type LevelConfig } from '../config/levels'
import { useTranslation } from 'react-i18next'
import './LevelSet.css'

// 本地存储 key
const COMPLETED_KEYWORDS_KEY = 'completed_keywords'
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

// 获取已完成的关键词列表
const getCompletedKeywords = (): Set<string> => {
  try {
    const stored = localStorage.getItem(COMPLETED_KEYWORDS_KEY)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch (error) {
    console.error('读取已完成关键词失败:', error)
  }
  return new Set()
}

// 检查关键词是否已完成
const isKeywordCompleted = (levelId: string, keyword: string): boolean => {
  const completed = getCompletedKeywords()
  return completed.has(`${levelId}:${keyword}`)
}

function LevelSet() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig | null>(null)
  const [customLevels] = useState<LevelConfig[]>(getCustomLevels())
  const navigate = useNavigate()
  const { t: tPage } = useTranslation('levelSet')
  const { t: tLevels } = useTranslation('levels')

  // 获取 level 的关键词（支持直接数组或翻译键）
  const getKeywordsForLevel = (level: LevelConfig | null): string[] => {
    if (!level || !level.keywords) return []
    if (typeof level.keywords === 'string') {
      const translated = tLevels(level.keywords as string, { returnObjects: true })
      return Array.isArray(translated) ? translated.map(String) : []
    }
    return level.keywords
  }

  // 获取等级显示文本（支持 translation key 或 原文）
  const getDisplayLevelText = (text?: string | undefined): string => {
    if (!text) return ''
    // 如果看起来像翻译键（包含点或者以 draw/guess 开头）则使用 tLevels
    if (text.includes('.') || text.startsWith('draw.') || text.startsWith('guess.')) {
      return tLevels(text)
    }
    // 否则原样返回（自定义关卡的文本）
    return text
  }

  // 只获取绘画闯关类型的自定义关卡
  const drawCustomLevels = customLevels.filter(level => !level.type || level.type === 'draw')

  // 合并默认关卡和自定义关卡，并排序：可用的在前，待更新的在后
  const allLevels = [...LEVEL_CONFIGS, ...drawCustomLevels].sort((a, b) => {
    // 如果状态不同，可用的排在前面
    if (a.status === 'coming-soon' && b.status !== 'coming-soon') return 1
    if (a.status !== 'coming-soon' && b.status === 'coming-soon') return -1
    // 状态相同时保持原顺序
    return 0
  })

  const handleStartChallenge = (level: LevelConfig, e: React.MouseEvent) => {
    e.stopPropagation()
    if (level.status === 'coming-soon') {
      message.info(tPage('levelSet.messages.comingSoon', { title: getDisplayLevelText(level.title) }))
      return
    }

    // 检查是否有关键词
    const keywords = getKeywordsForLevel(level)
    if (keywords.length === 0) {
      message.warning(tPage('levelSet.messages.noKeywords', { title: getDisplayLevelText(level.title) }))
      return
    }

    // 开始挑战：从第一个关键词开始
    const firstKeyword = keywords[0]
    console.log(`开始挑战: ${level.id} - ${getDisplayLevelText(level.title)}, 第一个关键词: ${firstKeyword}`)
    message.success(tPage('levelSet.messages.startChallenge', { title: getDisplayLevelText(level.title), keyword: firstKeyword }))
    
    // 导航到关卡游戏页面，从第一个关键词开始
    navigate(`/app/challenge-draw?level=${level.id}&keyword=${encodeURIComponent(firstKeyword)}`)
  }

  const handleSelectChallenge = (level: LevelConfig, e: React.MouseEvent) => {
    e.stopPropagation()
    if (level.status === 'coming-soon') {
      message.info(tPage('levelSet.messages.comingSoon', { title: getDisplayLevelText(level.title) }))
      return
    }
    // 打开选关弹窗
    setSelectedLevel(level)
    setModalOpen(true)
  }

  const handleKeywordSelect = (keyword: string) => {
    if (!selectedLevel) return
    
    console.log(`选择关键词: ${keyword} (${getDisplayLevelText(selectedLevel?.title)})`)
    message.success(tPage('levelSet.messages.keywordSelected', { keyword }))
    
    // 关闭弹窗
    setModalOpen(false)
    
    // 导航到闯关绘画页面，携带关键词参数
    navigate(`/app/challenge-draw?level=${selectedLevel.id}&keyword=${encodeURIComponent(keyword)}`)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedLevel(null)
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      <div className="level-set-container">
        <div className="level-set-content">
        <h1 className="level-set-title">{tPage('levelSet.title')}</h1>
        
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
                  <span className="level-card-lock-text">{tPage('levelSet.comingSoon')}</span>
                </div>
              )}
              {level.difficulty && (
                <div className="level-card-difficulty-badge">
                  {tLevels(level.difficulty)}
                </div>
              )}
              <div className="level-card-icon">{level.icon}</div>
              <h3 className="level-card-title">{getDisplayLevelText(level.title)}</h3>
              <p className="level-card-description">{getDisplayLevelText(level.description)}</p>
              <div className="level-card-buttons">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={(e) => handleStartChallenge(level, e)}
                  disabled={level.status === 'coming-soon'}
                  className="level-card-button"
                >
                  {tPage('levelSet.startChallenge')}
                </Button>
                <Button
                  icon={<UnorderedListOutlined />}
                  onClick={(e) => handleSelectChallenge(level, e)}
                  disabled={level.status === 'coming-soon'}
                  className="level-card-button"
                >
                  {tPage('levelSet.selectChallenge')}
                </Button>
              </div>
            </Card>
          ))}
          
          {/* 创建自定义关卡卡片 */}
          <Card
            hoverable
            className="level-card level-card-create"
            onClick={() => navigate('/app/my-custom-levels')}
          >
            <div className="level-card-create-content">
              <PlusOutlined className="level-card-create-icon" />
              <h3 className="level-card-create-title">{tPage('levelSet.customLevels.title')}</h3>
              <p className="level-card-create-description">
                {tPage('levelSet.customLevels.description')}
              </p>
            </div>
          </Card>
        </div>
        <AppFooter className="app-footer-light" />
      </div>
      </div>

      {/* 选关弹窗 */}
      <Modal
        title={
          <div className="level-modal-title">
            <span className="level-modal-icon">{selectedLevel?.icon}</span>
            <span>{getDisplayLevelText(selectedLevel?.title)} - {tPage('levelSet.modal.selectLevel')}</span>
          </div>
        }
        open={modalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={600}
        className="level-select-modal"
      >
        <div className="level-modal-content">
          <p className="level-modal-description">
            {tPage('levelSet.modal.description')}
          </p>
          <div className="level-keywords-grid">
            {getKeywordsForLevel(selectedLevel).map((keyword, index) => {
              const selectedLevelId = selectedLevel ? selectedLevel.id : ''
              const completed = selectedLevelId ? isKeywordCompleted(selectedLevelId, keyword) : false
              return (
                <Tag
                  key={index}
                  className={`level-keyword-tag ${completed ? 'level-keyword-completed' : 'level-keyword-incomplete'}`}
                  icon={completed ? <CheckCircleFilled /> : <CheckCircleOutlined />}
                  color={completed ? 'success' : 'default'}
                  onClick={() => handleKeywordSelect(keyword)}
                  style={{
                    cursor: 'pointer',
                    borderColor: completed ? '#52c41a' : '#d9d9d9',
                    background: completed ? '#f6ffed' : '#ffffff'
                  }}
                >
                  {keyword}
                </Tag>
              )
            })}
          </div>
          {getKeywordsForLevel(selectedLevel).length === 0 && (
            <div className="level-no-keywords">
              {tPage('levelSet.modal.noKeywords')}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

export default LevelSet
