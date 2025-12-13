import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Form, Input, Select, Button, message, Card } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import type { LevelConfig } from '../config/levels'
import './LevelConfig.css'

// 本地存储 key
const CUSTOM_LEVELS_KEY = 'custom_levels'

// 图标选项
const ICON_OPTIONS = [
  { label: '🎨 画笔', value: '🎨' },
  { label: '🌟 星星', value: '🌟' },
  { label: '🎯 靶心', value: '🎯' },
  { label: '🏆 奖杯', value: '🏆' },
  { label: '🎭 面具', value: '🎭' },
  { label: '🎪 马戏团', value: '🎪' },
  { label: '🎡 摩天轮', value: '🎡' },
  { label: '🎢 过山车', value: '🎢' },
  { label: '🎠 旋转木马', value: '🎠' },
  { label: '🎮 游戏', value: '🎮' },
  { label: '🚀 火箭', value: '🚀' },
  { label: '⭐ 五角星', value: '⭐' },
  { label: '💎 宝石', value: '💎' },
  { label: '🔥 火焰', value: '🔥' },
  { label: '⚡ 闪电', value: '⚡' },
]

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
const saveCustomLevels = (levels: LevelConfig[]): void => {
  try {
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(levels))
  } catch (error) {
    console.error('保存自定义关卡失败:', error)
    message.error('保存失败，请重试')
  }
}

function CustomLevelConfiguration() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [customLevels, setCustomLevels] = useState<LevelConfig[]>(getCustomLevels())
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 获取关卡类型
  const levelType = searchParams.get('type') || 'draw'

  useEffect(() => {
    // 检查是否有编辑参数
    const editId = searchParams.get('edit')
    if (editId) {
      // 查找要编辑的关卡
      const levelToEdit = customLevels.find(level => level.id === editId)
      if (levelToEdit) {
        setEditingLevelId(editId)
        form.setFieldsValue({
          id: levelToEdit.id,
          title: levelToEdit.title,
          description: levelToEdit.description,
          icon: levelToEdit.icon,
          difficulty: levelToEdit.difficulty || '休闲',
          keywords: (typeof levelToEdit.keywords === 'string' ? levelToEdit.keywords : levelToEdit.keywords?.join(', ')) || '',
          clue: levelToEdit.clue || ''
        })
      } else {
        message.warning('未找到要编辑的关卡')
        navigate('/app/my-custom-levels')
      }
    } else {
      // 新建模式
      setEditingLevelId(null)
      form.setFieldsValue({ icon: '🎨', difficulty: '休闲' })
    }
  }, [searchParams, customLevels, form, navigate])

  // 保存关卡
  const handleSave = () => {
    form.validateFields().then(values => {
      const rawKeywordsInput = (values.keywords || '').trim()
      let keywordsToSave: string | string[] = []

      if (!rawKeywordsInput) {
        message.warning('请至少添加一个关键词或翻译键')
        return
      }

      if (rawKeywordsInput.includes(',')) {
        const keywordsArray = rawKeywordsInput
          .split(',')
          .map((k: string) => k.trim())
          .filter((k: string) => k.length > 0)
        keywordsToSave = keywordsArray
      } else if (rawKeywordsInput.includes('.') && (rawKeywordsInput.startsWith('levels.draw.') || rawKeywordsInput.startsWith('levels.guess.'))) {
        // Treat as a translation key
        keywordsToSave = rawKeywordsInput
      } else {
        // Single literal keyword
        keywordsToSave = [rawKeywordsInput]
      }

      const newLevel: LevelConfig = {
        id: values.id || `custom-${Date.now()}`,
        title: values.title,
        description: values.description,
        icon: values.icon,
        keywords: keywordsToSave,
        clue: values.clue?.trim() || undefined,
        status: 'available',
        difficulty: values.difficulty || '休闲',
        type: levelType as 'draw' | 'guess'
      }

      let updatedCustomLevels: LevelConfig[]

      if (editingLevelId) {
        // 编辑模式：更新现有关卡
        const existingIndex = customLevels.findIndex(level => level.id === editingLevelId)
        if (existingIndex !== -1) {
          updatedCustomLevels = [...customLevels]
          updatedCustomLevels[existingIndex] = newLevel
          message.success('关卡更新成功！')
        } else {
          message.error('未找到要更新的关卡')
          return
        }
      } else {
        // 新建模式：检查ID是否已存在
        const idExists = customLevels.some(level => level.id === newLevel.id)
        if (idExists) {
          message.error('关卡ID已存在，请使用其他ID')
          return
        }
        updatedCustomLevels = [...customLevels, newLevel]
        message.success('关卡创建成功！')
      }
      
      saveCustomLevels(updatedCustomLevels)
      setCustomLevels(updatedCustomLevels)
      
      // 跳转回自定义关卡列表
      navigate('/app/my-custom-levels')
    }).catch(error => {
      console.error('表单验证失败:', error)
    })
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      
      <div className="level-config-container">
        <div className="level-config-content">
          {/* 页面标题 */}
          <h1 className="level-config-title">
            {editingLevelId ? '编辑自定义关卡' : (levelType === 'guess' ? '创建猜词自定义关卡' : '创建绘画自定义关卡')}
          </h1>
          
          <div className="level-config-nav-buttons">
            <Button
              type="primary"
              ghost
              onClick={() => navigate(levelType === 'guess' ? '/app/level-set-guess' : '/app/level-set')}
              style={levelType === 'guess' ? {
                borderColor: '#667eea',
                color: '#667eea'
              } : undefined}
            >
              ← {levelType === 'guess' ? '返回猜词闯关' : '返回绘画闯关'}
            </Button>
            <Button
              type="primary"
              ghost
              onClick={() => navigate('/app/my-custom-levels')}
            >
              📝 我的自定义关卡
            </Button>
          </div>

          {/* 关卡配置表单 */}
          <Card className="level-config-form-card">
            <Form
              form={form}
              layout="vertical"
              initialValues={{ icon: '🎨' }}
            >
              <Form.Item
                name="id"
                label="关卡ID"
                rules={[
                  { required: true, message: '请输入关卡ID' },
                  { pattern: /^[a-z0-9-]+$/, message: 'ID只能包含小写字母、数字和连字符' }
                ]}
                extra={editingLevelId ? '编辑模式下ID不可修改' : '建议格式: custom-xxx，例如: custom-animals'}
              >
                <Input 
                  placeholder="例如: custom-animals" 
                  size="large"
                  disabled={!!editingLevelId}
                />
              </Form.Item>

              <Form.Item
                name="title"
                label="关卡标题"
                rules={[{ required: true, message: '请输入关卡标题' }]}
              >
                <Input placeholder="例如: 动物世界" size="large" />
              </Form.Item>

              <Form.Item
                name="description"
                label="关卡描述"
                rules={[{ required: true, message: '请输入关卡描述' }]}
              >
                <Input.TextArea 
                  placeholder="例如: 挑战各种动物的绘画" 
                  rows={3}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="icon"
                label="关卡图标"
                rules={[{ required: true, message: '请选择关卡图标' }]}
              >
                <Select
                  placeholder="选择一个图标"
                  options={ICON_OPTIONS}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="difficulty"
                label="关卡难度"
                rules={[{ required: true, message: '请选择关卡难度' }]}
              >
                <Select
                  placeholder="选择难度等级"
                  size="large"
                  options={[
                    { label: '简单', value: '简单' },
                    { label: '中等', value: '中等' },
                    { label: '困难', value: '困难' },
                    { label: '专家', value: '专家' },
                    { label: '休闲', value: '休闲' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="keywords"
                label="关键词列表"
                rules={[{ required: true, message: '请输入至少一个关键词' }]}
                extra="多个关键词用英文逗号分隔，例如: 猫, 狗, 兔子"
              >
                <Input.TextArea 
                  placeholder="猫, 狗, 兔子, 大象, 长颈鹿" 
                  rows={5}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="clue"
                label="提示信息（可选）"
                extra="该提示会传递给 AI 辅助识别，但不会在绘画页面显示给玩家"
              >
                <Input.TextArea 
                  placeholder="例如: 这些都是常见的宠物动物" 
                  rows={3}
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />} 
                  onClick={handleSave}
                  size="large"
                  block
                >
                  {editingLevelId ? '保存修改' : '创建关卡'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default CustomLevelConfiguration
