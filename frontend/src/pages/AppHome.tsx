import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import { TrophyOutlined, EditOutlined, SettingOutlined, InfoCircleOutlined, GithubOutlined, PictureOutlined, UserOutlined, HeartOutlined } from '@ant-design/icons'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import './AppHome.css'

function AppHome() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLevelSelect = () => {
    navigate('/app/level-set')
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
          闯关模式
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<UserOutlined />}
          onClick={handleLogin}
          className="app-home-button app-home-button-login"
        >
          用户登录
        </Button>
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
        <Button
          type="default"
          size="large"
          icon={<HeartOutlined />}
          onClick={handleDonate}
          className="app-home-button app-home-button-donate"
        >
          支持我们
        </Button>
      </div>
        </div>
        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default AppHome
