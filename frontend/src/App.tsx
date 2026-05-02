import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserProvider } from './context/UserContext'
import { isTauri, ensureApiInitialized } from './utils/api'
import { getApiBaseUrlSync } from './config/api'
import SplashScreen from './components/SplashScreen'
import { TauriCloseHandler } from './components/TauriCloseHandler'
import AppHome from './pages/AppHome'
import LevelSet from './pages/LevelSet'
import LevelSetGuess from './pages/LevelSetGuess'
import CustomLevelConfiguration from './pages/LevelConfig'
import MyCustomLevels from './pages/MyCustomLevels'
import AppDraw from './pages/AppDraw'
import ChallengeDraw from './pages/ChallengeDraw'
import ChallengeGuess from './pages/ChallengeGuess'
import ConfigAI from './pages/ConfigAI'
import Introduction from './pages/Introduction'
import AppLogin from './pages/AppLogin'
import AppDonate from './pages/AppDonate'
import Gallery from './pages/Gallery'
import './App.css'

function AppContent() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/app/home" element={<AppHome />} />
        <Route path="/app/level-set" element={<LevelSet />} />
        <Route path="/app/level-set-guess" element={<LevelSetGuess />} />
        <Route path="/app/level-config" element={<CustomLevelConfiguration />} />
        <Route path="/app/my-custom-levels" element={<MyCustomLevels />} />
        <Route path="/app/draw" element={<AppDraw />} />
        <Route path="/app/challenge-draw" element={<ChallengeDraw />} />
        <Route path="/app/challenge-guess" element={<ChallengeGuess />} />
        <Route path="/app/introduction" element={<Introduction />} />
        <Route path="/app/configAI" element={<ConfigAI />} />
        <Route path="/app/gallery" element={<Gallery />} />
        <Route path="/app/donate" element={<AppDonate />} />
        <Route path="/app/login" element={<AppLogin />} />
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
    </div>
  )
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const { t } = useTranslation('splashScreen')

  // 检测是否在 Tauri 环境中（打包 EXE）
  const isTauriMode = isTauri()
  // 只在 Tauri 环境中显示启动屏幕
  const shouldShowSplash = isTauriMode

  useEffect(() => {
    const initApp = async () => {
      try {
        if (shouldShowSplash) {
          // 步骤 1: 检查 Tauri 环境
          setMessage(t('steps.detectingEnv', { ns: 'splashScreen' }))
          setProgress(10)
          await new Promise(resolve => setTimeout(resolve, 800))

          // 步骤 2: 初始化 API 配置
          setMessage(t('steps.initApi', { ns: 'splashScreen' }))
          setProgress(30)
          await ensureApiInitialized()
          await new Promise(resolve => setTimeout(resolve, 600))

          // 步骤 3: 连接后端
          setMessage(t('steps.connectingBackend', { ns: 'splashScreen' }))
          setProgress(60)
          const baseUrl = getApiBaseUrlSync()
          
          // 验证后端连接（带超时）
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 5000)
          const response = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
          }).catch(() => ({ ok: false })).finally(() => clearTimeout(timeout))
          
          if (!response.ok) {
            setMessage(t('steps.waitingBackend', { ns: 'splashScreen' }))
            setProgress(70)
            // 后端可能还在启动，等待一下
            await new Promise(resolve => setTimeout(resolve, 2000))
          }

          // 步骤 4: 加载主应用
          setMessage(t('steps.loadingUI', { ns: 'splashScreen' }))
          setProgress(90)
          await new Promise(resolve => setTimeout(resolve, 500))

          // 步骤 5: 完成
          setProgress(100)
          setMessage(t('steps.done', { ns: 'splashScreen' }))
          await new Promise(resolve => setTimeout(resolve, 800))
        } else {
          // 开发环境：直接初始化，不显示启动屏幕
          await ensureApiInitialized()
        }

        setIsInitialized(true)
        
        // 隐藏 HTML 初始加载动画，显示 React 的 SplashScreen
        if (shouldShowSplash && typeof window !== 'undefined' && (window as any).hideAppLoader) {
          (window as any).hideAppLoader()
        }
      } catch (error) {
        console.error('应用初始化失败:', error)
        if (shouldShowSplash) {
          setMessage(t('steps.initFailed', { ns: 'splashScreen' }))
          setProgress(0)
          // 即使出错也继续加载
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        setIsInitialized(true)
        
        // 隐藏 HTML 初始加载动画
        if (typeof window !== 'undefined' && (window as any).hideAppLoader) {
          (window as any).hideAppLoader()
        }
      }
    }

    initApp()
  }, [shouldShowSplash])

  return (
    <AntApp>
      <TauriCloseHandler />
      {shouldShowSplash && <SplashScreen visible={!isInitialized} progress={progress} message={message} />}
      {isInitialized && (
        <UserProvider>
          {isTauri() ? (
            <HashRouter>
              <AppContent />
            </HashRouter>
          ) : (
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          )}
        </UserProvider>
      )}
    </AntApp>
  )
}

export default App

