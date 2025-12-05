import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { ensureApiInitialized } from './utils/api'

// 初始化 API 配置（支持 Tauri 动态端口）
ensureApiInitialized().then(() => {
  console.log('✅ API 配置已初始化')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
