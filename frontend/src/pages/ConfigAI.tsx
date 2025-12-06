import { useState, useEffect } from 'react'
import { Input, Button, Form, Card, App, Radio, Tabs } from 'antd'
import { ApiOutlined, KeyOutlined, RobotOutlined, SaveOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { getApiBaseUrlSync } from '../config/api'
import { isTauri } from '../utils/api'
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
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isInTauriMode = isTauri()
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
  const getValidationRules = (fieldName: string, modelType: 'vision' | 'image' = 'vision') => {
    const isServerMode = currentCallPreference === 'server'
    
    switch (fieldName) {
      case 'url':
        return isServerMode ? [
          { type: 'url' as const, message: t('configAI.validation.enterValidUrl') },
        ] : [
          { required: true, message: t(modelType === 'vision' ? 'configAI.validation.enterVisionUrl' : 'configAI.validation.enterImageUrl') },
          { type: 'url' as const, message: t('configAI.validation.enterValidUrl') },
        ]
      case 'key':
        return isServerMode ? [] : [
          { required: true, message: t(modelType === 'vision' ? 'configAI.validation.enterVisionKey' : 'configAI.validation.enterImageKey') }
        ]
      case 'modelName':
        return isServerMode ? [] : [
          { required: true, message: t(modelType === 'vision' ? 'configAI.validation.enterVisionModelName' : 'configAI.validation.enterImageModelName') }
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
      // 显示登录提示
      message.info({
        content: t('configAI.messages.serverLoginRequired'),
        duration: 5,
        style: {
          marginTop: '20px',
        },
      })
    }
  }

  // 确保表单正确初始化
  useEffect(() => {
    const currentConfig = getAIConfig()
    // 在Tauri模式下强制使用自定义服务
    if (isInTauriMode && currentConfig.callPreference === 'server') {
      currentConfig.callPreference = 'custom'
    }
    form.setFieldsValue(currentConfig)
    setCurrentCallPreference(currentConfig.callPreference)
  }, [form, isInTauriMode])

  const handleSave = (values: AIConfig) => {
    try {
      // 确保保存时的 callPreference 是最新的表单状态
      values.callPreference = currentCallPreference;

      const success = saveAIConfigWithNotification(values)
      
      if (success) {
        setConfig(values)
        setCurrentCallPreference(values.callPreference)
        message.success(t('configAI.messages.configSaved'))
        
        // 显示配置有效性状态
        if (isAIConfigValid(values)) {
          message.info(t('configAI.messages.configComplete'))
        } else {
          message.warning(t('configAI.messages.configIncomplete'))
        }
      } else {
        message.error(t('configAI.messages.saveFailed'))
      }
    } catch (error) {
      message.error(t('configAI.messages.saveFailed'))
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
        message.info(t('configAI.messages.resetSuccess'))
      } else {
        message.error(t('configAI.messages.resetFailed'))
      }
    } catch (error) {
      message.error(t('configAI.messages.resetFailed'))
      console.error('重置配置失败:', error)
    }
  }

  const handleTestConnection = async (modelType: 'vision' | 'image' = 'vision') => {
    console.log(`🎯 用户点击了测试连接按钮 (${modelType === 'vision' ? '视觉模型' : '文生图模型'})`)
    
    // 获取表单当前值
    const currentValues = form.getFieldsValue()
    console.log('📋 当前表单值:', currentValues)
    
    // 检查表单值是否完整（仅在自定义模式下检查）
    if (currentValues.callPreference === 'custom') {
      const url = modelType === 'vision' ? currentValues.visionUrl : currentValues.imageUrl
      const key = modelType === 'vision' ? currentValues.visionKey : currentValues.imageKey
      const modelName = modelType === 'vision' ? currentValues.visionModelName : currentValues.imageModelName
      
      if (!url || !key || !modelName) {
        message.error(t('configAI.messages.fillComplete', { modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', '') }))
        return
      }
    }
    
    // 立即显示测试开始消息
    message.info(t('configAI.messages.testingConnection', { modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', '') }))
    
    setTesting(true)
    try {
      console.log(`📞 通过后端测试 ${modelType === 'vision' ? '视觉模型' : '文生图模型'} 连接...`)
      
      // 构造测试请求
      const testRequest = {
        url: (modelType === 'vision' ? currentValues.visionUrl : currentValues.imageUrl)?.trim() || '',
        key: (modelType === 'vision' ? currentValues.visionKey : currentValues.imageKey)?.trim() || '',
        model: (modelType === 'vision' ? currentValues.visionModelName : currentValues.imageModelName)?.trim() || '',
        model_type: modelType
      }
      
      console.log('🔧 测试配置:', {
        url: testRequest.url,
        model: testRequest.model,
        hasKey: !!testRequest.key,
        callPreference: currentValues.callPreference,
        modelType
      })
      
      // 调用后端测试连接 API
      const backendUrl = getApiBaseUrlSync()
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
            title: t('configAI.messages.testSuccess', { modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', '') }),
            content: (
              <div style={{ padding: '16px 0' }}>
                <p style={{ marginBottom: '8px', fontSize: '16px' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  {t('configAI.messages.serviceConnected', { modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', '') })}
                </p>
                {modelType === 'image' && result.image_data ? (
                  <div style={{ 
                    background: '#f6ffed', 
                    border: '1px solid #b7eb8f', 
                    borderRadius: '6px', 
                    padding: '12px',
                    marginTop: '12px',
                    textAlign: 'center'
                  }}>
                    <strong>{t('configAI.messages.generatedImage')}</strong>
                    <div style={{ marginTop: '8px' }}>
                      <img 
                        src={`data:image/png;base64,${result.image_data}`} 
                        alt="测试图像" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px', 
                          border: '1px solid #d9d9d9', 
                          borderRadius: '4px' 
                        }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    background: '#f6ffed', 
                    border: '1px solid #b7eb8f', 
                    borderRadius: '6px', 
                    padding: '12px',
                    marginTop: '12px'
                  }}>
                    <strong>{t('configAI.messages.aiReply')}</strong>
                    <p style={{ margin: '4px 0 0 0', fontStyle: 'italic' }}>
                      "{result.message.replace('AI 服务连接正常！回复: ', '').replace(/"/g, '')}"
                    </p>
                  </div>
                )}
                <p style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                  {t('configAI.messages.readyToUse', { modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', '') })}
                </p>
              </div>
            ),
            width: 500,
            okText: '好的',
            onOk: () => {
              // 可以在这里添加自动保存配置的逻辑
              console.log(`用户确认 ${modelType === 'vision' ? '视觉模型' : '文生图模型'} 测试成功`)
            }
          })
          
          message.success(`${modelType === 'vision' ? '视觉模型' : '文生图模型'} 连接测试成功！`)
          console.log('✅ 测试成功:', result.message)
        } else {
          // 显示失败弹窗
          modal.error({
            title: t('configAI.messages.testFailed', { modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', '') }),
            content: (
              <div style={{ padding: '16px 0' }}>
                <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                  <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
                  {t('configAI.messages.cannotConnect', { modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', '') })}
                </p>
                <div style={{ 
                  background: '#fff2f0', 
                  border: '1px solid #ffccc7', 
                  borderRadius: '6px', 
                  padding: '12px',
                  marginTop: '12px'
                }}>
                  <strong>{t('configAI.messages.errorInfo')}</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#ff4d4f' }}>
                    {result.message}
                  </p>
                </div>
                <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                  <p><strong>{t('configAI.messages.possibleSolutions')}</strong></p>
                  <ul style={{ margin: '4px 0 0 16px' }}>
                    <li>{t('configAI.messages.checkApiKey')}</li>
                    <li>{t('configAI.messages.checkUrl')}</li>
                    <li>{t('configAI.messages.checkModelName')}</li>
                    <li>{t('configAI.messages.checkNetwork')}</li>
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
          title: t('configAI.messages.backendError'),
          content: (
            <div style={{ padding: '16px 0' }}>
              <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                {t('configAI.messages.backendApiFailed')}
              </p>
              <div style={{ 
                background: '#fff2f0', 
                border: '1px solid #ffccc7', 
                borderRadius: '6px', 
                padding: '12px'
              }}>
                <strong>{t('configAI.messages.errorDetails')}</strong>
                <p style={{ margin: '4px 0 0 0', color: '#ff4d4f' }}>
                  {response.status} {response.statusText}
                </p>
              </div>
              <p style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                {t('configAI.messages.checkBackendRunning')}
              </p>
            </div>
          ),
          width: 450,
          okText: '我知道了'
        })
        
        message.error(t('configAI.messages.backendApiCallFailed', { status: response.status, statusText: response.statusText }))
      }
      
    } catch (error) {
      let errorMsg = t('configAI.messages.testError', { 
        modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', ''),
        error: ''
      })
      let isBackendError = false
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMsg = t('configAI.messages.backendNotConnected')
          isBackendError = true
        } else {
          errorMsg = t('configAI.messages.testError', { 
            modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', ''),
            error: error.message
          })
        }
      } else {
        errorMsg = t('configAI.messages.testError', { 
          modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', ''),
          error: t('configAI.messages.unknownError')
        })
      }
      
      // 显示网络错误弹窗
      modal.error({
        title: isBackendError ? t('configAI.messages.backendConnectionFailed') : t('configAI.messages.connectionException'),
        content: (
          <div style={{ padding: '16px 0' }}>
            <p style={{ marginBottom: '12px', fontSize: '16px' }}>
              {isBackendError ? t('configAI.messages.cannotConnectBackend') : t('configAI.messages.testException', { modelType: modelType === 'vision' ? t('configAI.tabs.vision').replace('👁️ ', '') : t('configAI.tabs.image').replace('🎨 ', '') })}
            </p>
            <div style={{ 
              background: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '6px', 
              padding: '12px'
            }}>
              <strong>{t('configAI.messages.errorInfo')}</strong>
              <p style={{ margin: '4px 0 0 0', color: '#ff4d4f' }}>
                {errorMsg}
              </p>
            </div>
            {isBackendError && (
              <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                <p><strong>{t('configAI.messages.solutions')}</strong></p>
                <ul style={{ margin: '4px 0 0 16px' }}>
                  <li>{t('configAI.messages.ensureBackendRunning')}</li>
                  <li>{t('configAI.messages.checkBackendPort')}</li>
                  <li>{t('configAI.messages.checkFirewall')}</li>
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
              <h1 className="config-ai-title">{t('configAI.title')}</h1>
              <p className="config-ai-subtitle">{t('configAI.subtitle')}</p>
          </div>

          <Card className="config-ai-card" variant="borderless">
            <Form
              form={form}
              layout="vertical"
              initialValues={config}
              onFinish={handleSave}
              autoComplete="off"
              className="config-ai-form"
            >
              <Tabs defaultActiveKey="vision" className="config-ai-tabs">
                <Tabs.TabPane tab={t('configAI.tabs.vision')} key="vision">
                  <div className="config-tab-content">
                    <Form.Item
                      label={t('configAI.form.visionUrl')}
                      name="visionUrl"
                      rules={getValidationRules('url', 'vision')}
                    >
                      <Input
                        prefix={<ApiOutlined />}
                        placeholder={t('configAI.placeholders.visionUrl')}
                        size="large"
                        className="config-input"
                      />
                    </Form.Item>

                    <Form.Item
                      label={t('configAI.form.visionKey')}
                      name="visionKey"
                      rules={getValidationRules('key', 'vision')}
                      extra={
                        <a 
                          href="https://aistudio.baidu.com/account/accessToken" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#1890ff', fontSize: '14px' }}
                        >
                          {t('configAI.links.getToken')}
                        </a>
                      }
                    >
                      <Input.Password
                        prefix={<KeyOutlined />}
                        placeholder={t('configAI.placeholders.visionKey')}
                        size="large"
                        className="config-input"
                      />
                    </Form.Item>

                    <Form.Item
                      label={t('configAI.form.visionModelName')}
                      name="visionModelName"
                      rules={getValidationRules('modelName', 'vision')}
                    >
                      <Input
                        prefix={<RobotOutlined />}
                        placeholder={t('configAI.placeholders.visionModelName')}
                        size="large"
                        className="config-input"
                      />
                    </Form.Item>
                  </div>
                </Tabs.TabPane>

                <Tabs.TabPane tab={t('configAI.tabs.image')} key="image">
                  <div className="config-tab-content">
                    <Form.Item
                      label={t('configAI.form.imageUrl')}
                      name="imageUrl"
                      rules={getValidationRules('url', 'image')}
                    >
                      <Input
                        prefix={<ApiOutlined />}
                        placeholder={t('configAI.placeholders.imageUrl')}
                        size="large"
                        className="config-input"
                      />
                    </Form.Item>

                    <Form.Item
                      label={t('configAI.form.imageKey')}
                      name="imageKey"
                      rules={getValidationRules('key', 'image')}
                      extra={
                        <a 
                          href="https://aistudio.baidu.com/account/accessToken" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#1890ff', fontSize: '14px' }}
                        >
                          {t('configAI.links.getToken')}
                        </a>
                      }
                    >
                      <Input.Password
                        prefix={<KeyOutlined />}
                        placeholder={t('configAI.placeholders.imageKey')}
                        size="large"
                        className="config-input"
                      />
                    </Form.Item>

                    <Form.Item
                      label={t('configAI.form.imageModelName')}
                      name="imageModelName"
                      rules={getValidationRules('modelName', 'image')}
                    >
                      <Input
                        prefix={<RobotOutlined />}
                        placeholder={t('configAI.placeholders.imageModelName')}
                        size="large"
                        className="config-input"
                      />
                    </Form.Item>
                  </div>
                </Tabs.TabPane>
              </Tabs>

              <Form.Item
                label={t('configAI.form.callPreference')}
                name="callPreference"
                rules={[{ required: true, message: t('configAI.validation.selectCallPreference') }]}
              >
                <div>
                  <Radio.Group 
                    size="large" 
                    className="config-radio-group"
                    value={currentCallPreference}
                    onChange={(e) => handleCallPreferenceChange(e.target.value)}
                  >
                    <Radio.Button value="custom" className="config-radio-button">
                      <SettingOutlined style={{ marginRight: '8px' }} />
                      {t('configAI.preferences.custom')}
                    </Radio.Button>
                    {!isInTauriMode && (
                      <Radio.Button value="server" className="config-radio-button">
                        <ApiOutlined style={{ marginRight: '8px' }} />
                        {t('configAI.preferences.server')}
                      </Radio.Button>
                    )}
                  </Radio.Group>
                  {!isInTauriMode && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                      {t('configAI.preferences.serverTip')}
                    </div>
                  )}
                </div>
              </Form.Item>

              <Form.Item className="config-ai-actions">
                <div className="config-ai-buttons">
                  <Button
                    type="default"
                    size="large"
                    icon={<SyncOutlined spin={testing} />}
                    onClick={() => handleTestConnection('vision')}
                    loading={testing}
                    className="config-test-button"
                  >
                    {t('configAI.buttons.testVision')}
                  </Button>
                  <Button
                    type="default"
                    size="large"
                    icon={<SyncOutlined spin={testing} />}
                    onClick={() => handleTestConnection('image')}
                    loading={testing}
                    className="config-test-button"
                  >
                    {t('configAI.buttons.testImage')}
                  </Button>
                  <Button
                    type="default"
                    size="large"
                    onClick={handleReset}
                    className="config-reset-button"
                  >
                    {t('configAI.buttons.reset')}
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={<SaveOutlined />}
                    className="config-save-button"
                  >
                    {t('configAI.buttons.save')}
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Card>

          <div className="config-ai-footer">
            <p className="config-ai-note">
              {t('configAI.footer.hint')}{' '}
              <a
                href="https://aistudio.baidu.com/account/accessToken"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#fff', textDecoration: 'underline' }}
              >
                {t('configAI.footer.baiduLink')}
              </a>
            </p>
            {!isInTauriMode && (
              <p className="config-ai-note config-ai-help">
                {t('configAI.footer.help')}
              </p>
            )}
          </div>
        </div>
        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default ConfigAI
