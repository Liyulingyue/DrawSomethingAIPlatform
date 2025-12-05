import React, { useEffect, useState } from 'react'
import { Spin, Progress } from 'antd'
import './SplashScreen.css'

interface SplashScreenProps {
  visible: boolean
  progress?: number
  message?: string
}

const SplashScreen: React.FC<SplashScreenProps> = ({ visible, progress = 0, message = '正在启动应用...' }) => {
  const [displayProgress, setDisplayProgress] = useState(0)

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
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              {/* 绘图画板 */}
              <rect x="30" y="40" width="140" height="120" fill="none" stroke="#1890ff" strokeWidth="3" />
              
              {/* 笔刷 */}
              <path d="M 60 80 Q 80 70 90 90 Q 85 110 70 105" fill="none" stroke="#1890ff" strokeWidth="2.5" />
              <path d="M 110 75 Q 130 65 145 85 Q 140 105 125 100" fill="none" stroke="#52c41a" strokeWidth="2.5" />
              <path d="M 80 110 Q 100 105 110 120 Q 105 130 90 128" fill="none" stroke="#faad14" strokeWidth="2.5" />
              
              {/* AI 圆形标记 */}
              <circle cx="160" cy="55" r="15" fill="#ff4d4f" opacity="0.8" />
              <text x="160" y="62" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                AI
              </text>
            </svg>
          </div>
        </div>

        {/* 应用名称 */}
        <h1 className="splash-title">DrawSomething AI</h1>
        <p className="splash-subtitle">智能绘图识别平台</p>

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
          <p>💡 首次启动可能需要较长时间，请耐心等待</p>
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
