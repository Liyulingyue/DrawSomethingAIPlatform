import { useRef, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, App, Modal, Form, Input } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, TrophyOutlined, PictureOutlined } from '@ant-design/icons'
import MobileDrawBoard, { type MobileDrawBoardRef } from '../components/MobileDrawBoard'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { getLevelById } from '../config/levels'
import { api, type GuessRequest } from '../utils/api'
import { getAIConfig } from '../utils/aiConfig'
import { generatePoster, downloadPoster } from '../utils/posterGenerator'
import { useUser } from '../context/UserContext'
import { useTranslation } from 'react-i18next'
import './ChallengeDraw.css'

// 本地存储 key
const COMPLETED_KEYWORDS_KEY = 'completed_keywords'

// 标记关键词为已完成
const markKeywordCompleted = (levelId: string, keyword: string) => {
  try {
    const stored = localStorage.getItem(COMPLETED_KEYWORDS_KEY)
    const completed = stored ? new Set(JSON.parse(stored)) : new Set()
    completed.add(`${levelId}:${keyword}`)
    localStorage.setItem(COMPLETED_KEYWORDS_KEY, JSON.stringify([...completed]))
    console.log(`✅ 标记关键词已完成: ${levelId}:${keyword}`)
  } catch (error) {
    console.error('保存完成状态失败:', error)
  }
}

function ChallengeDraw() {
  const { message, modal } = App.useApp()
  const { sessionId, username } = useUser()
  const { t: tPage } = useTranslation('challengeDraw')
  const { t: tLevels } = useTranslation('levels')
  const { i18n } = useTranslation()
  const drawBoardRef = useRef<MobileDrawBoardRef>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [galleryName, setGalleryName] = useState(username || '佚名')
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024)
  const navigate = useNavigate()
  const location = useLocation()

  const share = async (targetKeyword: string, guessResult: string, aiModel?: string) => {
    const image = drawBoardRef.current?.getImage()
    if (!image) {
      message.error(tPage('challengeDraw.messages.noDrawing'))
      return
    }

    try {
      const posterDataUrl = await generatePoster({
        drawingImage: image,
        targetKeyword,
        guessResult,
        aiModel: aiModel || '默认模型'
      })
      
      downloadPoster(posterDataUrl, `ai-drawing-poster-${targetKeyword}.png`)
      message.success(tPage('challengeDraw.messages.posterGenerated'))
    } catch (error) {
      console.error('生成海报失败:', error)
      message.error(tPage('challengeDraw.messages.posterFailed'))
    }
  }

  // 获取等级显示文本（支持 translation key 或 原文）
  const getDisplayLevelText = (text?: string | undefined): string => {
    if (!text) return ''
    if (text.includes('.') || text.startsWith('levels.draw.') || text.startsWith('levels.guess.')) {
      return tLevels(text)
    }
    return text
  }

  // 获取关卡的关键词数组（支持翻译键字符串或字面数组）
  const getKeywordsForLevel = (level?: any): string[] => {
    if (!level || !level.keywords) return []
    if (typeof level.keywords === 'string') {
      const translated = tLevels(level.keywords as string, { returnObjects: true })
      return Array.isArray(translated) ? translated.map(String) : []
    }
    return level.keywords
  }

  // 从 URL 参数获取关卡信息
  const searchParams = new URLSearchParams(location.search)
  const levelId = searchParams.get('level') || ''
  const keyword = searchParams.get('keyword') || ''

  // 获取关卡配置
  const levelConfig = getLevelById(levelId)

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

  // 如果没有关卡信息，跳转回选关页面
  useEffect(() => {
    if (!levelId || !keyword) {
      message.warning(tPage('challengeDraw.messages.selectLevelFirst'))
      navigate('/app/level-set')
    }
  }, [levelId, keyword, navigate])

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
      message.warning(tPage('challengeDraw.messages.completeDrawing'))
      return
    }

    setSubmitting(true)
    try {
      console.log('🎨 提交闯关绘画')
      console.log('目标词:', keyword)
      
      // 获取 AI 配置
      const aiConfig = getAIConfig()
      
      // 构造请求体
      const requestBody: GuessRequest = {
        image,
        target: keyword,
      }

      // 如果关卡配置中有 clue，则传递给后端
      if (levelConfig?.clue) {
        requestBody.clue = levelConfig.clue
        console.log('📝 使用关卡提示信息:', levelConfig.clue)
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

      // 判断是否猜中 - 使用宽松的判断标准
      const targetNormalized = keyword.trim().toLowerCase()
      const bestGuess = result.best_guess || ''
      const alternatives = result.alternatives || []
      
      // 获取AI模型信息用于分享
      const aiModel = requestBody.config?.model || '默认模型'
      
      // 检查目标词是否被猜中的词包含
      const isCorrect = 
        bestGuess.toLowerCase().includes(targetNormalized) ||
        alternatives.some((alt: string) => alt.toLowerCase().includes(targetNormalized))

      // 获取当前进度
      const currentIndex = levelConfig?.keywords?.indexOf(keyword) ?? -1
      const totalKeywords = levelConfig?.keywords?.length ?? 0
      const progress = `${currentIndex + 1}/${totalKeywords}`

      if (isCorrect) {
        // 检查是否是最后一关
        const isLastKeyword = currentIndex === totalKeywords - 1
        
        if (isLastKeyword) {
          // 通关成功弹窗
          const modalInstance = modal.success({
            title: tPage('challengeDraw.modals.levelComplete.title'),
            content: (
              <div style={{ 
                maxHeight: '60vh', 
                overflowY: 'auto', 
                overflowX: 'hidden',
                padding: '16px 0' 
              }}>
                <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                  <TrophyOutlined style={{ color: '#faad14', marginRight: '8px' }} />
                  {tPage('challengeDraw.modals.levelComplete.congratulations', { title: getDisplayLevelText(levelConfig?.title) })}
                </p>
                <div style={{ 
                  background: '#fffbe6', 
                  border: '1px solid #ffe58f', 
                  borderRadius: '6px', 
                  padding: '12px',
                  marginTop: '12px'
                }}>
                  <p style={{ margin: '0 0 8px 0' }}><strong>{tPage('challengeDraw.modals.levelComplete.level')}</strong>{getDisplayLevelText(levelConfig?.title)}</p>
                  <p style={{ margin: '0 0 8px 0' }}><strong>{tPage('challengeDraw.modals.levelComplete.lastKeyword')}</strong>{keyword}</p>
                  <p style={{ margin: '0 0 8px 0' }}><strong>{tPage('challengeDraw.modals.levelComplete.aiRecognition')}</strong>{bestGuess}</p>
                  {alternatives.length > 0 && (
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>{tPage('challengeDraw.modals.levelComplete.alternatives')}</strong>{alternatives.join(', ')}
                    </p>
                  )}
                  <div style={{ 
                    margin: '0', 
                    paddingTop: '8px', 
                    borderTop: '1px dashed #ffe58f',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    wordBreak: 'break-word'
                  }}>
                    <strong>{tPage('challengeDraw.modals.levelComplete.aiAnalysis')}</strong>
                    <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                      {result.reason || tPage('challengeDraw.modals.levelComplete.noAnalysis')}
                    </p>
                  </div>
                </div>
                <p style={{ margin: '12px 0 0 0', color: '#faad14', fontSize: '14px', fontWeight: 500 }}>
                  {tPage('challengeDraw.modals.levelComplete.completed')}
                </p>
              </div>
            ),
            width: 520,
            footer: (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <Button
                  icon={<PictureOutlined />}
                  onClick={() => {
                    setShowGalleryModal(true)
                  }}
                >
                  {tPage('challengeDraw.modals.levelComplete.publishToGallery')}
                </Button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button onClick={() => {
                    share(keyword, bestGuess, aiModel)
                  }}>{tPage('challengeDraw.modals.levelComplete.shareDrawing')}</Button>
                  <Button type="primary" onClick={() => {
                    markKeywordCompleted(levelId, keyword)
                    modalInstance.destroy()
                    navigate('/app/level-set')
                  }}>{tPage('challengeDraw.modals.levelComplete.backToLevelSelect')}</Button>
                </div>
              </div>
            ),
          })
        } else {
          // 单关成功弹窗
          const modalInstance = modal.success({
            title: tPage('challengeDraw.modals.challengeSuccess.title'),
            content: (
              <div style={{ 
                maxHeight: '60vh', 
                overflowY: 'auto', 
                overflowX: 'hidden',
                padding: '16px 0' 
              }}>
                <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  {tPage('challengeDraw.modals.challengeSuccess.congratulations')}
                </p>
                <div style={{ 
                  background: '#f6ffed', 
                  border: '1px solid #b7eb8f', 
                  borderRadius: '6px', 
                  padding: '12px',
                  marginTop: '12px'
                }}>
                  <p style={{ margin: '0 0 8px 0' }}><strong>{tPage('challengeDraw.modals.challengeSuccess.progress')}</strong>{progress}</p>
                  <p style={{ margin: '0 0 8px 0' }}><strong>{tPage('challengeDraw.modals.challengeSuccess.currentKeyword')}</strong>{keyword}</p>
                  <p style={{ margin: '0 0 8px 0' }}><strong>{tPage('challengeDraw.modals.challengeSuccess.aiRecognition')}</strong>{bestGuess}</p>
                  {alternatives.length > 0 && (
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>{tPage('challengeDraw.modals.challengeSuccess.alternatives')}</strong>{alternatives.join(', ')}
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
                    <strong>{tPage('challengeDraw.modals.challengeSuccess.aiAnalysis')}</strong>
                    <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                      {result.reason || tPage('challengeDraw.modals.challengeSuccess.noAnalysis')}
                    </p>
                  </div>
                </div>
                <p style={{ margin: '12px 0 0 0', color: '#52c41a', fontSize: '14px', fontWeight: 500 }}>
                  {tPage('challengeDraw.modals.challengeSuccess.readyForNextChallenge')}
                </p>
              </div>
            ),
            width: 520,
            footer: (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <Button
                  icon={<PictureOutlined />}
                  onClick={() => {
                    setShowGalleryModal(true)
                  }}
                >
                  {tPage('challengeDraw.modals.challengeSuccess.publishToGallery')}
                </Button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button onClick={() => {
                    share(keyword, bestGuess, aiModel)
                  }}>{tPage('challengeDraw.modals.challengeSuccess.share')}</Button>
                  <Button type="primary" onClick={() => {
                    markKeywordCompleted(levelId, keyword)
                    modalInstance.destroy()
                    handleNextKeyword()
                  }}>{tPage('challengeDraw.modals.challengeSuccess.nextLevel')}</Button>
                </div>
              </div>
            ),
          })
        }
        message.success(tPage('challengeDraw.messages.challengeSuccess'))
      } else {
        // 显示失败弹窗
        modal.error({
          title: tPage('challengeDraw.modals.tryAgain.title'),
          content: (
            <div style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto', 
              overflowX: 'hidden',
              padding: '16px 0' 
            }}>
              <p style={{ marginBottom: '12px', fontSize: '16px' }}>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
                {tPage('challengeDraw.modals.tryAgain.description')}
              </p>
              <div style={{ 
                background: '#fff2f0', 
                border: '1px solid #ffccc7', 
                borderRadius: '6px', 
                padding: '12px',
                marginTop: '12px'
              }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>{tPage('challengeDraw.modals.tryAgain.progress')}</strong>{progress}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>{tPage('challengeDraw.modals.tryAgain.currentKeyword')}</strong>{keyword}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>{tPage('challengeDraw.modals.tryAgain.aiRecognition')}</strong>{bestGuess || tPage('challengeDraw.modals.tryAgain.unableToRecognize')}</p>
                {alternatives.length > 0 && (
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>{tPage('challengeDraw.modals.tryAgain.alternatives')}</strong>{alternatives.join(', ')}
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
                  <strong>{tPage('challengeDraw.modals.tryAgain.aiAnalysis')}</strong>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                    {result.reason || tPage('challengeDraw.modals.tryAgain.noAnalysis')}
                  </p>
                </div>
              </div>
              <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{tPage('challengeDraw.modals.guessFailed.improvementTips')}</p>
                <ul style={{ margin: '0 0 0 16px', paddingLeft: '8px' }}>
                  <li>{tPage('challengeDraw.modals.guessFailed.tip1')}</li>
                  <li>{tPage('challengeDraw.modals.guessFailed.tip2')}</li>
                  <li>{tPage('challengeDraw.modals.guessFailed.tip3')}</li>
                  <li>{tPage('challengeDraw.modals.guessFailed.configTip')}</li>
                </ul>
                <p style={{ margin: '8px 0 0 0', color: '#1890ff', fontWeight: 500 }}>
                  {tPage('challengeDraw.modals.guessFailed.continueDrawing')}
                </p>
              </div>
            </div>
          ),
          width: 520,
          okText: tPage('challengeDraw.modals.tryAgain.continueButton')
        })
        message.warning(tPage('challengeDraw.messages.noMatch'))
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
              <strong>{tPage('modals.submitFailed.errorInfo')}</strong>
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
      // 生成分享海报
      const posterDataUrl = await generatePoster({
        drawingImage: image,
        targetKeyword: keyword,
        guessResult: `目标词：${keyword}`,
        aiModel: 'DrawSomethingAI'
      })

      await api.post('/gallery/save', {
        image: posterDataUrl,
        name: galleryName.trim() || '佚名'
      })

      message.success(tPage('challengeDraw.messages.publishSuccess'))
      setShowGalleryModal(false)
      setGalleryName('佚名')
      // 发布成功后，成功弹窗保持打开状态，让用户可以继续选择下一关
    } catch (error) {
      console.error(tPage('challengeDraw.messages.publishFailed'), error)
      message.error(tPage('challengeDraw.messages.publishFailed'))
    }
  }

  const handleNextKeyword = () => {
    const keywords = getKeywordsForLevel(levelConfig)
    if (!levelConfig || !keywords || keywords.length === 0) {
      message.warning('该关卡暂无更多关键词')
      navigate('/app/level-set')
      return
    }

    // 获取当前关键词的索引
    const currentIndex = keywords.indexOf(keyword)
    
    if (currentIndex === -1) {
      message.error(tPage('challengeDraw.messages.keywordNotFound'))
      navigate('/app/level-set')
      return
    }

    // 获取下一个关键词
    const nextIndex = currentIndex + 1
    
    if (nextIndex >= keywords.length) {
      // 已经是最后一个关键词，恭喜完成该关卡
      message.success(tPage('challengeDraw.messages.levelCompleted', { title: getDisplayLevelText(levelConfig?.title) }))
    }

    const nextKeyword = keywords[nextIndex]
    
    // 清空画板
    drawBoardRef.current?.clearCanvas()
    
    // 跳转到下一个关键词
    navigate(`/app/challenge-draw?level=${levelId}&keyword=${encodeURIComponent(nextKeyword)}`)
    message.info(tPage('challengeDraw.messages.nextLevel', { keyword: nextKeyword }))
  }

  const handleSkipChallenge = () => {
    const keywordsForSkip = getKeywordsForLevel(levelConfig)
    if (!levelConfig || !keywordsForSkip || keywordsForSkip.length === 0) {
      message.warning('该关卡暂无更多关键词')
      navigate('/app/level-set')
      return
    }

    const currentIndex = keywordsForSkip.indexOf(keyword)
    const totalKeywords = keywordsForSkip.length
    
    message.info(`跳过关键词：${keyword} (${currentIndex + 1}/${totalKeywords})`)
    
    // 跳转到下一个关键词
    handleNextKeyword()
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      {isDesktop ? (
        // 桌面端布局：左右分开
        <div className="challenge-draw-container desktop-layout">
          {/* 左侧面板 */}
          <div className="challenge-draw-left-panel">
            {/* 标题区域 */}
            <div className="challenge-draw-title-section">
              <div className="challenge-draw-level-info">
                <span className="challenge-level-icon">{levelConfig?.icon || '🎯'}</span>
                <h1 className="challenge-draw-page-title">{getDisplayLevelText(levelConfig?.title) || tPage('challengeDraw.pageTitle')}</h1>
              </div>
            </div>

            {/* 目标词区域 */}
            <div className="challenge-draw-header">
              <div className="challenge-draw-target-word">
                <label className="challenge-target-word-label">{tPage('challengeDraw.targetWordLabel')}</label>
                <div className="challenge-target-word-display">
                  {keyword || '未选择'}
                </div>
              </div>
            </div>

            {/* 按钮区域 */}
            <div className="challenge-draw-button-section">
              <Button
                type="primary"
                size="large"
                onClick={handleSubmitGuess}
                loading={submitting}
                disabled={submitting}
                className="submit-guess-button"
              >
                {submitting ? tPage('challengeDraw.buttons.submitting') : tPage('challengeDraw.buttons.submitGuess')}
              </Button>
              <Button
                size="large"
                onClick={handleSkipChallenge}
                disabled={submitting}
                className="skip-challenge-button"
              >
                {tPage('challengeDraw.buttons.skipLevel')}
              </Button>
            </div>

            {/* 版权声明 - 放在左侧面板底部 */}
            <AppFooter className="app-footer-light desktop-footer" />
          </div>

          {/* 右侧画板区域 */}
          <div className="challenge-draw-content">
            <MobileDrawBoard
              ref={drawBoardRef}
              onDraw={handleDraw}
            />
          </div>
        </div>
      ) : (
        // 移动端布局：竖向
        <div className="challenge-draw-container mobile-layout">
          {/* 标题区域 */}
          <div className="challenge-draw-title-section">
            <div className="challenge-draw-level-info">
              <span className="challenge-level-icon">{levelConfig?.icon || '🎯'}</span>
              <h1 className="challenge-draw-page-title">{getDisplayLevelText(levelConfig?.title) || tPage('challengeDraw.pageTitle')}</h1>
            </div>
          </div>

          {/* 目标词区域 - 只读显示 */}
          <div className="challenge-draw-header">
            <div className="challenge-draw-target-word">
              <label className="challenge-target-word-label">{tPage('challengeDraw.targetWordLabel')}</label>
              <div className="challenge-target-word-display">
                {keyword || '未选择'}
              </div>
            </div>
          </div>

          {/* 画板区域 - 占据中间大部分空间 */}
          <div className="challenge-draw-content">
            <MobileDrawBoard
              ref={drawBoardRef}
              onDraw={handleDraw}
            />
          </div>

          {/* 按钮区域 */}
          <div className="challenge-draw-button-section">
            <Button
              type="primary"
              size="large"
              onClick={handleSubmitGuess}
              loading={submitting}
              disabled={submitting}
              className="submit-guess-button"
            >
              {submitting ? tPage('challengeDraw.buttons.submitting') : tPage('challengeDraw.buttons.submitGuess')}
            </Button>
            <Button
              size="large"
              onClick={handleSkipChallenge}
              disabled={submitting}
              className="skip-challenge-button"
            >
              {tPage('challengeDraw.buttons.skipLevel')}
            </Button>
          </div>

          <AppFooter className="app-footer-light" />
        </div>
      )}

      <Modal
        title={tPage('challengeDraw.galleryModal.title') || 'Publish to Gallery'}
        open={showGalleryModal}
        onOk={handlePublishToGallery}
        onCancel={() => setShowGalleryModal(false)}
        okText={tPage('challengeDraw.galleryModal.submitButton')}
        cancelText={tPage('challengeDraw.galleryModal.cancelButton')}
      >
        <Form layout="vertical">
          <Form.Item label={tPage('challengeDraw.galleryModal.nameLabel')}>
            <Input
              value={galleryName}
              onChange={(e) => setGalleryName(e.target.value)}
              placeholder={tPage('challengeDraw.galleryModal.namePlaceholder', { defaultName: username || '佚名' })}
            />
          </Form.Item>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
            {tPage('challengeDraw.galleryModal.description')}
          </p>
        </Form>
      </Modal>
    </>
  )
}

export default ChallengeDraw
