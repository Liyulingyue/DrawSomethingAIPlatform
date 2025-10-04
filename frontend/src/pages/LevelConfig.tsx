import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Select, Button, message, Card, Space, Modal, Tag } from 'antd'
import { SaveOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
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

function LevelConfig() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [customLevels, setCustomLevels] = useState<LevelConfig[]>(getCustomLevels())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  useEffect(() => {
    // 组件加载时重置表单为新建模式
    form.setFieldsValue({ icon: '🎨' })
  }, [form])

  // 保存关卡
  const handleSave = () => {
    form.validateFields().then(values => {
      const keywordsArray = values.keywords
        .split(',')
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0)

      if (keywordsArray.length === 0) {
        message.warning('请至少添加一个关键词')
        return
      }

      const newLevel: LevelConfig = {
        id: values.id || `custom-${Date.now()}`,
        title: values.title,
        description: values.description,
        icon: values.icon,
        keywords: keywordsArray,
        clue: values.clue?.trim() || undefined,
        status: 'available'
      }

      let updatedCustomLevels: LevelConfig[]

      if (editingIndex !== null) {
        // 编辑现有关卡
        updatedCustomLevels = [...customLevels]
        updatedCustomLevels[editingIndex] = newLevel
        message.success('关卡更新成功！')
        setEditingIndex(null)
      } else {
        // 新建关卡
        // 检查ID是否已存在
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
      form.resetFields()
      form.setFieldsValue({ icon: '🎨' })
    }).catch(error => {
      console.error('表单验证失败:', error)
    })
  }

  // 编辑关卡
  const handleEdit = (index: number) => {
    const level = customLevels[index]
    setEditingIndex(index)
    form.setFieldsValue({
      id: level.id,
      title: level.title,
      description: level.description,
      icon: level.icon,
      keywords: level.keywords?.join(', ') || '',
      clue: level.clue || ''
    })
    // 滚动到表单顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 删除关卡
  const handleDelete = (index: number) => {
    const level = customLevels[index]
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除关卡"${level.title}"吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const updatedCustomLevels = customLevels.filter((_, i) => i !== index)
        saveCustomLevels(updatedCustomLevels)
        setCustomLevels(updatedCustomLevels)
        message.success('关卡已删除')
        
        // 如果删除的是正在编辑的关卡，重置表单
        if (editingIndex === index) {
          setEditingIndex(null)
          form.resetFields()
          form.setFieldsValue({ icon: '🎨' })
        }
      }
    })
  }

  // 取消编辑
  const handleCancel = () => {
    setEditingIndex(null)
    form.resetFields()
    form.setFieldsValue({ icon: '🎨' })
    message.info('已取消编辑')
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      
      <div className="level-config-container">
        <div className="level-config-content">
          {/* 页面标题 */}
          <h1 className="level-config-title">
            {editingIndex !== null ? '编辑自定义关卡' : '创建自定义关卡'}
          </h1>
          <Button
            className="level-config-back-btn"
            type="primary"
            ghost
            onClick={() => navigate('/app/level-set')}
          >
            ← 返回闯关模式页面
          </Button>

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
                extra={editingIndex !== null ? '编辑模式下ID不可修改' : '建议格式: custom-xxx，例如: custom-animals'}
              >
                <Input 
                  placeholder="例如: custom-animals" 
                  disabled={editingIndex !== null}
                  size="large"
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
                <Space size="middle">
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    onClick={handleSave}
                    size="large"
                  >
                    {editingIndex !== null ? '更新关卡' : '创建关卡'}
                  </Button>
                  {editingIndex !== null && (
                    <Button 
                      onClick={handleCancel}
                      size="large"
                    >
                      取消编辑
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {/* 已创建的关卡列表 */}
          {customLevels.length > 0 && (
            <div className="level-config-list">
              <h2 className="level-config-list-title">
                <PlusOutlined /> 我的自定义关卡 ({customLevels.length})
              </h2>
              <div className="level-config-cards">
                {customLevels.map((level, index) => (
                  <Card
                    key={level.id}
                    className={`level-config-card ${editingIndex === index ? 'level-config-card-editing' : ''}`}
                  >
                    <div className="level-config-card-header">
                      <div className="level-config-card-icon">{level.icon}</div>
                      <div className="level-config-card-info">
                        <h3 className="level-config-card-title">{level.title}</h3>
                        <p className="level-config-card-id">ID: {level.id}</p>
                      </div>
                    </div>
                    <p className="level-config-card-description">{level.description}</p>
                    <div className="level-config-card-keywords">
                      {level.keywords?.map((keyword, idx) => (
                        <Tag key={idx} color="blue">{keyword}</Tag>
                      ))}
                    </div>
                    <div className="level-config-card-actions">
                      <Button
                        type="primary"
                        onClick={() => handleEdit(index)}
                        disabled={editingIndex === index}
                      >
                        编辑
                      </Button>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(index)}
                      >
                        删除
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default LevelConfig
