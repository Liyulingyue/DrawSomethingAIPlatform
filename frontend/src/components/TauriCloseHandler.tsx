import { useEffect } from 'react'
import { Modal } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

/**
 * Tauri 窗口关闭处理组件
 * 在窗口关闭时显示loading提示
 */
export function TauriCloseHandler() {
  const { t } = useTranslation('tauriCloseHandler')

  useEffect(() => {
    // 只在 Tauri 环境中执行
    if (typeof window === 'undefined' || !('__TAURI__' in window)) {
      return
    }

    let modalInstance: any = null

    // 使用Tauri的事件监听API
    import('@tauri-apps/api/event').then(({ listen }) => {
      // 监听窗口关闭请求事件
      const unlisten = listen('tauri://close-requested', () => {
        console.log('🔴 检测到窗口关闭请求')
        
        // 如果已经显示过modal，不重复显示
        if (modalInstance) return
        
        // 显示关闭中的Modal
        modalInstance = Modal.info({
          title: t('closingTitle'),
          content: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <LoadingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <span>{t('cleaningMessage')}</span>
            </div>
          ),
          icon: null,
          closable: false,
          maskClosable: false,
          keyboard: false,
          okButtonProps: { style: { display: 'none' } },
          zIndex: 99999,
          centered: true,
          maskStyle: { backgroundColor: 'rgba(0, 0, 0, 0.85)' },
        })
      })

      return () => {
        unlisten.then(fn => fn())
      }
    }).catch(err => {
      console.error('Failed to setup Tauri event listener:', err)
    })
  }, [])

  return null
}
