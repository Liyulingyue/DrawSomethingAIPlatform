import { useRef, useEffect, useState } from 'react'
import { Input, Button, App, Modal, Form } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, PictureOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import MobileDrawBoard, { type MobileDrawBoardRef } from '../components/MobileDrawBoard'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { api, type GuessRequest } from '../utils/api'
import { getAIConfig } from '../utils/aiConfig'
import { useUser } from '../context/UserContext'
import './AppDraw.css'

function AppDraw() {
  const { message, modal } = App.useApp()
  const { t } = useTranslation('appDraw')
  const { i18n } = useTranslation()
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
      message.warning(t('appDraw.messages.pleaseDrawFirst'))
      return
    }

    if (!targetWord.trim()) {
      message.warning(t('appDraw.messages.pleaseEnterTarget'))
      return
    }

    setSubmitting(true)
    try {
      console.log('🎨 提交绘画猜词')
      console.log('目标词:', targetWord)
      
      // 获取 AI 配置
      const aiConfig = getAIConfig()
      
      // 构造请求体
      const requestBody: GuessRequest = {
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

      // 添加语言参数
      requestBody.language = i18n.language
      console.log('🌐 使用语言:', i18n.language)

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
        message.success(t('appDraw.messages.recognitionSuccess'))
      } else {
        // 显示失败弹窗
        modal.error({
          title: t('appDraw.modals.failure.title'),
          content: (
            <div style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto', 
              overflowX: 'hidden',
              padding: '16px 0' 
            }}>
              <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
                {t('appDraw.modals.failure.description')}
              </p>
              <div style={{ 
                background: '#fff2f0', 
                border: '1px solid #ffccc7', 
                borderRadius: '6px', 
                padding: '12px',
                marginTop: '12px'
              }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>{t('appDraw.modals.failure.targetWord')}</strong> {targetWord}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>{t('appDraw.modals.failure.aiRecognition')}</strong> {bestGuess || t('appDraw.modals.failure.unableToRecognize')}</p>
                {alternatives.length > 0 && (
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>{t('appDraw.modals.failure.alternatives')}</strong> {alternatives.join(', ')}
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
                  <strong>{t('appDraw.modals.failure.aiAnalysis')}</strong>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                    {result.reason || t('appDraw.modals.failure.noAnalysis')}
                  </p>
                </div>
              </div>
              <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{t('appDraw.modals.failure.improvementTips')}</p>
                <ul style={{ margin: '0 0 0 16px', paddingLeft: '8px' }}>
                  <li>{t('appDraw.modals.failure.tip1')}</li>
                  <li>{t('appDraw.modals.failure.tip2')}</li>
                  <li>{t('appDraw.modals.failure.tip3')}</li>
                </ul>
                <p style={{ margin: '8px 0 0 0', color: '#1890ff', fontWeight: 500 }}>
                  {t('appDraw.modals.failure.continueDrawing')}
                </p>
              </div>
            </div>
          ),
          width: 520,
          okText: t('appDraw.modals.failure.continueButton')
        })
        message.warning(t('appDraw.messages.recognitionFailed'))
      }
      
    } catch (error) {
      console.error('💥 提交猜词失败:', error)
      
      let errorMessage = t('appDraw.messages.submitFailed')
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = t('appDraw.messages.connectionFailed')
        } else {
          errorMessage = error.message
        }
      }

      modal.error({
        title: t('appDraw.modals.error.title'),
        content: (
          <div style={{ 
            maxHeight: '60vh', 
            overflowY: 'auto', 
            overflowX: 'hidden',
            padding: '16px 0' 
          }}>
            <p style={{ marginBottom: '12px', fontSize: '16px' }}>
              {t('appDraw.modals.error.description')}
            </p>
            <div style={{ 
              background: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '6px', 
              padding: '12px',
              wordBreak: 'break-word'
            }}>
              <strong>{t('appDraw.messages.errorInfo')}</strong>
              <p style={{ margin: '4px 0 0 0', color: '#ff4d4f', whiteSpace: 'pre-wrap' }}>
                {errorMessage}
              </p>
            </div>
            <p style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
              {t('appDraw.messages.checkNetworkAndConfig')}
            </p>
          </div>
        ),
        width: 500,
        okText: t('appDraw.modals.error.okText')
      })
      
      message.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublishToGallery = async () => {
    const image = drawBoardRef.current?.getImage()
    if (!image) {
      message.warning(t('appDraw.messages.pleaseDrawFirst'))
      return
    }

    try {
      await api.post('/gallery/save', {
        image,
        name: galleryName.trim() || '佚名'
      })

      message.success(t('appDraw.messages.publishSuccess'))
      setShowSuccessGalleryModal(false)
      setGalleryName('佚名')
    } catch (error) {
      console.error(t('appDraw.messages.publishFailed'), error)
      message.error(t('appDraw.messages.publishFailed'))
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
              <h1 className="app-draw-page-title">{t('appDraw.title')}</h1>
            </div>

            {/* 目标词区域 */}
            <div className="app-draw-header">
              <div className="app-draw-target-word">
                <label className="target-word-label">{t('appDraw.form.targetWordLabel')}</label>
                <Input
                  placeholder={t('appDraw.form.targetWordPlaceholder')}
                  value={targetWord}
                  onChange={(e) => setTargetWord(e.target.value)}
                  className="target-word-input"
                  size="large"
                />
              </div>
              <div className="app-draw-clue">
                <label className="clue-label">{t('appDraw.form.clueLabel')}</label>
                <Input
                  placeholder={t('appDraw.form.cluePlaceholder')}
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
                {submitting ? t('appDraw.buttons.submitting') : t('appDraw.buttons.submitGuess')}
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
            <h1 className="app-draw-page-title">{t('appDraw.title')}</h1>
          </div>

          {/* 目标词区域 */}
          <div className="app-draw-header">
            <div className="app-draw-target-word">
              <label className="target-word-label">{t('appDraw.form.targetWordLabel')}</label>
              <Input
                placeholder={t('appDraw.form.targetWordPlaceholder')}
                value={targetWord}
                onChange={(e) => setTargetWord(e.target.value)}
                className="target-word-input"
                size="large"
              />
            </div>
            <div className="app-draw-clue">
              <label className="clue-label">{t('appDraw.form.clueLabel')}</label>
              <Input
                placeholder={t('appDraw.form.cluePlaceholder')}
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
              {submitting ? t('appDraw.buttons.submitting') : t('appDraw.buttons.submitGuess')}
            </Button>
          </div>

          <AppFooter />
        </div>
      )}

      <Modal
        title={t('appDraw.modals.publishToGallery.title')}
        open={showSuccessGalleryModal}
        onOk={handlePublishToGallery}
        onCancel={() => setShowSuccessGalleryModal(false)}
        okText={t('appDraw.modals.publishToGallery.okText')}
        cancelText={t('appDraw.modals.publishToGallery.cancelText')}
      >
        <Form layout="vertical">
          <Form.Item label={t('appDraw.modals.publishToGallery.nameLabel')}>
            <Input
              value={galleryName}
              onChange={(e) => setGalleryName(e.target.value)}
              placeholder={t('appDraw.modals.publishToGallery.namePlaceholder', { username: username || '佚名' })}
            />
          </Form.Item>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
            {t('appDraw.modals.publishToGallery.description')}
          </p>
        </Form>
      </Modal>

      <Modal
        title={t('appDraw.modals.success.title')}
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
              {t('appDraw.modals.success.description')}
            </p>
            <div style={{ 
              background: '#f6ffed', 
              border: '1px solid #b7eb8f', 
              borderRadius: '6px', 
              padding: '12px',
              marginTop: '12px'
            }}>
              <p style={{ margin: '0 0 8px 0' }}><strong>{t('appDraw.modals.success.targetWord')}</strong> {successModalData.targetWord}</p>
              <p style={{ margin: '0 0 8px 0' }}><strong>{t('appDraw.modals.success.aiRecognition')}</strong> {successModalData.bestGuess}</p>
              {successModalData.alternatives && successModalData.alternatives.length > 0 && (
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>{t('appDraw.modals.success.alternatives')}</strong> {successModalData.alternatives.join(', ')}
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
                <strong>{t('appDraw.modals.success.aiAnalysis')}</strong>
                <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                  {successModalData.reason || t('appDraw.modals.success.noAnalysis')}
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
                {t('appDraw.buttons.publishToGallery')}
              </Button>
              <Button
                onClick={() => setShowSuccessModal(false)}
              >
                {t('appDraw.buttons.continueDrawing')}
              </Button>
            </div>
            <p style={{ margin: '12px 0 0 0', color: '#52c41a', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>
              {t('appDraw.modals.success.continueTip')}
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

export default AppDraw
