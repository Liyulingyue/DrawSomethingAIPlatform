import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { message } from 'antd'
import { api } from '../utils/api'
import { useUser } from '../context/UserContext'

export interface GuessPayload {
  success?: boolean
  configured?: boolean
  best_guess?: string | null
  alternatives: string[]
  matched?: boolean
  matched_with?: string | null
  error?: string | null
  timestamp?: number
  target_word?: string | null
  provider?: string
  reason?: string | null
}

export interface HumanGuessRecord {
  player: string
  guess: string
  correct: boolean
  timestamp: number
}

export interface PlayerStateSnapshot {
  username: string
  is_ready: boolean
  score: number
  guess_status: string
  model_configured: boolean
  ai_guess?: GuessPayload | null
  ai_guess_at?: number
}

export interface DrawHistoryItem {
  round: number
  target_word?: string | null
  drawer?: string | null
  submitted_at: number
  guess?: GuessPayload | null
  success: boolean
  human_guesses: HumanGuessRecord[]
  correct_players?: string[]
}

export interface SubmissionPreview {
  image: string
  submitted_by: string
  submitted_at: number
}

export interface DrawingState {
  status?: string
  current_round?: number
  current_target?: string | null
  current_clue?: string | null
  current_hint?: string | null
  current_drawer?: string | null
  ready_status?: Record<string, boolean>
  current_submission?: SubmissionPreview | null
  current_drawing?: string | null
  ai_result?: GuessPayload | null
  ai_guess?: GuessPayload | null
  draw_history?: DrawHistoryItem[]
  scores?: Record<string, number>
  guess_status?: Record<string, string>
  player_states?: Record<string, PlayerStateSnapshot>
}

export interface RoomSummary {
  players: string[]
  owner?: string | null
  status?: string
  ready_status?: Record<string, boolean>
  current_drawer?: string | null
  current_round?: number
  current_target?: string | null
  current_clue?: string | null
  current_hint?: string | null
  max_players?: number
  player_states?: Record<string, PlayerStateSnapshot>
}

export interface ChatMessage {
  username: string
  message: string
  timestamp: number
}

const POLL_INTERVAL = 4000

function normalizeGuess(raw: unknown): GuessPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const guess = raw as Record<string, unknown>
  const bestGuessValue = guess.best_guess
  const best_guess = typeof bestGuessValue === 'string'
    ? bestGuessValue
    : bestGuessValue != null
      ? String(bestGuessValue)
      : null

  const alternativesRaw = guess.alternatives
  const alternatives = Array.isArray(alternativesRaw)
    ? alternativesRaw.map((item) => (typeof item === 'string' ? item : String(item))).filter(Boolean)
    : alternativesRaw != null
      ? [String(alternativesRaw)]
      : []

  const reasonValue = guess.reason
  const reason = typeof reasonValue === 'string'
    ? reasonValue
    : reasonValue != null
      ? String(reasonValue)
      : undefined

  return {
    ...guess,
    best_guess,
    alternatives,
    reason,
  } as GuessPayload
}

function normalizeHistory(items: unknown): DrawHistoryItem[] {
  if (!Array.isArray(items)) {
    return []
  }
  return items.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      return null
    }
    const item = entry as Record<string, unknown>
    const guess = normalizeGuess(item.guess)
    const humanGuessesRaw = Array.isArray(item.human_guesses) ? item.human_guesses : []
    const human_guesses = humanGuessesRaw.map((record) => {
      if (!record || typeof record !== 'object') {
        return null
      }
      const data = record as Record<string, unknown>
      const player = typeof data.player === 'string' ? data.player : ''
      if (!player) {
        return null
      }
      return {
        player,
        guess: typeof data.guess === 'string' ? data.guess : '',
        correct: Boolean(data.correct),
        timestamp: typeof data.timestamp === 'number' ? data.timestamp : 0,
      } as HumanGuessRecord
    }).filter(Boolean) as HumanGuessRecord[]

    const correctPlayersRaw = Array.isArray(item.correct_players) ? item.correct_players : []
    const correct_players_list = correctPlayersRaw
      .map((player) => (typeof player === 'string' ? player : null))
      .filter((player): player is string => Boolean(player))

    return {
      round: typeof item.round === 'number' ? item.round : 0,
      target_word: typeof item.target_word === 'string' ? item.target_word : (typeof item.hint === 'string' ? item.hint : null),
      drawer: typeof item.drawer === 'string' ? item.drawer : undefined,
      submitted_at: typeof item.submitted_at === 'number' ? item.submitted_at : 0,
      guess,
      success: Boolean(item.success),
      human_guesses,
      correct_players: correct_players_list.length > 0 ? correct_players_list : undefined,
    } as DrawHistoryItem
  }).filter(Boolean) as DrawHistoryItem[]
}

function normalizePlayerStates(raw: unknown): Record<string, PlayerStateSnapshot> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const entries = Object.entries(raw as Record<string, unknown>)
  const result: Record<string, PlayerStateSnapshot> = {}
  for (const [username, value] of entries) {
    if (!value || typeof value !== 'object') {
      continue
    }
    const snapshot = value as Record<string, unknown>
    const normalizedGuess = normalizeGuess(snapshot.ai_guess)
    result[username] = {
      username: typeof snapshot.username === 'string' ? snapshot.username : username,
      is_ready: Boolean(snapshot.is_ready),
      score: typeof snapshot.score === 'number' ? snapshot.score : 0,
      guess_status: typeof snapshot.guess_status === 'string' ? snapshot.guess_status : 'pending',
      model_configured: Boolean(snapshot.model_configured),
      ai_guess: normalizedGuess,
      ai_guess_at: typeof snapshot.ai_guess_at === 'number' ? snapshot.ai_guess_at : undefined,
    }
  }
  return result
}

export function useDrawingRoom(options: { allowNoRoom?: boolean } = {}) {
  const { allowNoRoom = false } = options
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId') ?? ''
  const navigate = useNavigate()
  const { username, initializing, login } = useUser()

  const [room, setRoom] = useState<RoomSummary | null>(null)
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [readyLoading, setReadyLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)
  const [selectingDrawer, setSelectingDrawer] = useState(false)
  const [startingRound, setStartingRound] = useState(false)
  const [resettingRound, setResettingRound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const fetchAll = useCallback(async (withSpinner = false) => {
    if (!roomId) {
      return
    }
    if (withSpinner) {
      setLoading(true)
    }
    try {
      const [roomResp, drawingResp, messagesResp] = await Promise.all([
        api.get(`/rooms/${roomId}`),
        api.get(`/drawing/state/${roomId}`),
        api.get(`/messages/${roomId}`),
      ])

      if (roomResp.data?.success) {
        const data = roomResp.data.room ?? null
        if (data) {
          setRoom({
            ...data,
            player_states: normalizePlayerStates((data as Record<string, unknown>).player_states),
          } as RoomSummary)
        } else {
          setRoom(null)
        }
      } else if (roomResp.data?.message) {
        message.error(roomResp.data.message)
      }

      if (drawingResp.data?.success) {
        const rawState = drawingResp.data.room ?? null
        if (rawState) {
          const normalizedSharedGuess = normalizeGuess((rawState as Record<string, unknown>).ai_result ?? (rawState as Record<string, unknown>).ai_guess)
          const history = normalizeHistory(rawState.draw_history)
          const normalizedPlayerStates = normalizePlayerStates(rawState.player_states)
          setDrawingState({
            ...rawState,
            ai_result: normalizedSharedGuess,
            ai_guess: normalizedSharedGuess,
            draw_history: history,
            player_states: normalizedPlayerStates,
          })
        } else {
          setDrawingState(null)
        }
      }

      if (messagesResp.data?.success) {
        setMessages(messagesResp.data.messages ?? [])
      }
    } catch (error) {
      console.error('加载房间数据失败', error)
      message.error('加载房间数据失败，请稍后重试')
    } finally {
      if (withSpinner) {
        setLoading(false)
      }
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId && !initializing && !allowNoRoom) {
      message.warning('缺少房间ID，已返回大厅')
      navigate('/rooms', { replace: true })
    }
  }, [roomId, initializing, allowNoRoom, navigate])

  useEffect(() => {
    if (initializing) {
      return
    }

    if (!roomId) {
      if (allowNoRoom) {
        setLoading(false)
        stopPolling()
      }
      return
    }

    let active = true

    const prepare = async () => {
      if (!username) {
        const result = await login()
        if (!result.success) {
          message.error(result.message ?? '无法加入房间，请稍后再试')
          navigate('/rooms', { replace: true })
          return
        }
      }

      if (!active) {
        return
      }

      await fetchAll(true)
      if (!active) {
        return
      }

      stopPolling()
      pollTimerRef.current = setInterval(() => {
        fetchAll().catch(() => {
          // 错误已在 fetchAll 内处理
        })
      }, POLL_INTERVAL)
    }

    prepare()

    return () => {
      active = false
      stopPolling()
    }
  }, [initializing, roomId, username, login, fetchAll, navigate, stopPolling, allowNoRoom])

  const readyStatus = useMemo(() => {
    return drawingState?.ready_status ?? room?.ready_status ?? {}
  }, [drawingState?.ready_status, room?.ready_status])

  const isReady = useMemo(() => {
    if (!username) {
      return false
    }
    return readyStatus[username] ?? false
  }, [readyStatus, username])

  const setReady = useCallback(async (ready: boolean) => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    setReadyLoading(true)
    try {
      const response = await api.post('/drawing/set_ready', {
        room_id: roomId,
        username,
        ready,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '更新整备状态失败')
      } else {
        const toast = ready ? '整备完毕' : '已取消整备'
        message.success(toast)
      }
      await fetchAll()
    } catch (error) {
      console.error('更新准备状态失败', error)
      message.error('更新整备状态失败')
    } finally {
      setReadyLoading(false)
    }
  }, [roomId, username, fetchAll])

  const configureRound = useCallback(async (targetWord: string, clue?: string | null) => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    setConfigLoading(true)
    try {
      const response = await api.post('/drawing/configure', {
        room_id: roomId,
        username,
        target_word: targetWord,
        clue,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '配置提示词失败')
      } else {
        message.success('提示词已更新')
      }
      await fetchAll()
    } catch (error) {
      console.error('配置提示词失败', error)
      message.error('配置提示词失败')
    } finally {
      setConfigLoading(false)
    }
  }, [roomId, username, fetchAll])

  const selectDrawer = useCallback(async (drawer: string) => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    setSelectingDrawer(true)
    try {
      const response = await api.post('/drawing/select_drawer', {
        room_id: roomId,
        username,
        drawer,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '指定绘画者失败')
      } else {
        message.success(`已指定 ${drawer} 为绘画者`)
      }
      await fetchAll()
    } catch (error) {
      console.error('指定绘画者失败', error)
      message.error('指定绘画者失败')
    } finally {
      setSelectingDrawer(false)
    }
  }, [roomId, username, fetchAll])

  const startRound = useCallback(async () => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    setStartingRound(true)
    try {
      const response = await api.post('/drawing/start_round', {
        room_id: roomId,
        username,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '无法开始回合')
      } else {
        message.success('回合已开始，绘画者请开始创作！')
      }
      await fetchAll()
    } catch (error) {
      console.error('开始回合失败', error)
      message.error('开始回合失败')
    } finally {
      setStartingRound(false)
    }
  }, [roomId, username, fetchAll])

  const resetRound = useCallback(async () => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    setResettingRound(true)
    try {
      const response = await api.post('/drawing/reset', {
        room_id: roomId,
        username,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '重置回合失败')
      } else {
        message.success('已重置本回合')
      }
      await fetchAll()
    } catch (error) {
      console.error('重置回合失败', error)
      message.error('重置回合失败')
    } finally {
      setResettingRound(false)
    }
  }, [roomId, username, fetchAll])

  const submitDrawing = useCallback(async (image: string) => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    setSubmitting(true)
    try {
      const response = await api.post('/drawing/submit', {
        room_id: roomId,
        username,
        image,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '提交失败')
      } else {
        message.success('作品已提交，等待AI猜词')
      }
      await fetchAll()
    } catch (error) {
      console.error('提交作品失败', error)
      message.error('提交作品失败')
    } finally {
      setSubmitting(false)
    }
  }, [roomId, username, fetchAll])

  const sendMessage = useCallback(async (text: string) => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    const trimmed = text.trim()
    if (!trimmed) {
      message.warning('请输入聊天内容')
      return
    }
    setSendingMessage(true)
    try {
      const response = await api.post('/messages/send', {
        room_id: roomId,
        username,
        message: trimmed,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '发送失败')
      } else if (Array.isArray(response.data.messages)) {
        setMessages(response.data.messages)
      }
    } catch (error) {
      console.error('发送消息失败', error)
      message.error('发送消息失败')
    } finally {
      setSendingMessage(false)
    }
  }, [roomId, username])

  const leaveRoom = useCallback(async () => {
    if (!roomId || !username) {
      navigate('/rooms', { replace: true })
      return
    }
    // 如果房间不存在，直接导航到大厅
    if (!room && !drawingState) {
      stopPolling()
      navigate('/rooms', { replace: true })
      return
    }
    setLeaving(true)
    try {
      const response = await api.post('/rooms/leave', {
        room_id: roomId,
        username,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '离开房间失败')
      } else {
        message.success('已离开房间')
        stopPolling()
        navigate('/rooms', { replace: true })
      }
    } catch (error) {
      console.error('离开房间失败', error)
      message.error('离开房间失败')
    } finally {
      setLeaving(false)
    }
  }, [roomId, username, room, drawingState, navigate, stopPolling])

  const guess = useCallback(async (guessText: string) => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    try {
      const response = await api.post('/drawing/guess', {
        room_id: roomId,
        username,
        guess: guessText,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '猜词失败')
      } else {
        if (response.data.correct) {
          message.success('恭喜猜中！')
          if (response.data.round_finished) {
            message.info(`目标词是"${response.data.target_word}"，回合结束！`)
          }
        } else {
          message.info('猜错了，继续猜吧！')
          if (response.data.round_finished) {
            message.info(`目标词是"${response.data.target_word}"，回合结束！`)
          }
        }
      }
      await fetchAll()
    } catch (error) {
      console.error('猜词失败', error)
      message.error('猜词失败')
    }
  }, [roomId, username, fetchAll])

  const skipGuess = useCallback(async () => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    try {
      const response = await api.post('/drawing/skip_guess', {
        room_id: roomId,
        username,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '跳过失败')
      } else {
        message.info('已跳过猜词')
      }
      await fetchAll()
    } catch (error) {
      console.error('跳过猜词失败', error)
      message.error('跳过猜词失败')
    }
  }, [roomId, username, fetchAll])

  const triggerAIGuess = useCallback(async (image?: string) => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return
    }
    try {
      const response = await api.post('/drawing/ai_guess', {
        room_id: roomId,
        username,
        image: image ?? null,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? 'AI 猜词失败')
      } else {
        const matched = response.data?.matched
        if (matched) {
          message.success('AI 猜对了！')
        } else {
          message.info('AI 已完成猜词')
        }
      }
      await fetchAll()
    } catch (error) {
      console.error('AI 猜词失败', error)
      message.error('AI 猜词失败')
    }
  }, [roomId, username, fetchAll])

  const setModelConfigOnServer = useCallback(async (config: { url?: string; key?: string; model?: string; prompt?: string }) => {
    if (!roomId || !username) {
      message.warning('房间或用户名信息缺失')
      return false
    }
    try {
      const response = await api.post('/drawing/set_model_config', {
        room_id: roomId,
        username,
        config,
      })
      if (!response.data?.success) {
        message.error(response.data?.message ?? '更新模型配置失败')
        return false
      }
      return true
    } catch (error) {
      console.error('更新模型配置失败', error)
      message.error('更新模型配置失败')
      return false
    }
  }, [roomId, username])

  const syncDrawing = useCallback(async (image: string) => {
    if (!roomId || !username) {
      return
    }
    try {
      await api.post('/drawing/sync_drawing', {
        room_id: roomId,
        username,
        image,
      })
      // 不需要显示消息，因为这是实时同步
    } catch (error) {
      console.error('同步绘画数据失败', error)
    }
  }, [roomId, username])

  const combined = useMemo(() => {
    if (!room && !drawingState) {
      return null
    }
    return {
      ...room,
      ...(drawingState ?? {}),
      ready_status: readyStatus,
    }
  }, [room, drawingState, readyStatus])

  return {
    roomId,
    username,
    loading,
    initializing,
    room,
    drawingState,
    combined,
    messages,
    isReady,
    readyStatus,
    actions: {
      fetchAll,
      setReady,
      configureRound,
      selectDrawer,
      startRound,
      resetRound,
      submitDrawing,
      sendMessage,
      leaveRoom,
      guess,
      skipGuess,
  triggerAIGuess,
  setModelConfig: setModelConfigOnServer,
      syncDrawing,
    },
    state: {
      readyLoading,
      configLoading,
      selectingDrawer,
      startingRound,
      resettingRound,
      submitting,
      sendingMessage,
      leaving,
    },
  }
}
