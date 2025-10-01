import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout, message } from 'antd'
import Navbar from '../components/Navbar'
import MultiplayerView from '../components/drawing/MultiplayerView'
import { useDrawingRoom } from '../hooks/useDrawingRoom'
import './DrawingRoom.css'

const { Content } = Layout

const DEFAULT_MODEL_PROMPT = ''

const DEFAULT_MODEL_CONFIG = {
  url: 'https://aistudio.baidu.com/llm/lmapi/v3',
  key: '',
  model: 'ernie-4.5-vl-28b-a3b',
  prompt: DEFAULT_MODEL_PROMPT,
}

const MODEL_CONFIG_STORAGE_KEY = 'drawing-multiplayer-model-config'

function MultiplayerGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const {
    roomId,
    username,
    loading,
    initializing,
    drawingState,
    combined,
    messages,
    isReady,
    readyStatus,
    actions,
    state,
  } = useDrawingRoom({ allowNoRoom: true })

  const [modelConfig, setModelConfig] = useState(() => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_MODEL_CONFIG }
    }
    try {
      const stored = window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<typeof DEFAULT_MODEL_CONFIG>
        return {
          ...DEFAULT_MODEL_CONFIG,
          ...parsed,
        }
      }
    } catch (error) {
      console.warn('解析多人模型配置失败，使用默认值', error)
    }
    return { ...DEFAULT_MODEL_CONFIG }
  })

  const [isLocked, setIsLocked] = useState(false)
  const [isPrepared, setIsPrepared] = useState(false)

  const [messageApi, contextHolder] = message.useMessage()

  const handleModelConfigChange = (patch: Partial<typeof DEFAULT_MODEL_CONFIG>) => {
    setModelConfig((prev) => ({
      ...prev,
      ...patch,
    }))
  }

  const handleLock = () => {
    if (!modelConfig.key.trim()) {
      messageApi.warning('请先配置API密钥')
      return
    }
    setIsLocked(true)
    messageApi.success('配置已锁定')
  }

  const handleUnlock = () => {
    if (isPrepared) {
      messageApi.warning('请先解除整备，再解锁配置')
      return
    }
    setIsLocked(false)
    messageApi.success('配置已解锁，可以编辑')
  }

  const handlePrepare = async () => {
    if (!isLocked) {
      messageApi.warning('请先锁定配置')
      return
    }
    setIsPrepared(true)
    await actions.setReady(true)
    messageApi.success('已整备完毕')
  }

  const handleUnprepare = async () => {
    if (status === 'drawing' || status === 'success' || status === 'review') {
      messageApi.warning('游戏已开始，无法解除整备')
      return
    }
    setIsPrepared(false)
    await actions.setReady(false)
    messageApi.success('已解除整备')
  }

  const handleGuess = async (image: string) => {
    if (!isLocked) {
      messageApi.warning('请先锁定配置')
      return
    }
    messageApi.info('正在进行AI猜词...')
    console.log('进行AI猜词，图像数据：', image.substring(0, 50) + '...')
  }

  useEffect(() => {
    if (tabParam === 'single') {
      navigate('/game/single', { replace: true })
    }
  }, [navigate, tabParam])

  const lastSyncedTarget = useRef('')
  const lastSyncedClue = useRef('')

  const [targetInput, setTargetInput] = useState('')
  const [chatInput, setChatInput] = useState('')

  useEffect(() => {
    const serverTarget = drawingState?.current_target ?? drawingState?.current_hint ?? ''
    if (serverTarget !== lastSyncedTarget.current) {
      setTargetInput(serverTarget ?? '')
      lastSyncedTarget.current = serverTarget ?? ''
    }
    const serverClue = drawingState?.current_clue ?? ''
    if (serverClue !== lastSyncedClue.current) {
      lastSyncedClue.current = serverClue
    }
  }, [drawingState?.current_target, drawingState?.current_hint, drawingState?.current_clue])

  const players = combined?.players ?? []
  const owner = combined?.owner ?? null
  const status = combined?.status ?? 'waiting'
  const currentDrawer = combined?.current_drawer ?? null
  const currentRound = combined?.current_round ?? 0
  const currentTarget = drawingState?.current_target ?? drawingState?.current_hint ?? ''
  const currentClue = drawingState?.current_clue ?? ''
  const guess = drawingState?.ai_result ?? null
  const currentSubmission = drawingState?.current_submission ?? null
  const history = drawingState?.draw_history ?? []
  const scores = drawingState?.scores ?? {}
  const currentDrawing = drawingState?.current_drawing ?? null

  const statusDescription = useMemo(() => {
    switch (status) {
      case 'ready':
        return '所有成员整备完毕，房主可随时开始本回合。'
      case 'drawing':
        return currentDrawer ? `${currentDrawer} 正在绘制作品，提交后 AI 将立即给出猜词。` : '绘画阶段进行中。'
      case 'success':
        return guess?.matched
          ? `AI 已正确猜出「${guess.matched_with ?? guess.best_guess ?? '目标词'}」，任务完成！`
          : '本回合已标记成功。'
      case 'review':
        return 'AI 尚未猜中，请继续补充细节或重绘后再次提交。'
      default:
        return '设置提示词、指定绘画者并等待所有玩家整备，便可开启新一轮合作。'
    }
  }, [status, currentDrawer, guess?.matched, guess?.matched_with, guess?.best_guess])

  const handleToggleReady = async () => {
    await actions.setReady(!isReady)
  }

  const handleConfigureRound = async () => {
    const trimmedTarget = targetInput.trim()
    if (!trimmedTarget) {
      messageApi.error('提示词不能为空')
      return
    }
    lastSyncedTarget.current = trimmedTarget
    await actions.configureRound(trimmedTarget, undefined)
  }

  const handleStartRound = async () => {
    // 检查是否有成员未整备
    const unpreparedPlayers = players.filter(player => !readyStatus[player])
    if (unpreparedPlayers.length > 0) {
      messageApi.warning(`${unpreparedPlayers.join('、')}未整备`)
      return
    }
    await actions.startRound()
  }

  const handleResetRound = async () => {
    await actions.resetRound()
  }

  const handleSubmitDrawing = async (image: string) => {
    await actions.submitDrawing(image)
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim()) {
      messageApi.warning('请输入聊天内容')
      return
    }
    await actions.sendMessage(chatInput)
    setChatInput('')
  }

  const handleGuessWord = async (guess: string) => {
    await actions.guess(guess)
  }

  const handleSkipGuess = async () => {
    await actions.skipGuess()
  }

  const handleResetScores = async () => {
    // 这里可能需要后端API来重置积分
    messageApi.info('重置积分功能待实现')
  }

  const handleLeaveRoom = async () => {
    await actions.leaveRoom()
  }

  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSendMessage()
    }
  }

  const hasRoomData = Boolean(combined)

  return (
    <Layout className="drawing-layout">
      {contextHolder}
      <Navbar />
      <Content className="drawing-content">
        <div className="drawing-container">
          <MultiplayerView
            loading={loading}
            initializing={initializing}
            hasRoomData={hasRoomData}
            roomId={roomId || null}
            owner={owner}
            status={status}
            players={players}
            currentDrawer={currentDrawer}
            currentRound={currentRound}
            currentTarget={currentTarget}
            guess={guess}
            currentSubmission={currentSubmission}
            history={history}
            messages={messages}
            scores={scores}
            username={username}
            isReady={isReady}
            readyStatus={readyStatus}
            statusDescription={statusDescription}
            targetInput={targetInput}
            chatInput={chatInput}
            guessStatus={drawingState?.guess_status?.[username || ''] || 'pending'}
            currentDrawing={currentDrawing}
            state={state}
            modelConfig={modelConfig}
            isLocked={isLocked}
            isPrepared={isPrepared}
            onModelConfigChange={handleModelConfigChange}
            onLock={handleLock}
            onUnlock={handleUnlock}
            onPrepare={handlePrepare}
            onUnprepare={handleUnprepare}
            onGuess={handleGuess}
            onGuessWord={handleGuessWord}
            onSkipGuess={handleSkipGuess}
            onSyncDrawing={actions.syncDrawing}
            onTargetInputChange={setTargetInput}
            onChatInputChange={setChatInput}
            onChatKeyDown={handleChatKeyDown}
            onToggleReady={() => {
              void handleToggleReady()
            }}
            onConfigureRound={() => {
              void handleConfigureRound()
            }}
            onResetScores={() => {
              void handleResetScores()
            }}
            onStartRound={() => {
              void handleStartRound()
            }}
            onResetRound={() => {
              void handleResetRound()
            }}
            onSubmitDrawing={(image) => {
              void handleSubmitDrawing(image)
            }}
            onSendMessage={() => {
              void handleSendMessage()
            }}
            onLeaveRoom={() => {
              void handleLeaveRoom()
            }}
          />
        </div>
      </Content>
    </Layout>
  )
}

export default MultiplayerGame
