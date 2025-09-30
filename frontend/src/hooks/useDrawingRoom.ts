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

export interface DrawHistoryItem {
  round: number
  target_word?: string | null
  drawer?: string | null
  submitted_at: number
  guess?: GuessPayload | null
  success: boolean
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
  ai_result?: GuessPayload | null
  ai_guess?: GuessPayload | null
  draw_history?: DrawHistoryItem[]
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
    return {
      round: typeof item.round === 'number' ? item.round : 0,
      target_word: typeof item.target_word === 'string' ? item.target_word : (typeof item.hint === 'string' ? item.hint : null),
      drawer: typeof item.drawer === 'string' ? item.drawer : undefined,
      submitted_at: typeof item.submitted_at === 'number' ? item.submitted_at : 0,
      guess,
      success: Boolean(item.success),
    } as DrawHistoryItem
  }).filter(Boolean) as DrawHistoryItem[]
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
        setRoom(data)
      } else if (roomResp.data?.message) {
        message.error(roomResp.data.message)
      }

      if (drawingResp.data?.success) {
        const rawState = drawingResp.data.room ?? null
        if (rawState) {
          const normalizedGuess = normalizeGuess(rawState.ai_guess ?? rawState.ai_result)
          const history = normalizeHistory(rawState.draw_history)
          setDrawingState({
            ...rawState,
            ai_result: normalizedGuess,
            ai_guess: normalizedGuess,
            draw_history: history,
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
  }, [roomId, username, navigate, stopPolling])

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
