import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import { TrophyOutlined, EditOutlined, SettingOutlined, InfoCircleOutlined, GithubOutlined, PictureOutlined, UserOutlined, HeartOutlined } from '@ant-design/icons'
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
  
  // 在页面加载时检查 AI 配置
  useEffect(() => {
    const checkAIConfig = () => {
      const config = getAIConfig()
      
      console.log('🔍 检查 AI 配置:', config)
      
      // 检查是否配置了任何 AI 服务
      const hasVisionConfig = config.visionUrl && config.visionKey && config.visionModelName
      const hasImageConfig = config.imageUrl && config.imageKey && config.imageModelName
      
      console.log('📊 配置状态:', {
        hasVisionConfig,
        hasImageConfig,
        visionUrl: config.visionUrl,
        visionKey: config.visionKey ? '已配置' : '未配置',
        visionModelName: config.visionModelName,
        imageUrl: config.imageUrl,
        imageKey: config.imageKey ? '已配置' : '未配置',
        imageModelName: config.imageModelName,
      })
      
      // 如果都没有配置，显示警告弹窗
      if (!hasVisionConfig && !hasImageConfig) {
        console.log('⚠️ 未配置 AI 服务，显示提示弹窗')
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
      <a 
        href="https://github.com/Liyulingyue/DrawSomethingAIPlatform" 
        target="_blank" 
        rel="noopener noreferrer"
        className="github-link"
        title="查看项目源码"
      >
        <GithubOutlined />
      </a>
      <div className="app-home-container">
        <div className="app-home-content">
          <div className="app-home-header">
            <h1 className="app-home-title">🎨 你画AI猜</h1>
            <p className="app-home-subtitle">DrawSomething AI Platform</p>
            <p className="app-home-hint">💡 第一次使用建议阅读使用说明</p>
          </div>
          <div className="app-home-buttons">
        <Button
          type="primary"
          size="large"
          icon={<TrophyOutlined />}
          onClick={handleLevelSelect}
          className="app-home-button app-home-button-primary"
        >
          绘画闯关
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<TrophyOutlined />}
          onClick={handleLevelSetGuess}
          className="app-home-button app-home-button-secondary"
        >
          猜词闯关
        </Button>
        {/* Tauri 模式下不显示登录按钮（自动登录管理员） */}
        {!isInTauriMode && (
          <Button
            type="primary"
            size="large"
            icon={<UserOutlined />}
            onClick={handleLogin}
            className="app-home-button app-home-button-login"
          >
            用户登录
          </Button>
        )}
        <Button
          type="default"
          size="large"
          icon={<EditOutlined />}
          onClick={handleFreeDraw}
          className="app-home-button"
        >
          自由绘画
        </Button>
        <Button
          type="default"
          size="large"
          icon={<PictureOutlined />}
          onClick={handleGallery}
          className="app-home-button app-home-button-gallery"
        >
          画廊
        </Button>
        <Button
          type="default"
          size="large"
          icon={<SettingOutlined />}
          onClick={handleConfigAI}
          className="app-home-button app-home-button-config"
        >
          AI 配置
        </Button>
        <Button
          type="default"
          size="large"
          icon={<InfoCircleOutlined />}
          onClick={handleIntroduction}
          className="app-home-button app-home-button-info"
        >
          使用说明
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
            支持我们
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
