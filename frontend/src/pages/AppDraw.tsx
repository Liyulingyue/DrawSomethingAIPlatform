import { useRef, useEffect, useState } from 'react'
import { Input, Button, App, Modal, Form } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, PictureOutlined } from '@ant-design/icons'
import MobileDrawBoard, { type MobileDrawBoardRef } from '../components/MobileDrawBoard'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { api } from '../utils/api'
import { getAIConfig } from '../utils/aiConfig'
import { useUser } from '../context/UserContext'
import './AppDraw.css'

function AppDraw() {
  const { message, modal } = App.useApp()
  const drawBoardRef = useRef<MobileDrawBoardRef>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [targetWord, setTargetWord] = useState('')
  const [clue, setClue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024)
  const { sessionId, refreshUserInfo, username } = useUser()
  const [galleryName, setGalleryName] = useState(username || '佚名')
  const [showSuccessGalleryModal, setShowSuccessGalleryModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successModalData, setSuccessModalData] = useState<any>(null)

  // 防止移动设备页面滚动
  useEffect(() => {
    // 禁用页面滚动
    document.body.classList.add('drawing-active')
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'

    // 阻止touchmove事件的默认行为
    const preventScroll = (e: TouchEvent) => {
      // 只在非输入元素上阻止默认行为
      const target = e.target as HTMLElement
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault()
      }
    }

    // 监听窗口大小变化
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 1024)
    }

    document.addEventListener('touchmove', preventScroll, { passive: false })
    window.addEventListener('resize', handleResize)

    return () => {
      // 清理：恢复页面滚动
      document.body.classList.remove('drawing-active')
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.removeEventListener('touchmove', preventScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 当用户名改变时，更新默认的画廊名称
  useEffect(() => {
    if (username && galleryName === '佚名') {
      setGalleryName(username)
    }
  }, [username, galleryName])

  const handleDraw = (image: string) => {
    // 绘画时的回调，可以用于实时保存等
    console.log('绘画中...', image.substring(0, 50))
  }

  const handleSubmitGuess = async () => {
    const image = drawBoardRef.current?.getImage()
    if (!image) {
      message.warning('请先完成绘画')
      return
    }

    if (!targetWord.trim()) {
      message.warning('请先输入目标词')
      return
    }

    setSubmitting(true)
    try {
      console.log('🎨 提交绘画猜词')
      console.log('目标词:', targetWord)
      
      // 获取 AI 配置
      const aiConfig = getAIConfig()
      
      // 构造请求体
      const requestBody: {
        image: string
        target: string
        clue?: string
        config?: {
          url?: string
          key?: string
          model?: string
          prompt?: string
        }
        call_preference?: 'custom' | 'server'
        session_id?: string
      } = {
        image,
        target: targetWord.trim(),
      }

      // 如果用户输入了线索，则传递给后端
      if (clue.trim()) {
        requestBody.clue = clue.trim()
        console.log('📝 使用用户提供的线索:', clue.trim())
      }

      // 如果有自定义视觉模型配置，则使用
      if (aiConfig.visionUrl && aiConfig.visionKey && aiConfig.visionModelName) {
        requestBody.config = {
          url: aiConfig.visionUrl,
          key: aiConfig.visionKey,
          model: aiConfig.visionModelName,
        }
        console.log('✅ 使用自定义视觉模型配置')
      } else {
        console.log('ℹ️ 使用默认视觉模型配置')
      }

      // 添加调用偏好参数
      requestBody.call_preference = aiConfig.callPreference || 'server'
      console.log('📞 使用调用偏好:', requestBody.call_preference)

      // 添加用户会话ID
      if (sessionId) {
        requestBody.session_id = sessionId
        console.log('🔑 使用会话ID:', sessionId)
      }

      // 调用后端 API
      const response = await api.post('/ai/guess', requestBody)
      const result = response.data

      console.log('📥 AI 猜词结果:', result)

      // 刷新用户信息（更新剩余调用次数）
      await refreshUserInfo()

      // 判断是否猜中 - 使用宽松的判断标准
      const targetNormalized = targetWord.trim().toLowerCase()
      const bestGuess = result.best_guess || ''
      const alternatives = result.alternatives || []
      
      // 检查目标词是否被猜中的词包含
      const isCorrect = 
        bestGuess.toLowerCase().includes(targetNormalized) ||
        alternatives.some((alt: string) => alt.toLowerCase().includes(targetNormalized))

      if (isCorrect) {
        // 显示成功弹窗
        setSuccessModalData({
          targetWord,
          bestGuess,
          alternatives,
          reason: result.reason
        })
        setShowSuccessModal(true)
        message.success('绘画识别成功！')
      } else {
        // 显示失败弹窗
        modal.error({
          title: '😅 再试一次！',
          content: (
            <div style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto', 
              overflowX: 'hidden',
              padding: '16px 0' 
            }}>
              <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
                AI 没能准确识别出你的绘画
              </p>
              <div style={{ 
                background: '#fff2f0', 
                border: '1px solid #ffccc7', 
                borderRadius: '6px', 
                padding: '12px',
                marginTop: '12px'
              }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>目标词:</strong> {targetWord}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>AI 识别:</strong> {bestGuess || '无法识别'}</p>
                {alternatives.length > 0 && (
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>备选答案:</strong> {alternatives.join(', ')}
                  </p>
                )}
                <div style={{ 
                  margin: '0', 
                  paddingTop: '8px', 
                  borderTop: '1px dashed #ffccc7',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  wordBreak: 'break-word'
                }}>
                  <strong>AI 分析:</strong>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                    {result.reason || '无额外分析'}
                  </p>
                </div>
              </div>
              <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>💡 改进建议:</p>
                <ul style={{ margin: '0 0 0 16px', paddingLeft: '8px' }}>
                  <li>尝试画得更清晰一些</li>
                  <li>添加更多细节特征</li>
                  <li>使用更明显的形状</li>
                </ul>
                <p style={{ margin: '8px 0 0 0', color: '#1890ff', fontWeight: 500 }}>
                  🎨 继续在画板上修改或重新绘制！
                </p>
              </div>
            </div>
          ),
          width: 520,
          okText: '继续创作'
        })
        message.warning('识别结果与目标词不匹配，再试一次吧！')
      }
      
    } catch (error) {
      console.error('💥 提交猜词失败:', error)
      
      let errorMessage = '提交失败，请稍后重试'
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = '无法连接到服务器，请检查网络连接'
        } else {
          errorMessage = error.message
        }
      }

      modal.error({
        title: '⚠️ 提交失败',
        content: (
          <div style={{ 
            maxHeight: '60vh', 
            overflowY: 'auto', 
            overflowX: 'hidden',
            padding: '16px 0' 
          }}>
            <p style={{ marginBottom: '12px', fontSize: '16px' }}>
              提交猜词时发生错误
            </p>
            <div style={{ 
              background: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '6px', 
              padding: '12px',
              wordBreak: 'break-word'
            }}>
              <strong>错误信息:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#ff4d4f', whiteSpace: 'pre-wrap' }}>
                {errorMessage}
              </p>
            </div>
            <p style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
              请检查网络连接和 AI 配置是否正确
            </p>
          </div>
        ),
        width: 500,
        okText: '我知道了'
      })
      
      message.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublishToGallery = async () => {
    const image = drawBoardRef.current?.getImage()
    if (!image) {
      message.warning('请先完成绘画')
      return
    }

    try {
      await api.post('/gallery/save', {
        image,
        name: galleryName.trim() || '佚名'
      })

      message.success('成功发布到画廊！')
      setShowSuccessGalleryModal(false)
      setGalleryName('佚名')
    } catch (error) {
      console.error('发布到画廊失败:', error)
      message.error('发布失败，请稍后重试')
    }
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      
      {isDesktop ? (
        // 桌面布局：左侧面板 (25%) + 右侧画布 (75%)
        <div className="app-draw-container desktop-layout">
          <div className="app-draw-left-panel">
            {/* 标题区域 */}
            <div className="app-draw-title-section">
              <h1 className="app-draw-page-title">绘画</h1>
            </div>

            {/* 目标词区域 */}
            <div className="app-draw-header">
              <div className="app-draw-target-word">
                <label className="target-word-label">目标词：</label>
                <Input
                  placeholder="输入要绘画的词"
                  value={targetWord}
                  onChange={(e) => setTargetWord(e.target.value)}
                  className="target-word-input"
                  size="large"
                />
              </div>
              <div className="app-draw-clue">
                <label className="clue-label">猜词线索：</label>
                <Input
                  placeholder="可选，例如：这是一种动物"
                  value={clue}
                  onChange={(e) => setClue(e.target.value)}
                  className="clue-input"
                  size="large"
                />
              </div>
            </div>

            {/* 提交按钮区域 */}
            <div className="app-draw-submit-section">
              <Button
                type="primary"
                size="large"
                onClick={handleSubmitGuess}
                loading={submitting}
                disabled={submitting}
                className="submit-guess-button"
              >
                {submitting ? '正在识别...' : '提交猜词'}
              </Button>
            </div>

            <AppFooter />
          </div>

          {/* 画板区域 */}
          <div className="app-draw-content">
            <MobileDrawBoard
              ref={drawBoardRef}
              onDraw={handleDraw}
            />
          </div>
        </div>
      ) : (
        // 移动设备布局：竖向排列
        <div className="app-draw-container">
          {/* 标题区域 */}
          <div className="app-draw-title-section">
            <h1 className="app-draw-page-title">绘画</h1>
          </div>

          {/* 目标词区域 */}
          <div className="app-draw-header">
            <div className="app-draw-target-word">
              <label className="target-word-label">目标词：</label>
              <Input
                placeholder="输入要绘画的词"
                value={targetWord}
                onChange={(e) => setTargetWord(e.target.value)}
                className="target-word-input"
                size="large"
              />
            </div>
            <div className="app-draw-clue">
              <label className="clue-label">猜词线索：</label>
              <Input
                placeholder="可选，例如：这是一种动物"
                value={clue}
                onChange={(e) => setClue(e.target.value)}
                className="clue-input"
                size="large"
              />
            </div>
          </div>

          {/* 画板区域 - 占据中间大部分空间 */}
          <div className="app-draw-content">
            <MobileDrawBoard
              ref={drawBoardRef}
              onDraw={handleDraw}
            />
          </div>

          {/* 提交按钮区域 */}
          <div className="app-draw-submit-section">
            <Button
              type="primary"
              size="large"
              onClick={handleSubmitGuess}
              loading={submitting}
              disabled={submitting}
              className="submit-guess-button"
            >
              {submitting ? '正在识别...' : '提交猜词'}
            </Button>
          </div>

          <AppFooter />
        </div>
      )}

      <Modal
        title="🎉 恭喜！发布到画廊"
        open={showSuccessGalleryModal}
        onOk={handlePublishToGallery}
        onCancel={() => setShowSuccessGalleryModal(false)}
        okText="发布"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="您的名称">
            <Input
              value={galleryName}
              onChange={(e) => setGalleryName(e.target.value)}
              placeholder={`输入您的名称（默认${username || '佚名'}）`}
            />
          </Form.Item>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
            您的精彩绘画将被分享到画廊，让更多人欣赏您的艺术作品！
          </p>
        </Form>
      </Modal>

      <Modal
        title="🎉 绘画成功！"
        open={showSuccessModal}
        onCancel={() => setShowSuccessModal(false)}
        footer={null}
        width={500}
        closable={true}
        maskClosable={true}
      >
        {successModalData && (
          <div style={{ 
            maxHeight: '60vh', 
            overflowY: 'auto', 
            overflowX: 'hidden',
            padding: '16px 0' 
          }}>
            <p style={{ marginBottom: '12px', fontSize: '16px' }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
              AI 成功识别出了你的绘画！
            </p>
            <div style={{ 
              background: '#f6ffed', 
              border: '1px solid #b7eb8f', 
              borderRadius: '6px', 
              padding: '12px',
              marginTop: '12px'
            }}>
              <p style={{ margin: '0 0 8px 0' }}><strong>目标词:</strong> {successModalData.targetWord}</p>
              <p style={{ margin: '0 0 8px 0' }}><strong>AI 识别:</strong> {successModalData.bestGuess}</p>
              {successModalData.alternatives && successModalData.alternatives.length > 0 && (
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>备选答案:</strong> {successModalData.alternatives.join(', ')}
                </p>
              )}
              <div style={{ 
                margin: '0', 
                paddingTop: '8px', 
                borderTop: '1px dashed #b7eb8f',
                maxHeight: '200px',
                overflowY: 'auto',
                wordBreak: 'break-word'
              }}>
                <strong>AI 分析:</strong>
                <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                  {successModalData.reason || '无额外分析'}
                </p>
              </div>
            </div>
            <div style={{ margin: '16px 0 0 0', textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<PictureOutlined />}
                onClick={() => {
                  setShowSuccessModal(false)
                  setShowSuccessGalleryModal(true)
                }}
                style={{ marginRight: '8px' }}
              >
                发布到画廊
              </Button>
              <Button
                onClick={() => setShowSuccessModal(false)}
              >
                继续绘画
              </Button>
            </div>
            <p style={{ margin: '12px 0 0 0', color: '#52c41a', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>
              💡 继续在画板上自由创作吧！
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

export default AppDraw
