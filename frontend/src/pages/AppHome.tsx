import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import { TrophyOutlined, EditOutlined, SettingOutlined, InfoCircleOutlined, PictureOutlined, UserOutlined, HeartOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import AIConfigPromptModal from '../components/AIConfigPromptModal'
import { isTauri } from '../utils/api'
import { getAIConfig } from '../utils/aiConfig'
import './AppHome.css'

function AppHome() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  
  // 检测是否在 Tauri 环境中
  const isInTauriMode = isTauri()
  const { t } = useTranslation('common')
  
  // 在页面加载时检查 AI 配置
  useEffect(() => {
    const checkAIConfig = () => {
      const config = getAIConfig()
      
      console.log('🔍 检查 AI 配置:', config)
      
      // 检查调用偏好
      const callPreference = config.callPreference
      
      // 根据调用偏好判断配置是否完整
      let needsConfig = false
      
      if (callPreference === 'custom-local') {
        // 本地模型只需要 visionUrl
        needsConfig = !config.visionUrl
        console.log('📊 本地模型模式:', { needsConfig, visionUrl: config.visionUrl })
      } else if (callPreference === 'server') {
        // 服务器模式不需要前端配置
        needsConfig = false
        console.log('📊 服务器模式: 无需前端配置')
      } else {
        // 自定义服务需要完整的 API 配置
        const hasVisionConfig = config.visionUrl && config.visionKey && config.visionModelName
        // Tauri 打包模式不需要文生图配置
        const hasImageConfig = isInTauriMode || (config.imageUrl && config.imageKey && config.imageModelName)
        needsConfig = !hasVisionConfig && !hasImageConfig
        
        console.log('📊 自定义服务模式:', {
          hasVisionConfig,
          hasImageConfig,
          visionUrl: config.visionUrl,
          visionKey: config.visionKey ? '已配置' : '未配置',
          visionModelName: config.visionModelName,
        })
      }
      
      // 如果配置不完整，显示警告弹窗
      if (needsConfig) {
        console.log('⚠️ AI 服务配置不完整，显示提示弹窗')
        setShowConfigModal(true)
      } else {
        console.log('✅ AI 服务已配置，不显示弹窗')
      }
    }
    
    // 延迟检查，确保页面已挂载
    const timer = setTimeout(checkAIConfig, 300)
    return () => clearTimeout(timer)
  }, [])
  
  const handleConfigModalOk = () => {
    setShowConfigModal(false)
    navigate('/app/configAI')
  }
  
  const handleConfigModalCancel = () => {
    setShowConfigModal(false)
  }

  const handleLevelSelect = () => {
    navigate('/app/level-set')
  }

  const handleLevelSetGuess = () => {
    navigate('/app/level-set-guess')
  }

  const handleFreeDraw = () => {
    navigate('/app/draw')
  }

  const handleConfigAI = () => {
    navigate('/app/configAI')
  }

  const handleIntroduction = () => {
    navigate('/app/introduction')
  }

  const handleGallery = () => {
    navigate('/app/gallery')
  }

  const handleLogin = () => {
    navigate('/app/login')
  }

  const handleDonate = () => {
    navigate('/app/donate')
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} isDark />
      <AIConfigPromptModal 
        open={showConfigModal}
        onConfig={handleConfigModalOk}
        onCancel={handleConfigModalCancel}
      />
      <div className="top-right-actions">
        <LanguageSwitcher />
      </div>
      <div className="app-home-container">
        <div className="app-home-content">
              <div className="app-home-header">
                    <h1 className="app-home-title">{t('title')}</h1>
                    <p className="app-home-subtitle">{t('subtitle')}</p>
                    <p className="app-home-hint">{t('hint')}</p>
                  </div>
          <div className="app-home-buttons">
        <Button
          type="primary"
          size="large"
          icon={<TrophyOutlined />}
          onClick={handleLevelSelect}
          className="app-home-button app-home-button-primary"
          >
          {t('buttons.level_draw')}
        </Button>
        {!isInTauriMode && (
          <Button
            type="primary"
            size="large"
            icon={<TrophyOutlined />}
            onClick={handleLevelSetGuess}
            className="app-home-button app-home-button-secondary"
            >
            {t('buttons.level_guess')}
          </Button>
        )}
        {/* Tauri 模式下不显示登录按钮（自动登录管理员） */}
        {!isInTauriMode && (
          <Button
            type="primary"
            size="large"
            icon={<UserOutlined />}
            onClick={handleLogin}
            className="app-home-button app-home-button-login"
            >
            {t('buttons.login')}
          </Button>
        )}
        <Button
          type="default"
          size="large"
          icon={<EditOutlined />}
          onClick={handleFreeDraw}
          className="app-home-button"
          >
          {t('buttons.free_draw')}
        </Button>
        <Button
          type="default"
          size="large"
          icon={<PictureOutlined />}
          onClick={handleGallery}
          className="app-home-button app-home-button-gallery"
          >
          {t('buttons.gallery')}
        </Button>
        <Button
          type="default"
          size="large"
          icon={<SettingOutlined />}
          onClick={handleConfigAI}
          className="app-home-button app-home-button-config"
          >
          {t('buttons.config_ai')}
        </Button>
        <Button
          type="default"
          size="large"
          icon={<InfoCircleOutlined />}
          onClick={handleIntroduction}
          className="app-home-button app-home-button-info"
          >
          {t('buttons.introduction')}
        </Button>
        {/* Tauri 模式下不显示支持我们按钮（桌面应用） */}
        {!isInTauriMode && (
          <Button
            type="default"
            size="large"
            icon={<HeartOutlined />}
            onClick={handleDonate}
            className="app-home-button app-home-button-donate"
            >
            {t('buttons.donate')}
          </Button>
        )}
      </div>
        </div>
        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default AppHome
