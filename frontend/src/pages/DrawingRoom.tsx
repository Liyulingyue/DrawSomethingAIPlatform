export { default } from './MultiplayerGame'

// Legacy DrawingRoom implementation retained for reference.
/*
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layout, message } from 'antd'
import Navbar from '../components/Navbar'
import { useUser } from '../context/UserContext'
import SingleTester, { type ModelConfig, type SingleHistoryEntry } from '../components/drawing/SingleTester'
import MultiplayerView from '../components/drawing/MultiplayerView'
import { api } from '../utils/api'
import './DrawingRoom.css'

const { Content } = Layout

const DEFAULT_MODEL_PROMPT = ''

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  url: 'https://aistudio.baidu.com/llm/lmapi/v3',
  key: '',
  model: 'ernie-4.5-vl-28b-a3b',
  prompt: DEFAULT_MODEL_PROMPT,
}

const MODEL_CONFIG_STORAGE_KEY = 'drawing-single-model-config'

const sanitizeModelConfig = (config: ModelConfig) => ({
  url: config.url.trim(),
  key: config.key.trim(),
  model: config.model.trim(),
  prompt: config.prompt.trim(),
})

function normalizeGuessPayload(raw: unknown): GuessPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const data = raw as Record<string, unknown>
  const bestGuessValue = data.best_guess ?? data.label ?? data.text ?? null
  const best_guess =
    typeof bestGuessValue === 'string'
      ? bestGuessValue
      : bestGuessValue != null
        ? String(bestGuessValue)
        : null

  const alternativesRaw = data.alternatives
  const alternatives = Array.isArray(alternativesRaw)
    ? alternativesRaw.map((item) => (typeof item === 'string' ? item : String(item))).filter(Boolean)
    : alternativesRaw != null
      ? [String(alternativesRaw)]
      : []

  // Note: confidence is no longer used

  const matchedRaw = data.matched
  const matched = typeof matchedRaw === 'boolean' ? matchedRaw : undefined

  const matchedWithRaw = data.matched_with
  const matched_with = typeof matchedWithRaw === 'string' ? matchedWithRaw : undefined

  const targetRaw = data.target
  const target_word = typeof targetRaw === 'string' ? targetRaw : undefined

  return {
    ...(raw as GuessPayload),
    best_guess,
    alternatives,
    matched,
    matched_with,
    target_word,
  }
}

function DrawingRoom() {
  const [searchParams, setSearchParams] = useSearchParams()
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
  const { sessionId } = useUser()

  const lastSyncedTarget = useRef('')
  const lastSyncedClue = useRef('')

  const [targetInput, setTargetInput] = useState('')
  const [clueInput, setClueInput] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [singleTarget, setSingleTarget] = useState('')
  const [singleResult, setSingleResult] = useState<GuessPayload | null>(null)
  const [singleHistory, setSingleHistory] = useState<SingleHistoryEntry[]>([])
  const [singleSubmitting, setSingleSubmitting] = useState(false)
  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_MODEL_CONFIG }
    }
    try {
      const stored = window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ModelConfig>
        return {
          ...DEFAULT_MODEL_CONFIG,
          ...parsed,
        }
      }
    } catch (error) {
      console.warn('解析单人模型配置失败，使用默认值', error)
    }
    return { ...DEFAULT_MODEL_CONFIG }
  })

  useEffect(() => {
    const serverTarget = drawingState?.current_target ?? drawingState?.current_hint ?? ''
    if (serverTarget !== lastSyncedTarget.current) {
      setTargetInput(serverTarget ?? '')
      lastSyncedTarget.current = serverTarget ?? ''
    }
    const serverClue = drawingState?.current_clue ?? ''
    if (serverClue !== lastSyncedClue.current) {
      setClueInput(serverClue ?? '')
      lastSyncedClue.current = serverClue ?? ''
    }
  }, [drawingState?.current_target, drawingState?.current_hint, drawingState?.current_clue])

  const tabParam = searchParams.get('tab')
  const searchParamsString = searchParams.toString()
  const isSingleView = tabParam === 'single' || (!roomId && !tabParam)

  useEffect(() => {
    if (!roomId && tabParam !== 'single') {
      const nextParams = new URLSearchParams(searchParamsString)
      nextParams.set('tab', 'single')
      setSearchParams(nextParams, { replace: true })
    }
  }, [roomId, tabParam, searchParamsString, setSearchParams])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(modelConfig))
    } catch (error) {
      console.warn('保存单人模型配置失败', error)
    }
  }, [modelConfig])

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

  const sanitizedCurrentModelConfig = useMemo(() => sanitizeModelConfig(modelConfig), [modelConfig])

  const handleModelConfigChange = (patch: Partial<ModelConfig>) => {
    setModelConfig((prev) => ({
      ...prev,
      ...patch,
    }))
  }

  const handleToggleReady = async () => {
    await actions.setReady(!isReady)
  }

  const handleConfigureRound = async () => {
    const trimmedTarget = targetInput.trim()
    const trimmedClue = clueInput.trim()
    if (!trimmedTarget) {
      message.error('提示词不能为空')
      return
    }
    lastSyncedTarget.current = trimmedTarget
    lastSyncedClue.current = trimmedClue
    await actions.configureRound(trimmedTarget, trimmedClue || undefined)
  }

  const handleSelectDrawer = async (value: string) => {
    await actions.selectDrawer(value)
  }

  const handleStartRound = async () => {
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
      message.warning('请输入聊天内容')
      return
    }
    await actions.sendMessage(chatInput)
    setChatInput('')
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

  const handleSingleSubmit = async (image: string) => {
    setSingleSubmitting(true)
    try {
      const requestBody: {
        image: string
        target?: string
        config?: {
          url?: string
          key?: string
          model?: string
          prompt?: string
        }
        session_id?: string
      } = {
        image,
        target: singleTarget.trim() || undefined,
        session_id: sessionId,
      }

      const configPayload: {
        url?: string
        key?: string
        model?: string
        prompt?: string
      } = {}

      if (sanitizedCurrentModelConfig.url) {
        configPayload.url = sanitizedCurrentModelConfig.url
      }
      if (sanitizedCurrentModelConfig.key) {
        configPayload.key = sanitizedCurrentModelConfig.key
      }
      if (sanitizedCurrentModelConfig.model) {
        configPayload.model = sanitizedCurrentModelConfig.model
      }
      configPayload.prompt = sanitizedCurrentModelConfig.prompt

      requestBody.config = configPayload

      const response = await api.post('/ai/guess', requestBody)
      const normalized = normalizeGuessPayload(response.data)
      if (!normalized) {
        setSingleResult(null)
        message.warning('AI 未返回有效结果，请稍后重试')
        return
      }
      setSingleResult(normalized)
      const createdAt = Math.floor(Date.now() / 1000)
      setSingleHistory((prev) => [
        {
          id: createdAt,
          target: singleTarget.trim(),
          createdAt,
          guess: normalized,
        },
        ...prev,
      ].slice(0, 10))
      message.success('AI 猜词结果已更新')
    } catch (error) {
      console.error('单人测试失败', error)
      message.error('单人测试失败，请稍后重试')
    } finally {
      setSingleSubmitting(false)
    }
  }

  const handleResetSingle = () => {
    setSingleResult(null)
    setSingleHistory([])
    message.success('已清空单人测试记录')
  }

  const handleTestConfig = async (image: string) => {
    setSingleSubmitting(true)
    try {
      const requestBody: {
        image: string
        target?: string
        config: {
          url?: string
          key?: string
          model?: string
          prompt?: string
        }
        session_id?: string
      } = {
        image: image,
        target: singleTarget.trim() || undefined,
        config: {
          url: sanitizedCurrentModelConfig.url || undefined,
          key: sanitizedCurrentModelConfig.key || undefined,
          model: sanitizedCurrentModelConfig.model || undefined,
          prompt: sanitizedCurrentModelConfig.prompt,
        },
        session_id: sessionId,
      }

      const response = await api.post('/ai/guess', requestBody)
      const normalized = normalizeGuessPayload(response.data)
      if (!normalized) {
        setSingleResult(null)
        message.warning('AI 未返回有效结果，请检查配置')
        return
      }
      setSingleResult(normalized)
      const createdAt = Math.floor(Date.now() / 1000)
      setSingleHistory((prev) => [
        {
          id: createdAt,
          target: singleTarget.trim(),
          createdAt,
          guess: normalized,
        },
        ...prev,
      ].slice(0, 10))
      message.success('配置测试完成')
    } catch (error: any) {
      console.error('配置测试失败', error)
      const errorMessage = error?.response?.data?.error || error?.message || '未知错误'
      message.error(`配置测试失败: ${errorMessage}`)
    } finally {
      setSingleSubmitting(false)
    }
  }

  const hasRoomData = Boolean(combined)

  return (
    <Layout className="drawing-layout">
      <Navbar />
      <Content className="drawing-content">
        <div className="drawing-container">
          {isSingleView ? (
            <SingleTester
              target={singleTarget}
              onTargetChange={setSingleTarget}
              onSubmit={(image) => {
                void handleSingleSubmit(image)
              }}
              submitting={singleSubmitting}
              onReset={handleResetSingle}
              result={singleResult}
              history={singleHistory}
              modelConfig={modelConfig}
              onModelConfigChange={handleModelConfigChange}
              onTestConfig={handleTestConfig}
            />
          ) : (
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
              currentClue={currentClue}
              guess={guess}
              currentSubmission={currentSubmission}
              history={history}
              messages={messages}
              username={username}
              isReady={isReady}
              readyStatus={readyStatus}
              statusDescription={statusDescription}
              targetInput={targetInput}
              clueInput={clueInput}
              chatInput={chatInput}
              state={state}
              onTargetInputChange={setTargetInput}
              onClueInputChange={setClueInput}
              onChatInputChange={setChatInput}
              onChatKeyDown={handleChatKeyDown}
              onToggleReady={() => {
                void handleToggleReady()
              }}
              onConfigureRound={() => {
                void handleConfigureRound()
              }}
              onSelectDrawer={(value) => {
                void handleSelectDrawer(value)
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
          )}
        </div>
      </Content>
    </Layout>
  )
}

export default DrawingRoom
*/
