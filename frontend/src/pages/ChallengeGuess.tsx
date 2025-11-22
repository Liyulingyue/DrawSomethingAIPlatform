import { useRef, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, App, Input } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import MobileDrawBoard, { type MobileDrawBoardRef } from '../components/MobileDrawBoard'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { getGuessLevelById, getShuffledKeywords } from '../config/guessLevels'
import { api } from '../utils/api'
import { getAIConfig } from '../utils/aiConfig'
import { generateSketch } from '../utils/sketchApi'
import './ChallengeGuess.css'

// 本地存储 key
const COMPLETED_GUESS_LEVELS_KEY = 'completed_guess_levels'

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
  const navigate = useNavigate()
  const location = useLocation()

  // 解析URL参数
  const searchParams = new URLSearchParams(location.search)
  const levelId = searchParams.get('level') || ''
  const keywordIndexStr = searchParams.get('keywordIndex') || '0'
  const keywordIndex = parseInt(keywordIndexStr, 10)

  // 获取关卡配置
  const levelConfig = getGuessLevelById(levelId)

  // 获取当前关键词
  const shuffledKeywords = getShuffledKeywords(levelId)
  const currentKeyword = shuffledKeywords[keywordIndex] || ''

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
        const result = await generateSketch({
          prompt: currentKeyword,
          max_steps: 20,
          sort_method: 'position'
        })
        
        if (cancelled) {
          console.log('🚫 请求已取消')
          return
        }
        
        console.log(`✅ 简笔画生成成功，共 ${result.total_steps} 步`)
        setSketchSteps(result.steps)
        setCurrentStepIndex(0)
        loadedKeywordRef.current = currentKeyword // 标记已加载
      } catch (error) {
        if (!cancelled) {
          console.error('💥 生成简笔画失败:', error)
          message.error('生成简笔画失败，请稍后重试')
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
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev >= 300) { // 最大5分钟
          return 300
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 提交猜测
  const handleSubmitGuess = async () => {
    if (!guessInput.trim()) {
      message.warning('请输入您的猜测')
      return
    }

    if (!currentKeyword) {
      message.error('未找到当前关键词')
      return
    }

    const image = drawBoardRef.current?.getImage()
    if (!image) {
      message.error('无法获取画作')
      return
    }

    setSubmitting(true)

    try {
      const aiConfig = getAIConfig()
      if (!aiConfig) {
        message.error('请先配置AI服务')
        return
      }

      // 调用AI识别API
      const response = await api.post('/ai/recognize', {
        image: image,
        model: aiConfig.modelName || 'ernie-4.5-vl-28b-a3b'
      })

      const result = response.data
      console.log('🎯 AI识别结果:', result)

      // 检查用户猜测是否正确
      const userGuess = guessInput.trim().toLowerCase()
      const correctAnswer = currentKeyword.toLowerCase()
      const isCorrect = userGuess === correctAnswer

      if (isCorrect) {
        // 猜测正确
        markLevelCompleted(`${levelId}:${keywordIndex}`)

        modal.success({
          title: '🎉 恭喜猜对！',
          content: (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                正确答案：<strong style={{ color: '#52c41a' }}>{currentKeyword}</strong>
              </p>
              <p style={{ color: '#666', marginBottom: '16px' }}>
                AI识别结果：{result.guess || '未识别'}
              </p>
              <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>💡 继续挑战：</p>
                <p style={{ margin: '0', color: '#1890ff', fontWeight: 500 }}>
                  🎨 准备好迎接下一题挑战了吗？
                </p>
              </div>
            </div>
          ),
          width: 480,
          okText: '继续挑战',
          onOk: handleNextKeyword
        })

        message.success('🎉 恭喜猜对！')
      } else {
        // 猜测错误
        modal.confirm({
          title: '❌ 猜错了',
          content: (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                您的猜测：<strong style={{ color: '#ff4d4f' }}>{guessInput}</strong>
              </p>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                AI识别结果：<strong style={{ color: '#1890ff' }}>{result.guess || '未识别'}</strong>
              </p>
              <p style={{ color: '#666', marginBottom: '16px' }}>
                正确答案：<strong style={{ color: '#52c41a' }}>{currentKeyword}</strong>
              </p>
              <div style={{ margin: '12px 0 0 0', color: '#666', fontSize: '14px' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>💡 改进建议：</p>
                <ul style={{ margin: '0 0 0 16px', paddingLeft: '8px', textAlign: 'left' }}>
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
          okText: '继续挑战',
          onOk: () => {
            setGuessInput('')
            // 不需要清空画板，让用户继续看简笔画
          },
          cancelText: '跳过此题',
          onCancel: handleNextKeyword
        })
        message.warning('猜错了，再试一次吧！')
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
              <strong>错误信息：</strong>
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

  // 下一题
  const handleNextKeyword = () => {
    if (!levelConfig) {
      message.warning('关卡配置未找到')
      navigate('/app/level-set-guess')
      return
    }

    const totalKeywords = shuffledKeywords.length
    const nextIndex = keywordIndex + 1

    if (nextIndex >= totalKeywords) {
      // 已经是最后一个关键词，恭喜完成该关卡
      markLevelCompleted(levelId)
      message.success(`🎉 恭喜完成【${levelConfig.title}】关卡所有挑战！`)
      navigate('/app/level-set-guess')
      return
    }

    // 重置状态
    drawBoardRef.current?.clearCanvas()
    setGuessInput('')
    setTimeLeft(0) // 重置累加计时
    setSketchSteps([])
    setCurrentStepIndex(0)
    setLoading(true)
    loadedKeywordRef.current = '' // 重置加载标记

    // 跳转到下一个关键词
    navigate(`/app/challenge-guess?level=${levelId}&keywordIndex=${nextIndex}`)
    message.info(`进入下一题 (${nextIndex + 1}/${totalKeywords})`)
  }

  // 跳过游戏
  const handleSkipChallenge = () => {
    const totalKeywords = shuffledKeywords.length
    message.info(`跳过第 ${keywordIndex + 1} 题 (${keywordIndex + 1}/${totalKeywords})`)

    // 显示正确答案
    modal.info({
      title: '正确答案',
      content: (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>
            正确答案是：<strong style={{ color: '#1890ff' }}>{currentKeyword}</strong>
          </p>
          <p style={{ color: '#666' }}>
            继续挑战下一题吧！
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

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      <div className="challenge-guess-container">
        {/* 标题区域 */}
        <div className="challenge-guess-title-section">
          <div className="challenge-guess-level-info">
            <span className="challenge-level-icon">{levelConfig?.icon || '🎯'}</span>
            <h1 className="challenge-guess-page-title">{levelConfig?.title || '猜词闯关'}</h1>
          </div>
        </div>

        {/* 倒计时区域 */}
        <div className="challenge-guess-timer">
          <div className="challenge-timer-display">
            <ClockCircleOutlined style={{ marginRight: '8px' }} />
            <span className={`timer-text ${timeLeft >= 240 ? 'timer-warning' : ''}`}>
              {formatTime(timeLeft)}/5:00
            </span>
            <span className="challenge-progress-text">
              第 {keywordIndex + 1} / {shuffledKeywords.length} 题
            </span>
          </div>
        </div>

        {/* 画板区域 - 占据中间大部分空间 */}
        <div className="challenge-guess-content">
          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              fontSize: '16px',
              color: '#666'
            }}>
              正在生成简笔画...
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
              placeholder="输入您对画作的猜测..."
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
              {submitting ? '识别中...' : '发送'}
            </Button>
          </div>
          <Button
            size="large"
            onClick={handleSkipChallenge}
            disabled={submitting}
            className="skip-challenge-button"
          >
            跳过此题
          </Button>
        </div>

        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default ChallengeGuess