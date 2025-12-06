import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { ensureApiInitialized } from './utils/api'

// 在 Tauri 环境中，拦截外部链接在默认浏览器中打开
if (typeof window !== 'undefined' && '__TAURI__' in window) {
  import('@tauri-apps/api/shell').then(({ open }) => {
    // 监听所有链接点击事件
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a')
      
      if (link) {
        const href = link.getAttribute('href')
        
        // 检查是否是外部链接（http:// 或 https://）
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          event.preventDefault()
          event.stopPropagation()
          
          // 在默认浏览器中打开链接
          open(href).catch((err: any) => {
            console.error('打开链接失败:', err)
          })
        }
      }
    }, true)
  }).catch((err) => {
    console.error('加载 Tauri shell 模块失败:', err)
  })
}

// 初始化 API 配置（支持 Tauri 动态端口）
ensureApiInitialized().then(() => {
  console.log('✅ API 配置已初始化')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
