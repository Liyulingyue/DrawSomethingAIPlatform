import { useRef, useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, App, Input, Spin, Tooltip } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import MobileDrawBoard, { type MobileDrawBoardRef } from '../components/MobileDrawBoard'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { getGuessLevelById, getShuffledKeywords } from '../config/guessLevels'
import { generateSketch } from '../utils/sketchApi'
import { getAIConfig } from '../utils/aiConfig'
import { useUser } from '../context/UserContext'
import { useTranslation } from 'react-i18next'
import './ChallengeGuess.css'

// 本地存储 key
const COMPLETED_GUESS_LEVELS_KEY = 'completed_guess_levels'
const GUESS_LEVEL_SCORES_KEY = 'guess_level_scores'

// 标记关卡为已完成
const markLevelCompleted = (levelId: string) => {
  try {
    const stored = localStorage.getItem(COMPLETED_GUESS_LEVELS_KEY)
    const completed = stored ? new Set(JSON.parse(stored)) : new Set()
    completed.add(levelId)
    localStorage.setItem(COMPLETED_GUESS_LEVELS_KEY, JSON.stringify([...completed]))
    console.log(`✅ 标记关卡已完成: ${levelId}`)
  } catch (error) {
    console.error('保存完成状态失败:', error)
  }
}

// 存储关卡得分
const saveLevelScore = (levelId: string, score: number) => {
  try {
    const stored = localStorage.getItem(GUESS_LEVEL_SCORES_KEY)
    const scores = stored ? JSON.parse(stored) : {}
    scores[levelId] = score
    localStorage.setItem(GUESS_LEVEL_SCORES_KEY, JSON.stringify(scores))
    console.log(`💰 保存关卡得分: ${levelId} = ${score}分`, scores)
  } catch (error) {
    console.error('保存关卡得分失败:', error)
  }
}

// 获取所有已完成关卡的总得分
const getTotalScore = (): number => {
  try {
    const stored = localStorage.getItem(GUESS_LEVEL_SCORES_KEY)
    const scores = stored ? JSON.parse(stored) : {}
    const total = Object.values(scores).reduce((total: number, score: any) => total + (typeof score === 'number' ? score : 0), 0)
    console.log(`📊 计算总得分:`, scores, `= ${total}分`)
    return total
  } catch (error) {
    console.error('获取总得分失败:', error)
    return 0
  }
}

function ChallengeGuess() {
  const { message, modal } = App.useApp()
  const drawBoardRef = useRef<MobileDrawBoardRef>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [guessInput, setGuessInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(0) // 累加计时，从0开始
  const [sketchSteps, setSketchSteps] = useState<string[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [levelScore, setLevelScore] = useState(0) // 当前关卡累计积分
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024) // 桌面端检测
  const [candidateWords, setCandidateWords] = useState<string[]>([])

  // 简单稳定的字符串 hash，用作伪随机种子
  const stableHash = (str: string) => {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }

  // 基于种子的伪随机数生成器
  const seededRandomGenerator = (seed: number) => {
    let s = seed >>> 0
    return () => {
      s = Math.imul(s, 1664525) + 1013904223
      return (s >>> 0) / 4294967296
    }
  }

  // 基于种子的 Fisher-Yates 洗牌
  const seededShuffle = (arr: string[], seed: number) => {
    const a = [...arr]
    const rand = seededRandomGenerator(seed)
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionId } = useUser() // 获取真实的 sessionId（如果已登录）
  const { t: tPage } = useTranslation('challengeGuess')
  const { t: tLevels } = useTranslation('levels')

  // 获取等级显示文本（支持 translation key 或 原文）
  const getDisplayLevelText = (text?: string | undefined): string => {
    if (!text) return ''
    if (text.includes('.') || text.startsWith('levels.draw.') || text.startsWith('levels.guess.')) {
      return tLevels(text)
    }
    return text
  }

  // 无需登录 - 用户可以使用自定义配置调用绘画API

  // 解析URL参数
  const searchParams = new URLSearchParams(location.search)
  const levelId = searchParams.get('level') || ''
  const keywordIndexStr = searchParams.get('keywordIndex') || '0'
  const keywordIndex = parseInt(keywordIndexStr, 10)

  // 获取关卡配置
  const levelConfig = getGuessLevelById(levelId)

  // 获取当前关键词（使用 useMemo 缓存，避免每次渲染重新计算）
  const shuffledKeywords = useMemo(() => getShuffledKeywords(levelId, tLevels), [levelId, tLevels])

  const currentKeyword = shuffledKeywords[keywordIndex] || ''

  // 关卡变化时重置积分
  useEffect(() => {
    setLevelScore(0)
  }, [levelId])

  // 监听窗口大小变化和防止滚动
  useEffect(() => {
    // 防止页面滚动
    document.body.classList.add('drawing-active')
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'

    // 监听窗口大小变化
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 1024)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      // 清理：恢复页面滚动
      document.body.classList.remove('drawing-active')
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 打印当前目标词和关卡信息（仅在关键参数变化时）
  useEffect(() => {
    console.log('\n========== 关卡信息 ==========')
    console.log(`🎯 关卡 ID: ${levelId}`)
    console.log(`🎯 关卡名称: ${levelConfig?.title || '未知'}`)
    console.log(`🎯 当前题号: ${keywordIndex + 1}/${shuffledKeywords.length}`)
    console.log(`🎯 当前目标词: ${currentKeyword}`)
    console.log(`🎯 所有词汇: [${shuffledKeywords.join(', ')}]`)
    console.log('==============================\n')
  }, [levelId, keywordIndex]) // 只依赖 levelId 和 keywordIndex

  // 加载简笔画 - 使用 ref 和 cleanup 防止重复加载
  const loadedKeywordRef = useRef<string>('')
  const loadingRef = useRef(false)
  
  useEffect(() => {
    // 如果已经加载过这个关键词，或正在加载中，跳过
    if (!currentKeyword || loadedKeywordRef.current === currentKeyword || loadingRef.current) {
      return
    }

    let cancelled = false
    loadingRef.current = true

    const loadSketch = async () => {
      setLoading(true)
      try {
        console.log(`🎨 正在生成简笔画: ${currentKeyword}`)
        
        // 获取 AI 配置
        const aiConfig = getAIConfig()
        
        // 构建请求体
        const sketchRequest: any = {
          prompt: currentKeyword,
          max_steps: 20,
          sort_method: 'split', // 分割排序方法 'area': 按面积绘制简笔画 | 'position':按位置绘制简笔画 | 'split':展示彩色图片
          useCache: false, // 猜词闯关不使用缓存
        }
        
        // 添加会话ID（如果有）
        if (sessionId) {
          sketchRequest.sessionId = sessionId
        }
        
        // 添加AI配置（文生图模型）
        if (aiConfig.imageUrl && aiConfig.imageKey && aiConfig.imageModelName) {
          sketchRequest.config = {
            url: aiConfig.imageUrl,
            key: aiConfig.imageKey,
            model: aiConfig.imageModelName,
          }
          console.log('✅ 使用自定义文生图配置')
        } else {
          console.log('ℹ️ 文生图模型未配置')
        }
        
        // 添加调用偏好
        sketchRequest.callPreference = aiConfig.callPreference || 'custom'
        console.log('📞 使用调用偏好:', sketchRequest.callPreference)
        
        const result = await generateSketch(sketchRequest)
        
        if (cancelled) {
          console.log('🚫 请求已取消')
          return
        }
        
        console.log(`✅ 简笔画生成成功，共 ${result.total_steps} 步`)
        setSketchSteps(result.steps)
        setCurrentStepIndex(0)
        loadedKeywordRef.current = currentKeyword // 标记已加载
      } catch (error: any) {
        if (!cancelled) {
          console.error('💥 生成简笔画失败:', error)
          console.error('📋 错误详情:', {
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data,
            message: error?.message
          })
          
          let errorMessage = '生成简笔画失败，请稍后重试'
          
          if (error?.response?.status === 422) {
            // 验证错误
            const detail = error?.response?.data?.detail
            console.error('🔍 验证错误详情:', detail)
            errorMessage = `请求格式错误: ${JSON.stringify(detail)}`
          } else if (error?.response?.status === 402) {
            errorMessage = '调用次数不足，请充值后继续游戏'
          } else if (error?.response?.status === 500) {
            // 500 错误可能是配置问题或其他服务器错误
            const detail = error?.response?.data?.detail || ''
            if (detail.includes('config') || detail.includes('配置')) {
              errorMessage = '绘画API配置有误，请检查您的自定义配置。如无配置，请登录后使用服务器配置。'
            }
          } else if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
              errorMessage = '无法连接到服务器，请检查网络连接'
            }
          }
          
          message.error(errorMessage)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          loadingRef.current = false
        }
      }
    }

    loadSketch()

    return () => {
      cancelled = true
      loadingRef.current = false
    }
  }, [currentKeyword, message])

  // 渐进显示简笔画
  useEffect(() => {
    if (sketchSteps.length === 0 || currentStepIndex >= sketchSteps.length) return

    const timer = setTimeout(() => {
      setCurrentStepIndex(prev => Math.min(prev + 1, sketchSteps.length - 1))
    }, 5000) // 每5秒显示一步

    return () => clearTimeout(timer)
  }, [currentStepIndex, sketchSteps])

  // 获取当前要显示的图片
  const currentDisplayImage = sketchSteps.length > 0 ? sketchSteps[currentStepIndex] : null

  // 累加计时逻辑
  useEffect(() => {
    if (loading) return // 加载中不启动计时

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev >= 300) { // 最大5分钟
          return 300
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [loading])

  // 时间结束自动显示答案
  useEffect(() => {
    if (timeLeft >= 300 && currentKeyword && !loading) {
      modal.confirm({
        title: tPage('challengeGuess.modals.timeUp.title'),
        content: (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', marginBottom: '16px' }}>
              {tPage('challengeGuess.modals.timeUp.message')}
              <strong style={{ color: '#52c41a' }}>{currentKeyword}</strong>
            </p>
            <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{tPage('ui.challengeEnd')}</p>
              <p style={{ margin: '0', color: '#1890ff', fontWeight: 500 }}>
                {tPage('challengeGuess.ui.readyForNext')}
              </p>
            </div>
          </div>
        ),
        width: 480,
        okText: tPage('challengeGuess.modals.timeUp.continue'),
        onOk: handleNextKeyword,
        cancelText: tPage('challengeGuess.modals.timeUp.cancel'),
        onCancel: () => {
          // 重置状态，重新开始这一题
          setGuessInput('')
          setTimeLeft(0)
          setSketchSteps([])
          setCurrentStepIndex(0)
          setLoading(true)
          loadedKeywordRef.current = '' // 重置加载标记
        }
      })
      message.warning(tPage('challengeGuess.timeUp'))
    }
  }, [timeLeft, currentKeyword, loading, modal, message])

  // 提交猜测
  const handleSubmitGuess = async () => {
    if (!guessInput.trim()) {
      message.warning(tPage('challengeGuess.enterGuess'))
      return
    }

    if (!currentKeyword) {
      message.error(tPage('challengeGuess.keywordNotFound'))
      return
    }

    setSubmitting(true)

    try {
      // 直接比较用户猜测和正确答案
      const userGuess = guessInput.trim().toLowerCase()
      const correctAnswer = currentKeyword.toLowerCase()
      const isCorrect = userGuess === correctAnswer

      if (isCorrect) {
        // 猜测正确 - 计算积分
        const score = calculateScore(timeLeft)
        setLevelScore(prev => prev + score)
        
        markLevelCompleted(`${levelId}:${keywordIndex}`)

        modal.success({
          title: tPage('challengeGuess.modals.guessSuccess.title'),
          content: (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                {tPage('challengeGuess.modals.guessSuccess.correctAnswer')}<strong style={{ color: '#52c41a' }}>{currentKeyword}</strong>
              </p>
              <p style={{ color: '#666', marginBottom: '16px' }}>
                {tPage('ui.timeSpent', { time: formatTime(timeLeft), score })}
              </p>
              <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{tPage('challengeGuess.ui.continueChallenge')}</p>
                <p style={{ margin: '0', color: '#1890ff', fontWeight: 500 }}>
                  {tPage('ui.readyForNext')}
                </p>
              </div>
            </div>
          ),
          width: 480,
          okText: tPage('challengeGuess.modals.timeUp.continue'),
          onOk: handleNextKeyword
        })

        message.success(tPage('challengeGuess.guessCorrect', { score }))
      } else {
        // 猜测错误 - 检查是否时间结束
        const timeUp = timeLeft >= 300 // 5分钟 = 300秒

        if (timeUp) {
          // 时间结束，显示正确答案
          modal.confirm({
            title: tPage('challengeGuess.modals.timeUp.title'),
            content: (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                  {tPage('challengeGuess.modals.timeUp.yourGuess')}<strong style={{ color: '#ff4d4f' }}>{guessInput}</strong>
                </p>
                <p style={{ fontSize: '16px', marginBottom: '16px' }}>
                  {tPage('challengeGuess.modals.timeUp.correctAnswer')}<strong style={{ color: '#52c41a' }}>{currentKeyword}</strong>
                </p>
                <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{tPage('ui.challengeEnd')}</p>
                  <p style={{ margin: '0', color: '#1890ff', fontWeight: 500 }}>
                    {tPage('ui.readyForNext')}
                  </p>
                </div>
              </div>
            ),
            width: 480,
            okText: tPage('challengeGuess.modals.timeUp.continue'),
            onOk: handleNextKeyword,
            cancelText: tPage('challengeGuess.modals.timeUp.cancel'),
            onCancel: () => {
              // 重置状态，重新开始这一题
              setGuessInput('')
              setTimeLeft(0)
              setSketchSteps([])
              setCurrentStepIndex(0)
              setLoading(true)
              loadedKeywordRef.current = '' // 重置加载标记
            }
          })
          message.warning('时间到！正确答案已显示')
        } else {
          // 时间未结束，只显示猜错了
          modal.confirm({
            title: tPage('challengeGuess.modals.guessWrong.title'),
            content: (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                  {tPage('challengeGuess.modals.guessWrong.yourGuess')}<strong style={{ color: '#ff4d4f' }}>{guessInput}</strong>
                </p>
                <p style={{ color: '#666', marginBottom: '16px' }}>
                  {tPage('challengeGuess.modals.guessWrong.timeRemaining')}<strong style={{ color: '#faad14' }}>{formatTime(300 - timeLeft)}</strong>
                </p>
                <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{tPage('challengeGuess.ui.continueChallenge')}</p>
                  <ul style={{ margin: '0 0 0 16px', paddingLeft: '8px', textAlign: 'left' }}>
                    <li>{tPage('ui.tips.observe')}</li>
                    <li>{tPage('ui.tips.differentAngles')}</li>
                    <li>{tPage('ui.tips.associations')}</li>
                  </ul>
                  <p style={{ margin: '8px 0 0 0', color: '#1890ff', fontWeight: 500 }}>
                    {tPage('ui.readyForNext')}
                  </p>
                </div>
              </div>
            ),
            width: 480,
            okText: tPage('challengeGuess.modals.guessWrong.continueButton'),
            onOk: () => {
              setGuessInput('')
              // 不需要清空画板，让用户继续观察简笔画
            },
            cancelText: tPage('challengeGuess.guessInput.skipButton'),
            onCancel: handleNextKeyword
          })
          message.warning(tPage('challengeGuess.guessWrong'))
        }
      }

    } catch (error) {
      console.error('💥 提交猜词失败:', error)

      let errorMessage = '提交失败，请稍后重试'
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = '无法连接到服务器，请检查网络连接'
        } else {
          error.message
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
              <strong>{tPage('ui.errorInfo')}</strong>
              <p style={{ margin: '4px 0 0 0', color: '#ff4d4f', whiteSpace: 'pre-wrap' }}>
                {errorMessage}
              </p>
            </div>
            <p style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
              请检查网络连接
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
  }  // 下一题
  const handleNextKeyword = () => {
    if (!levelConfig) {
      message.warning(tPage('challengeGuess.levelNotFound'))
      navigate('/app/level-set-guess')
      return
    }

    const totalKeywords = shuffledKeywords.length
    const nextIndex = keywordIndex + 1

    if (nextIndex >= totalKeywords) {
      // 已经是最后一个关键词，恭喜完成该关卡
      console.log(`🎯 完成关卡: ${levelId}, 本关得分: ${levelScore}`)
      
      markLevelCompleted(levelId)
      
      // 先获取旧的总得分
      const oldTotalScore = getTotalScore()
      console.log(`📊 保存前的总得分: ${oldTotalScore}`)
      
      // 保存本关得分
      saveLevelScore(levelId, levelScore)
      
      // 重新获取总得分（应该包含刚保存的得分）
      const newTotalScore = getTotalScore()
      console.log(`📊 保存后的总得分: ${newTotalScore}`)
      
      modal.success({
        title: tPage('challengeGuess.modals.levelComplete.title'),
        content: (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
            <p style={{ fontSize: '18px', marginBottom: '12px' }}>
              {tPage('challengeGuess.modals.levelComplete.congratulations', { title: getDisplayLevelText(levelConfig?.title) })}
            </p>
            <div style={{ 
              background: '#f6ffed', 
              border: '1px solid #b7eb8f', 
              borderRadius: '8px', 
              padding: '16px',
              marginBottom: '16px'
            }}>
              <p style={{ fontSize: '16px', margin: '0 0 8px 0', fontWeight: 500 }}>
                📊 挑战统计：
              </p>
              <p style={{ fontSize: '14px', margin: '0 0 4px 0', color: '#666' }}>
                💰 {tPage('challengeGuess.ui.levelScore', { score: levelScore })}
              </p>
              <p style={{ fontSize: '14px', margin: '0', color: '#666' }}>
                🏆 {tPage('challengeGuess.ui.totalScore', { score: newTotalScore })}
              </p>
            </div>
            <p style={{ color: '#666', fontSize: '14px' }}>
              继续挑战更多关卡，提升您的猜词技巧吧！
            </p>
          </div>
        ),
        width: 500,
        okText: tPage('challengeGuess.modals.levelComplete.backToLevels'),
        onOk: () => {
          navigate('/app/level-set-guess')
        }
      })
      
      message.success(tPage('challengeGuess.levelCompleted', { title: getDisplayLevelText(levelConfig?.title), score: levelScore }))
      return
    }

    // 重置状态
    drawBoardRef.current?.clearCanvas()
    setGuessInput('')
    setTimeLeft(0) // 重置累加计时
    setSketchSteps([])
    setCurrentStepIndex(0)
    setLoading(true)
    setCandidateWords([]) // 重置候选词列表
    loadedKeywordRef.current = '' // 重置加载标记
    // 注意：不重置levelScore，保持关卡内积分累计

    // 跳转到下一个关键词
    navigate(`/app/challenge-guess?level=${levelId}&keywordIndex=${nextIndex}`)
    message.info(tPage('challengeGuess.nextQuestion', { current: nextIndex + 1, total: shuffledKeywords.length }))
  }

  // 快进时间
  const handleFastForward = () => {
    const fastForwardAmount = 5 // 快进5秒
    setTimeLeft(prev => Math.min(prev + fastForwardAmount, 300)) // 最多到300秒
    
    // 同时快进画面显示（每5秒对应1步）
    setCurrentStepIndex(prev => Math.min(prev + 1, sketchSteps.length - 1))
    
    message.success(tPage('challengeGuess.guessInput.fastForwardSuccess', { seconds: fastForwardAmount }))
  }

  // 跳过游戏
  const handleSkipChallenge = () => {
    message.info(tPage('challengeGuess.skipQuestion', { current: keywordIndex + 1, total: shuffledKeywords.length }))

    // 显示正确答案
    modal.info({
      title: tPage('challengeGuess.modals.skip.title'),
      content: (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>
            {tPage('challengeGuess.modals.skip.correctAnswer')}<strong style={{ color: '#1890ff' }}>{currentKeyword}</strong>
          </p>
          <p style={{ color: '#666' }}>
            {tPage('challengeGuess.modals.skip.continueMessage')}
          </p>
        </div>
      ),
      okText: '继续下一题',
      onOk: handleNextKeyword
    })
  }

  // 画板绘制回调（暂时不需要）
  const handleDraw = () => {
    // 可以在这里添加实时识别等功能
  }

  // 根据 levelId 和 keywordIndex 生成候选词顺序（稳定且不会与原序列一致）
  useEffect(() => {
    if (!shuffledKeywords || shuffledKeywords.length === 0) {
      setCandidateWords([])
      return
    }

    const seed = stableHash(`${levelId}:${keywordIndex}`)
    let newCandidates = seededShuffle(shuffledKeywords, seed)

    // 如果意外与原序列完全一致，旋转一次保证不同
    if (newCandidates.length > 1 && newCandidates.every((v, i) => v === shuffledKeywords[i])) {
      newCandidates = [...newCandidates.slice(1), newCandidates[0]]
    }

    setCandidateWords(newCandidates)
  }, [levelId, keywordIndex, shuffledKeywords])

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 计算积分（基于用时）
  const calculateScore = (timeSpent: number): number => {
    if (timeSpent <= 120) { // 2分钟内
      return 5
    } else if (timeSpent <= 1800) { // 30分钟内
      return 3
    } else { // 超过30分钟
      return 1
    }
  }

  // 获取当前绘画进度
  const getDrawingProgress = () => {
    if (sketchSteps.length === 0) return { current: 0, total: 20 }
    return {
      current: Math.min(currentStepIndex + 1, sketchSteps.length),
      total: sketchSteps.length
    }
  }

  // 获取候选词提示内容
  const getCandidateWordsHint = () => {
    return (
      <div className="candidate-list-wrapper">
        <div className="candidate-list-inner">
          <div className="candidate-list-title">📝 {tPage('challengeGuess.ui.candidateWords')}</div>
          <div className="candidate-list-grid">
            {candidateWords.map((word, index) => (
              <div key={index} className="candidate-list-item">
                {index + 1}. {word}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      {isDesktop ? (
        // 桌面端布局：左右分开
        <div className="challenge-guess-container desktop-layout">
          {/* 左侧面板 */}
          <div className="challenge-guess-left-panel">
            {/* 标题区域 */}
            <div className="challenge-guess-title-section">
              <div className="challenge-guess-level-info">
                <span className="challenge-level-icon">{levelConfig?.icon || '🎯'}</span>
                <h1 className="challenge-guess-page-title">{getDisplayLevelText(levelConfig?.title) || tPage('pageTitle')}</h1>
              </div>
            </div>

            {/* 倒计时区域 */}
            <div className="challenge-guess-timer">
              <div className="challenge-timer-display">
                <div className="timer-stats">
                  <div className="timer-item">
                    <ClockCircleOutlined />
                    <span className={`timer-text ${timeLeft >= 240 ? 'timer-warning' : ''}`}>
                      {formatTime(timeLeft)}/5:00
                    </span>
                  </div>
                  <div className="timer-item">
                    <span className="challenge-progress-text">
                      第 {keywordIndex + 1} / {shuffledKeywords.length} 题
                    </span>
                  </div>
                  <div className="timer-item">
                    <span className="challenge-score-text">
                      💰 {levelScore} 分
                    </span>
                  </div>
                  {!loading && (
                    <div className="timer-item">
                      <span className="challenge-drawing-progress">
                        🎨 {getDrawingProgress().current}/{getDrawingProgress().total}
                        <Tooltip classNames={{ root: "candidate-tooltip" }} title={getCandidateWordsHint()}>
                          <QuestionCircleOutlined 
                            style={{ marginLeft: '8px', cursor: 'help', color: '#1890ff' }}
                          />
                        </Tooltip>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 输入区域 */}
            <div className="challenge-guess-input-section">
              <div className="guess-input-container">
                <Input
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder={tPage('challengeGuess.guessInput.placeholder')}
                  size="large"
                  onPressEnter={handleSubmitGuess}
                  disabled={submitting}
                  className="guess-input"
                />
                <Button
                  type="primary"
                  size="large"
                  onClick={handleSubmitGuess}
                  loading={submitting}
                  disabled={submitting || !guessInput.trim()}
                  className="submit-guess-button"
                >
                  {submitting ? tPage('challengeGuess.guessInput.submitting') : tPage('challengeGuess.guessInput.button')}
                </Button>
              </div>
              <Button
                size="large"
                onClick={handleFastForward}
                disabled={submitting || timeLeft >= 300}
                className="fast-forward-button"
                style={{ marginBottom: '8px' }}
              >
                {tPage('challengeGuess.guessInput.fastForwardButton')}
              </Button>
              <Button
                size="large"
                onClick={handleSkipChallenge}
                disabled={submitting}
                className="skip-challenge-button"
              >
                {tPage('challengeGuess.guessInput.skipButton')}
              </Button>
            </div>

            {/* 版权声明 - 放在左侧面板底部 */}
            <AppFooter className="app-footer-light desktop-footer" />
          </div>

          {/* 右侧画板区域 */}
          <div className="challenge-guess-content">
            {loading ? (
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                gap: '1rem'
              }}>
                <Spin size="large" className="custom-spin" />
                <div style={{ 
                  fontSize: '1.2rem', 
                  color: 'white', 
                  fontWeight: 500,
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  {tPage('challengeGuess.loading')}
                </div>
              </div>
            ) : (
              <MobileDrawBoard
                ref={drawBoardRef}
                onDraw={handleDraw}
                hideColorPicker={true}
                readOnly={true}
                displayImage={currentDisplayImage}
              />
            )}
          </div>
        </div>
      ) : (
        // 移动端布局：竖向
        <div className="challenge-guess-container mobile-layout">
          {/* 标题区域 */}
          <div className="challenge-guess-title-section">
            <div className="challenge-guess-level-info">
              <span className="challenge-level-icon">{levelConfig?.icon || '🎯'}</span>
              <h1 className="challenge-guess-page-title">{getDisplayLevelText(levelConfig?.title) || tPage('pageTitle')}</h1>
            </div>
          </div>

          {/* 倒计时区域 */}
          <div className="challenge-guess-timer">
            <div className="challenge-timer-display">
              <div className="timer-left">
                <ClockCircleOutlined style={{ marginRight: '8px' }} />
                <span className={`timer-text ${timeLeft >= 240 ? 'timer-warning' : ''}`}>
                  {tPage('challengeGuess.ui.time', { time: formatTime(timeLeft) })}
                </span>
              </div>
              <div className="timer-center">
                <span className="challenge-progress-text">
                  {tPage('challengeGuess.ui.progress', { current: keywordIndex + 1, total: shuffledKeywords.length })}
                </span>
              </div>
              <div className="timer-right">
                <span className="challenge-score-text">
                  {tPage('challengeGuess.ui.score', { score: levelScore })}
                </span>
                {!loading && (
                  <span className="challenge-drawing-progress">
                    🎨 {getDrawingProgress().current}/{getDrawingProgress().total}
                    <Tooltip classNames={{ root: "candidate-tooltip" }} title={getCandidateWordsHint()}>
                      <QuestionCircleOutlined 
                        style={{ marginLeft: '4px', cursor: 'help', color: '#1890ff', fontSize: '14px' }}
                      />
                    </Tooltip>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 画板区域 - 占据中间大部分空间 */}
          <div className="challenge-guess-content">
            {loading ? (
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                gap: '1rem'
              }}>
                <Spin size="large" className="custom-spin" />
                <div style={{ 
                  fontSize: '1.2rem', 
                  color: 'white', 
                  fontWeight: 500,
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  {tPage('challengeGuess.loading')}
                </div>
              </div>
            ) : (
              <MobileDrawBoard
                ref={drawBoardRef}
                onDraw={handleDraw}
                hideColorPicker={true}
                readOnly={true}
                displayImage={currentDisplayImage}
              />
            )}
          </div>

          {/* 输入区域 */}
          <div className="challenge-guess-input-section">
            <div className="guess-input-container">
              <Input
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder={tPage('challengeGuess.guessInput.placeholder')}
                size="large"
                onPressEnter={handleSubmitGuess}
                disabled={submitting}
                className="guess-input"
              />
              <Button
                type="primary"
                size="large"
                onClick={handleSubmitGuess}
                loading={submitting}
                disabled={submitting || !guessInput.trim()}
                className="submit-guess-button"
              >
                {submitting ? tPage('challengeGuess.guessInput.submitting') : tPage('challengeGuess.guessInput.button')}
              </Button>
            </div>
            <div className="mobile-action-buttons">
              <Button
                size="large"
                onClick={handleFastForward}
                disabled={submitting || timeLeft >= 300}
                className="fast-forward-button"
              >
                {tPage('challengeGuess.guessInput.fastForwardButton')}
              </Button>
              <Button
                size="large"
                onClick={handleSkipChallenge}
                disabled={submitting}
                className="skip-challenge-button"
              >
                {tPage('challengeGuess.guessInput.skipButton')}
              </Button>
            </div>
          </div>

          <AppFooter className="app-footer-light" />
        </div>
      )}
    </>
  )
}

export default ChallengeGuess