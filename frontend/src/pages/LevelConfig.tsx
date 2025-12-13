import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Form, Input, Select, Button, message, Card } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import type { LevelConfig } from '../config/levels'
import './LevelConfig.css'

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
  const { t } = useTranslation('levelConfig')

  // 图标选项
  const ICON_OPTIONS = t('levelConfig.iconOptions', { returnObjects: true }) as Array<{label: string, value: string}>

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
        message.warning(t('levelConfig.messages.levelNotFoundEdit'))
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
        message.warning(t('levelConfig.messages.keywordsRequired'))
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
          message.success(t('levelConfig.messages.updateSuccess'))
        } else {
          message.error(t('levelConfig.messages.levelNotFound'))
          return
        }
      } else {
        // 新建模式：检查ID是否已存在
        const idExists = customLevels.some(level => level.id === newLevel.id)
        if (idExists) {
          message.error(t('levelConfig.messages.idExists'))
          return
        }
        updatedCustomLevels = [...customLevels, newLevel]
        message.success(t('levelConfig.messages.createSuccess'))
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
            {editingLevelId ? t('levelConfig.title.edit') : (levelType === 'guess' ? t('levelConfig.title.createGuess') : t('levelConfig.title.createDraw'))}
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
              {levelType === 'guess' ? t('levelConfig.navButtons.backToGuess') : t('levelConfig.navButtons.backToDraw')}
            </Button>
            <Button
              type="primary"
              ghost
              onClick={() => navigate('/app/my-custom-levels')}
            >
              {t('levelConfig.navButtons.myCustomLevels')}
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
                label={t('levelConfig.form.id.label')}
                rules={[
                  { required: true, message: t('levelConfig.form.id.required') },
                  { pattern: /^[a-z0-9-]+$/, message: t('levelConfig.form.id.pattern') }
                ]}
                extra={editingLevelId ? t('levelConfig.form.id.extra') : t('levelConfig.form.id.suggestion')}
              >
                <Input 
                  placeholder={t('levelConfig.form.id.placeholder')} 
                  size="large"
                  disabled={!!editingLevelId}
                />
              </Form.Item>

              <Form.Item
                name="title"
                label={t('levelConfig.form.title.label')}
                rules={[{ required: true, message: t('levelConfig.form.title.required') }]}
              >
                <Input placeholder={t('levelConfig.form.title.placeholder')} size="large" />
              </Form.Item>

              <Form.Item
                name="description"
                label={t('levelConfig.form.description.label')}
                rules={[{ required: true, message: t('levelConfig.form.description.required') }]}
              >
                <Input.TextArea 
                  placeholder={t('levelConfig.form.description.placeholder')} 
                  rows={3}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="icon"
                label={t('levelConfig.form.icon.label')}
                rules={[{ required: true, message: t('levelConfig.form.icon.required') }]}
              >
                <Select
                  placeholder={t('levelConfig.form.icon.placeholder')}
                  options={ICON_OPTIONS}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="difficulty"
                label={t('levelConfig.form.difficulty.label')}
                rules={[{ required: true, message: t('levelConfig.form.difficulty.required') }]}
              >
                <Select
                  placeholder={t('levelConfig.form.difficulty.placeholder')}
                  size="large"
                  options={[
                    { label: t('levelConfig.form.difficulty.options.easy'), value: '简单' },
                    { label: t('levelConfig.form.difficulty.options.medium'), value: '中等' },
                    { label: t('levelConfig.form.difficulty.options.hard'), value: '困难' },
                    { label: t('levelConfig.form.difficulty.options.expert'), value: '专家' },
                    { label: t('levelConfig.form.difficulty.options.casual'), value: '休闲' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="keywords"
                label={t('levelConfig.form.keywords.label')}
                rules={[{ required: true, message: t('levelConfig.form.keywords.required') }]}
                extra={t('levelConfig.form.keywords.extra')}
              >
                <Input.TextArea 
                  placeholder={t('levelConfig.form.keywords.placeholder')} 
                  rows={5}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="clue"
                label={t('levelConfig.form.clue.label')}
                extra={t('levelConfig.form.clue.extra')}
              >
                <Input.TextArea 
                  placeholder={t('levelConfig.form.clue.placeholder')} 
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
                  {editingLevelId ? t('levelConfig.form.save.edit') : t('levelConfig.form.save.create')}
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
