import { useState, useEffect } from 'react'
import { Input, Button, Form, Card, App, Radio } from 'antd'
import { ApiOutlined, KeyOutlined, RobotOutlined, SaveOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, SettingOutlined } from '@ant-design/icons'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { 
  getAIConfig, 
  saveAIConfigWithNotification, 
  resetAIConfig, 
  isAIConfigValid,
  DEFAULT_AI_CONFIG,
  type AIConfig 
} from '../utils/aiConfig'
import './ConfigAI.css'

function ConfigAI() {
  const { message, modal } = App.useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [form] = Form.useForm()
  const [testing, setTesting] = useState(false)

  // 从配置管理器加载初始配置
  const [config, setConfig] = useState<AIConfig>(() => getAIConfig())

  // 跟踪当前选择的调用偏好，用于动态验证
  const [currentCallPreference, setCurrentCallPreference] = useState<'custom' | 'server'>(() => {
    const currentConfig = getAIConfig()
    return currentConfig.callPreference
  })

  // 动态验证规则：服务器调用点时，API相关字段非必填
  const getValidationRules = (fieldName: string) => {
    const isServerMode = currentCallPreference === 'server'
    
    switch (fieldName) {
      case 'url':
        return isServerMode ? [
          { type: 'url' as const, message: '请输入有效的 URL' },
        ] : [
          { required: true, message: '请输入 API URL' },
          { type: 'url' as const, message: '请输入有效的 URL' },
        ]
      case 'key':
        return isServerMode ? [] : [
          { required: true, message: '请输入 API Key' }
        ]
      case 'modelName':
        return isServerMode ? [] : [
          { required: true, message: '请输入模型名称' }
        ]
      default:
        return []
    }
  }

  // 处理调用偏好变化
  const handleCallPreferenceChange = (value: 'custom' | 'server') => {
    setCurrentCallPreference(value)
    // 当切换到服务器模式时，清除相关字段的验证错误
    if (value === 'server') {
      form.validateFields(['url', 'key', 'modelName']).catch(() => {})
    }
  }

  // 确保表单正确初始化
  useEffect(() => {
    const currentConfig = getAIConfig()
    form.setFieldsValue(currentConfig)
    setCurrentCallPreference(currentConfig.callPreference)
  }, [form])

  const handleSave = (values: AIConfig) => {
    try {
      // 确保保存时的 callPreference 是最新的表单状态
      values.callPreference = currentCallPreference;

      const success = saveAIConfigWithNotification(values)
      
      if (success) {
        setConfig(values)
        setCurrentCallPreference(values.callPreference)
        message.success('AI 配置已保存并生效')
        
        // 显示配置有效性状态
        if (isAIConfigValid(values)) {
          message.info('✅ AI 配置完整，可以正常使用 AI 功能')
        } else {
          message.warning('⚠️ 配置信息不完整，自定义服务可能无法使用')
        }
      } else {
        message.error('保存失败，请重试')
      }
    } catch (error) {
      message.error('保存失败，请重试')
      console.error('保存配置失败:', error)
    }
  }

  const handleReset = () => {
    try {
      // 重置为默认配置
      const success = resetAIConfig()
      if (success) {
        const defaultConfig = { ...DEFAULT_AI_CONFIG }
        form.setFieldsValue(defaultConfig)
        setConfig(defaultConfig)
        message.info('已重置为默认配置')
      } else {
        message.error('重置失败，请重试')
      }
    } catch (error) {
      message.error('重置失败，请重试')
      console.error('重置配置失败:', error)
    }
  }

  const handleTestConnection = async () => {
    console.log('🎯 用户点击了测试连接按钮')
    
    // 获取表单当前值
    const currentValues = form.getFieldsValue()
    console.log('📋 当前表单值:', currentValues)
    
    // 检查表单值是否完整（仅在自定义模式下检查）
    if (currentValues.callPreference === 'custom') {
      if (!currentValues.url || !currentValues.key || !currentValues.modelName) {
        message.error('请先填写完整的 URL、API Key 和模型名称')
        return
      }
    }
    
    // 立即显示测试开始消息
    message.info('开始测试连接...')
    
    setTesting(true)
    try {
      console.log('📞 通过后端测试连接...')
      
      // 构造测试请求
      const testRequest = {
        url: currentValues.url?.trim() || '',
        key: currentValues.key?.trim() || '',
        model: currentValues.modelName?.trim() || ''
      }
      
      console.log('🔧 测试配置:', {
        url: testRequest.url,
        model: testRequest.model,
        hasKey: !!testRequest.key,
        callPreference: currentValues.callPreference
      })
      
      // 调用后端测试连接 API
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002'
      const testUrl = `${backendUrl}/ai/test-connection`
      
      console.log('📤 发送测试请求到后端:', testUrl)
      console.log('请求体:', JSON.stringify(testRequest, null, 2))
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testRequest)
      })
      
      console.log('📥 后端响应:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        console.log('后端响应数据:', result)
        
        if (result.success) {
          // 显示成功弹窗
          modal.success({
            title: '🎉 连接测试成功',
            content: (
              <div style={{ padding: '16px 0' }}>
                <p style={{ marginBottom: '8px', fontSize: '16px' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  AI 服务连接正常！
                </p>
                <div style={{ 
                  background: '#f6ffed', 
                  border: '1px solid #b7eb8f', 
                  borderRadius: '6px', 
                  padding: '12px',
                  marginTop: '12px'
                }}>
                  <strong>AI 回复:</strong>
                  <p style={{ margin: '4px 0 0 0', fontStyle: 'italic' }}>
                    "{result.message.replace('AI 服务连接正常！回复: ', '').replace(/"/g, '')}"
                  </p>
                </div>
                <p style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                  现在您可以保存这个配置并开始使用 AI 功能了！
                </p>
              </div>
            ),
            width: 500,
            okText: '好的',
            onOk: () => {
              // 可以在这里添加自动保存配置的逻辑
              console.log('用户确认测试成功')
            }
          })
          
          message.success('连接测试成功！')
          console.log('✅ 测试成功:', result.message)
        } else {
          // 显示失败弹窗
          modal.error({
            title: '❌ 连接测试失败',
            content: (
              <div style={{ padding: '16px 0' }}>
                <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                  <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
                  无法连接到 AI 服务
                </p>
                <div style={{ 
                  background: '#fff2f0', 
                  border: '1px solid #ffccc7', 
                  borderRadius: '6px', 
                  padding: '12px',
                  marginTop: '12px'
                }}>
                  <strong>错误信息:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#ff4d4f' }}>
                    {result.message}
                  </p>
                </div>
                <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                  <p><strong>可能的解决方案:</strong></p>
                  <ul style={{ margin: '4px 0 0 16px' }}>
                    <li>检查 API Key 是否正确</li>
                    <li>验证 URL 地址是否有效</li>
                    <li>确认模型名称是否支持</li>
                    <li>检查网络连接状态</li>
                  </ul>
                </div>
              </div>
            ),
            width: 500,
            okText: '我知道了'
          })
          
          message.error(result.message)
          console.log('❌ 测试失败:', result.message)
        }
      } else {
        const errorText = await response.text().catch(() => '无法读取错误信息')
        console.error('后端 API 错误响应:', errorText)
        
        // 显示后端错误弹窗
        modal.error({
          title: '🔌 后端服务错误',
          content: (
            <div style={{ padding: '16px 0' }}>
              <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                后端 API 调用失败
              </p>
              <div style={{ 
                background: '#fff2f0', 
                border: '1px solid #ffccc7', 
                borderRadius: '6px', 
                padding: '12px'
              }}>
                <strong>错误详情:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#ff4d4f' }}>
                  {response.status} {response.statusText}
                </p>
              </div>
              <p style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                请检查后端服务是否正常运行
              </p>
            </div>
          ),
          width: 450,
          okText: '我知道了'
        })
        
        message.error(`后端 API 调用失败: ${response.status} ${response.statusText}`)
      }
      
    } catch (error) {
      let errorMsg = '测试连接时发生错误: '
      let isBackendError = false
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMsg += '无法连接到后端服务，请确保后端服务已启动'
          isBackendError = true
        } else {
          errorMsg += error.message
        }
      } else {
          errorMsg += '未知错误'
      }
      
      // 显示网络错误弹窗
      modal.error({
        title: isBackendError ? '🔌 后端连接失败' : '⚠️ 连接异常',
        content: (
          <div style={{ padding: '16px 0' }}>
            <p style={{ marginBottom: '12px', fontSize: '16px' }}>
              {isBackendError ? '无法连接到后端服务' : '测试连接时发生异常'}
            </p>
            <div style={{ 
              background: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '6px', 
              padding: '12px'
            }}>
              <strong>错误信息:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#ff4d4f' }}>
                {errorMsg}
              </p>
            </div>
            {isBackendError && (
              <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                <p><strong>解决方案:</strong></p>
                <ul style={{ margin: '4px 0 0 16px' }}>
                  <li>确保后端服务正在运行 (python run.py)</li>
                  <li>检查后端端口是否为 8002</li>
                  <li>确认防火墙没有阻止连接</li>
                </ul>
              </div>
            )}
          </div>
        ),
        width: 500,
        okText: '我知道了'
      })
      
      message.error(errorMsg)
      console.error('💥 测试连接异常:', error)
    } finally {
      console.log('🏁 测试连接完成，重置 loading 状态')
      setTesting(false)
    }
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      
      <div className="config-ai-container">
        <div className="config-ai-content">
          <div className="config-ai-header">
            <h1 className="config-ai-title">AI 配置</h1>
            <p className="config-ai-subtitle">配置 AI 服务的连接参数</p>
          </div>

          <Card className="config-ai-card" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              initialValues={config}
              onFinish={handleSave}
              autoComplete="off"
              className="config-ai-form"
            >
              <Form.Item
                label="API URL"
                name="url"
                rules={getValidationRules('url')}
              >
                <Input
                  prefix={<ApiOutlined />}
                  placeholder="https://aistudio.baidu.com/llm/lmapi/v3"
                  size="large"
                  className="config-input"
                />
              </Form.Item>

              <Form.Item
                label="API Key"
                name="key"
                rules={getValidationRules('key')}
                extra={
                  <a 
                    href="https://aistudio.baidu.com/account/accessToken" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#1890ff', fontSize: '14px' }}
                  >
                    🔗 获取百度 AI Studio Access Token
                  </a>
                }
              >
                <Input.Password
                  prefix={<KeyOutlined />}
                  placeholder="请输入百度 AI Studio 的 Access Token"
                  size="large"
                  className="config-input"
                />
              </Form.Item>

              <Form.Item
                label="Model Name"
                name="modelName"
                rules={getValidationRules('modelName')}
              >
                <Input
                  prefix={<RobotOutlined />}
                  placeholder="ernie-4.5-vl-28b-a3b"
                  size="large"
                  className="config-input"
                />
              </Form.Item>

              <Form.Item
                label="调用偏好"
                name="callPreference"
                rules={[{ required: true, message: '请选择调用偏好' }]}
              >
                <Radio.Group 
                  size="large" 
                  className="config-radio-group"
                  value={currentCallPreference}
                  onChange={(e) => handleCallPreferenceChange(e.target.value)}
                >
                  <Radio.Button value="custom" className="config-radio-button">
                    <SettingOutlined style={{ marginRight: '8px' }} />
                    自定义服务
                  </Radio.Button>
                  <Radio.Button value="server" className="config-radio-button">
                    <ApiOutlined style={{ marginRight: '8px' }} />
                    服务器调用点
                  </Radio.Button>
                </Radio.Group>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  💡 服务器调用点需要登录后使用，优先使用平台服务，点数不足时自动切换到自定义服务
                </div>
              </Form.Item>

              <Form.Item className="config-ai-actions">
                <div className="config-ai-buttons">
                  <Button
                    type="default"
                    size="large"
                    icon={<SyncOutlined spin={testing} />}
                    onClick={() => {
                      console.log('🔥 按钮被点击了！')
                      handleTestConnection()
                    }}
                    loading={testing}
                    className="config-test-button"
                  >
                    测试连接
                  </Button>
                  <Button
                    type="default"
                    size="large"
                    onClick={handleReset}
                    className="config-reset-button"
                  >
                    重置
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={<SaveOutlined />}
                    className="config-save-button"
                  >
                    保存配置
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Card>

          <div className="config-ai-footer">
            <p className="config-ai-note">
              💡 提示：配置信息将保存在浏览器本地存储中，获取 API Key：访问{' '}
              <a
                href="https://aistudio.baidu.com/account/accessToken"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1890ff' }}
              >
                🔗 百度 AI Studio Access Token
              </a>
            </p>
            <p className="config-ai-note config-ai-help">
              💡 选择服务器调用点时优先使用平台服务，点数不足时自动回退到自定义服务。请配置自定义服务参数作为备用方案。
            </p>
          </div>
        </div>
        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default ConfigAI
