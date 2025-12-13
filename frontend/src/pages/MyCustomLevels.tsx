import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Tag, App } from 'antd'
import { DeleteOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import type { LevelConfig } from '../config/levels'
import './MyCustomLevels.css'

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

// 保存自定义关卡列表
const saveCustomLevels = (levels: LevelConfig[]): boolean => {
  try {
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(levels))
    return true
  } catch (error) {
    console.error('保存自定义关卡失败:', error)
    return false
  }
}

function MyCustomLevels() {
  const { message, modal } = App.useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [customLevels, setCustomLevels] = useState<LevelConfig[]>(getCustomLevels())
  const navigate = useNavigate()
  const { t: tLevels } = useTranslation('levels')
  const { t: tPage } = useTranslation('myCustomLevels')

  const resolveKeywords = (level: LevelConfig): string[] => {
    if (!level.keywords) return []
    if (typeof level.keywords === 'string') {
      const translated = tLevels(level.keywords, { returnObjects: true })
      return Array.isArray(translated) ? translated.map(String) : []
    }
    return level.keywords
  }

  // 编辑关卡
  const handleEdit = (level: LevelConfig) => {
    const typeParam = level.type ? `&type=${level.type}` : ''
    navigate(`/app/level-config?edit=${level.id}${typeParam}`)
  }

  // 删除关卡
  const handleDelete = (index: number) => {
    console.log('Delete button clicked, index:', index, 'total levels:', customLevels.length)
    const level = customLevels[index]
    if (!level) {
      console.error('Level not found at index:', index)
      message.error(tPage('myCustomLevels.messages.levelNotFound'))
      return
    }
    
    console.log('Showing modal.confirm for level:', level.title)
    try {
      modal.confirm({
        title: tPage('myCustomLevels.modals.deleteConfirm.title'),
        content: tPage('myCustomLevels.modals.deleteConfirm.content', { title: level.title }),
        okText: tPage('myCustomLevels.modals.deleteConfirm.okText'),
        okType: 'danger',
        cancelText: tPage('myCustomLevels.modals.deleteConfirm.cancelText'),
        onOk: () => {
          console.log('User confirmed deletion, deleting level:', level.id)
          const updatedCustomLevels = customLevels.filter((_, i) => i !== index)
          const saved = saveCustomLevels(updatedCustomLevels)
          if (saved) {
            setCustomLevels(updatedCustomLevels)
            message.success(tPage('myCustomLevels.messages.deleteSuccess'))
          } else {
            message.error(tPage('myCustomLevels.messages.deleteFailed'))
          }
        },
        onCancel: () => {
          console.log('User cancelled deletion')
        }
      })
      console.log('modal.confirm called successfully')
    } catch (error) {
      console.error('Error showing modal.confirm:', error)
      message.error(tPage('myCustomLevels.messages.deleteFailed'))
    }
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      
      <div className="my-custom-levels-container">
        <div className="my-custom-levels-content">
          {/* 页面标题 */}
          <h1 className="my-custom-levels-title">{tPage('myCustomLevels.title')}</h1>
          
          <div className="my-custom-levels-nav-buttons">
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                type="primary"
                ghost
                onClick={() => navigate('/app/level-set')}
              >
                {tPage('myCustomLevels.backToDrawing')}
              </Button>
              <Button
                type="primary"
                ghost
                onClick={() => navigate('/app/level-set-guess')}
                style={{
                  borderColor: '#667eea',
                  color: '#667eea'
                }}
              >
                {tPage('myCustomLevels.backToGuessing')}
              </Button>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/app/level-config?type=draw')}
              >
                {tPage('myCustomLevels.createDrawingLevel')}
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/app/level-config?type=guess')}
              >
                {tPage('myCustomLevels.createGuessingLevel')}
              </Button>
            </div>
          </div>

          {/* 关卡列表 */}
          {customLevels.length > 0 ? (
            <div className="my-custom-levels-cards">
              {customLevels.map((level, index) => (
                <Card
                  key={level.id}
                  className="my-custom-level-card"
                  hoverable={false}
                >
                  <div className="my-custom-level-card-header">
                    <div className="my-custom-level-card-icon">{level.icon}</div>
                    <div className="my-custom-level-card-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 className="my-custom-level-card-title">{level.title}</h3>
                        <Tag color={level.type === 'guess' ? 'purple' : 'blue'}>
                          {level.type === 'guess' ? tPage('myCustomLevels.guessLevelTag') : tPage('myCustomLevels.drawLevelTag')}
                        </Tag>
                      </div>
                      <p className="my-custom-level-card-id">ID: {level.id}</p>
                    </div>
                  </div>
                  <p className="my-custom-level-card-description">{level.description}</p>
                  <div className="my-custom-level-card-keywords">
                    {(resolveKeywords(level) || []).map((keyword: string, idx: number) => (
                      <Tag key={idx} color="blue">{keyword}</Tag>
                    ))}
                  </div>
                  {level.clue && (
                    <p className="my-custom-level-card-clue">
                      💡 提示: {level.clue}
                    </p>
                  )}
                  <div className="my-custom-level-card-actions">
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        console.log('Edit button onClick fired! Level ID:', level.id)
                        e.stopPropagation()
                        handleEdit(level)
                      }}
                    >
                      {tPage('myCustomLevels.levelCard.edit')}
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        console.log('Button onClick fired! Event:', e, 'Index:', index)
                        e.stopPropagation()
                        e.preventDefault()
                        handleDelete(index)
                      }}
                    >
                      {tPage('myCustomLevels.levelCard.delete')}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="my-custom-levels-empty">
              <div className="my-custom-levels-empty-icon">📝</div>
              <h3>{tPage('myCustomLevels.noCustomLevels')}</h3>
              <p>{tPage('myCustomLevels.createFirstLevel')}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/app/level-config?type=draw')}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                >
                  {tPage('myCustomLevels.createDrawingLevel')}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/app/level-config?type=guess')}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                >
                  {tPage('myCustomLevels.createGuessingLevel')}
                </Button>
              </div>
            </div>
          )}
          
          <AppFooter className="app-footer-light" />
        </div>
      </div>
    </>
  )
}

export default MyCustomLevels
