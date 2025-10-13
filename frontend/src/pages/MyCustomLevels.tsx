import { useState } from 'react'
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

  // 编辑关卡
  const handleEdit = (levelId: string) => {
    navigate(`/app/level-config?edit=${levelId}`)
  }

  // 删除关卡
  const handleDelete = (index: number) => {
    console.log('Delete button clicked, index:', index, 'total levels:', customLevels.length)
    const level = customLevels[index]
    if (!level) {
      console.error('Level not found at index:', index)
      message.error('未找到要删除的关卡')
      return
    }
    
    console.log('Showing modal.confirm for level:', level.title)
    try {
      modal.confirm({
        title: '确认删除',
        content: `确定要删除关卡"${level.title}"吗？此操作不可恢复。`,
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
          console.log('User confirmed deletion, deleting level:', level.id)
          const updatedCustomLevels = customLevels.filter((_, i) => i !== index)
          const saved = saveCustomLevels(updatedCustomLevels)
          if (saved) {
            setCustomLevels(updatedCustomLevels)
            message.success('关卡已删除')
          } else {
            message.error('删除失败，请重试')
          }
        },
        onCancel: () => {
          console.log('User cancelled deletion')
        }
      })
      console.log('modal.confirm called successfully')
    } catch (error) {
      console.error('Error showing modal.confirm:', error)
      message.error('删除失败,请重试')
    }
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      
      <div className="my-custom-levels-container">
        <div className="my-custom-levels-content">
          {/* 页面标题 */}
          <h1 className="my-custom-levels-title">我的自定义关卡</h1>
          
          <div className="my-custom-levels-nav-buttons">
            <Button
              type="primary"
              ghost
              onClick={() => navigate('/app/level-set')}
            >
              ← 返回闯关模式
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/app/level-config')}
            >
              创建新关卡
            </Button>
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
                      <h3 className="my-custom-level-card-title">{level.title}</h3>
                      <p className="my-custom-level-card-id">ID: {level.id}</p>
                    </div>
                  </div>
                  <p className="my-custom-level-card-description">{level.description}</p>
                  <div className="my-custom-level-card-keywords">
                    {level.keywords?.map((keyword, idx) => (
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
                        handleEdit(level.id)
                      }}
                    >
                      编辑
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
                      删除
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="my-custom-levels-empty">
              <div className="my-custom-levels-empty-icon">📝</div>
              <h3>还没有自定义关卡</h3>
              <p>点击上方"创建新关卡"按钮开始创建你的第一个关卡吧！</p>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => navigate('/app/level-config')}
              >
                立即创建
              </Button>
            </div>
          )}
          
          <AppFooter className="app-footer-light" />
        </div>
      </div>
    </>
  )
}

export default MyCustomLevels
