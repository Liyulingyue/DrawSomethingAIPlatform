import React, { useEffect, useState } from 'react'
import { Spin, Progress } from 'antd'
import { useTranslation } from 'react-i18next'
import './SplashScreen.css'

interface SplashScreenProps {
  visible: boolean
  progress?: number
  message?: string
}

const SplashScreen: React.FC<SplashScreenProps> = ({ visible, progress = 0, message = '正在启动应用...' }) => {
  const [displayProgress, setDisplayProgress] = useState(0)
  const { t } = useTranslation('splashScreen')

  useEffect(() => {
    if (progress > displayProgress) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [progress, displayProgress])

  if (!visible) return null

  return (
    <div className="splash-screen-overlay">
      <div className="splash-screen-container">
        {/* Logo */}
        <div className="splash-logo">
          <div className="logo-circle">
            <img 
              src="/logo.png" 
              alt="DrawSomething AI Logo" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* 应用名称 */}
        <h1 className="splash-title">{t('title')}</h1>
        <p className="splash-subtitle">{t('subtitle')}</p>

        {/* 加载指示器 */}
        <div className="splash-loading">
          <Spin size="large" />
          <p className="splash-message">{message}</p>
        </div>

        {/* 进度条 */}
        <div className="splash-progress">
          <Progress
            percent={displayProgress}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            status={displayProgress === 100 ? 'success' : 'active'}
            showInfo={false}
          />
          <span className="splash-percent">{displayProgress}%</span>
        </div>

        {/* 提示信息 */}
        <div className="splash-tips">
          <p>{t('firstTimeTip')}</p>
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
