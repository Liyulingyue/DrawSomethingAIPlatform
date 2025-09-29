import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Layout,
  Typography,
  Space,
  Card,
  Button,
  Tag,
  message,
  Spin,
  Select,
  Input,
  Divider,
  List,
  Avatar,
  Empty,
} from 'antd'
import { SendOutlined, RedoOutlined, PlayCircleOutlined, LogoutOutlined } from '@ant-design/icons'
import DrawBoard from '../components/DrawBoard'
import { useUser } from '../context/UserContext'
import { api } from '../utils/api'
import './DrawingRoom.css'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface RoomData {
  players: string[]
  owner: string | null
  status: string
  ready_status?: Record<string, boolean>
  current_hint?: string | null
  current_drawer?: string | null
  current_round?: number
}

interface DrawingState {
  status?: string
  current_round?: number
  current_hint?: string | null
  current_drawer?: string | null
  ready_status?: Record<string, boolean>
  current_submission?: {
    image: string
    submitted_by: string
    submitted_at: number
  } | null
  ai_result?: {
    success: boolean
    configured: boolean
    matched: boolean
    label?: string | null
    confidence?: number | null
    error?: string | null
  } | null
  draw_history?: Array<{
    round: number
    hint: string | null
    drawer: string | null
    submitted_at: number
    success: boolean
    result: {
      matched: boolean
      label?: string | null
      confidence?: number | null
      error?: string | null
    }
  }>
}

interface ChatMessage {
  username: string
  message: string
  timestamp: number
}

function DrawingRoom() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId') ?? ''
  const { username, initializing } = useUser()

  const [room, setRoom] = useState<RoomData | null>(null)
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null)
  const [messagesList, setMessagesList] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [readyLoading, setReadyLoading] = useState(false)
  const [hintInput, setHintInput] = useState('')
  const [drawer, setDrawer] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [startingRound, setStartingRound] = useState(false)
  const [resettingRound, setResettingRound] = useState(false)

  const players = room?.players ?? []
  const owner = room?.owner ?? null
  const status = drawingState?.status ?? room?.status ?? 'waiting'
  const readyStatus = drawingState?.ready_status ?? room?.ready_status ?? {}
  const currentHint = drawingState?.current_hint ?? room?.current_hint ?? ''
  const currentDrawer = drawingState?.current_drawer ?? room?.current_drawer ?? null

  const isOwner = owner === username
  const isDrawer = currentDrawer === username
  const isReady = readyStatus?.[username ?? ''] ?? false

  const loadData = useCallback(async () => {
    if (!roomId) {
      return
    }
    setLoading(true)
    try {
      const [roomResp, drawingResp, msgResp] = await Promise.all([
        api.get(`/rooms/${roomId}`),
        api.get(`/drawing/state/${roomId}`),
        api.get(`/messages/${roomId}`),
      ])

      if (roomResp.data.success) {
        setRoom(roomResp.data.room)
      } else {
        message.error(roomResp.data.message ?? '房间信息获取失败')
      }

      if (drawingResp.data.success) {
        setDrawingState(drawingResp.data.room)
        if (drawingResp.data.room?.current_hint) {
          setHintInput(drawingResp.data.room.current_hint)
        }
        if (drawingResp.data.room?.current_drawer) {
          setDrawer(drawingResp.data.room.current_drawer)
        }
      }

      if (msgResp.data.success) {
        setMessagesList(msgResp.data.messages)
      }
    } catch (error) {
      console.error('加载房间数据失败', error)
      message.error('加载房间数据失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    if (!roomId || initializing) {
      return
    }
    loadData()
    const interval = setInterval(() => {
      loadData()
    }, 4000)
    return () => clearInterval(interval)
  }, [roomId, initializing, loadData])

  useEffect(() => {
    if (!roomId && !initializing) {
      message.warning('缺少房间ID，已返回大厅')
      navigate('/rooms', { replace: true })
    }
  }, [roomId, initializing, navigate])

  const handleToggleReady = async () => {
    if (!roomId || !username) return
    setReadyLoading(true)
    try {
      const response = await api.post('/drawing/set_ready', {
        room_id: roomId,
        username,
        ready: !isReady,
      })
      if (response.data.success) {
        message.success(!isReady ? '整备完毕' : '已取消整备')
        loadData()
      } else {
        message.error(response.data.message ?? '操作失败')
      }
    } catch (error) {
      console.error('更新准备状态失败', error)
      message.error('更新准备状态失败')
    } finally {
      setReadyLoading(false)
    }
  }

  const handleSetHint = async () => {
    if (!roomId || !username) return
    const trimmed = hintInput.trim()
    if (!trimmed) {
      message.error('提示词不能为空')
      return
    }
    try {
      const response = await api.post('/drawing/set_hint', {
        room_id: roomId,
        username,
        hint: trimmed,
      })
      if (response.data.success) {
        message.success('提示词已更新')
        loadData()
      } else {
        message.error(response.data.message ?? '设置提示词失败')
      }
    } catch (error) {
      console.error('设置提示词失败', error)
      message.error('设置提示词失败')
    }
  }

  const handleSelectDrawer = async (value: string) => {
    if (!roomId || !username) return
    setDrawer(value)
    try {
      const response = await api.post('/drawing/select_drawer', {
        room_id: roomId,
        username,
        drawer: value,
      })
      if (response.data.success) {
        message.success(`已指定 ${value} 为绘画者`)
        loadData()
      } else {
        message.error(response.data.message ?? '指定绘画者失败')
      }
    } catch (error) {
      console.error('指定绘画者失败', error)
      message.error('指定绘画者失败')
    }
  }

  const handleStartRound = async () => {
    if (!roomId || !username) return
    setStartingRound(true)
    try {
      const response = await api.post('/drawing/start_round', {
        room_id: roomId,
        username,
      })
      if (response.data.success) {
        message.success('回合已开始，绘画者请开始创作！')
        loadData()
      } else {
        message.error(response.data.message ?? '无法开始回合')
      }
    } catch (error) {
      console.error('开始回合失败', error)
      message.error('开始回合失败')
    } finally {
      setStartingRound(false)
    }
  }

  const handleResetRound = async () => {
    if (!roomId || !username) return
    setResettingRound(true)
    try {
      const response = await api.post('/drawing/reset', {
        room_id: roomId,
        username,
      })
      if (response.data.success) {
        message.success('已重置本回合')
        loadData()
      } else {
        message.error(response.data.message ?? '重置回合失败')
      }
    } catch (error) {
      console.error('重置回合失败', error)
      message.error('重置回合失败')
    } finally {
      setResettingRound(false)
    }
  }

  const handleSubmitDrawing = async (image: string) => {
    if (!roomId || !username) return
    setSubmitting(true)
    try {
      const response = await api.post('/drawing/submit', {
        room_id: roomId,
        username,
        image,
      })
      if (response.data.success) {
        message.success('作品已提交，等待AI判定')
        loadData()
      } else {
        message.error(response.data.message ?? '提交失败')
      }
    } catch (error) {
      console.error('提交作品失败', error)
      message.error('提交作品失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendMessage = async () => {
    if (!roomId || !username) return
    const trimmed = chatInput.trim()
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
      if (response.data.success) {
        setChatInput('')
        setMessagesList(response.data.messages)
      } else {
        message.error(response.data.message ?? '发送失败')
      }
    } catch (error) {
      console.error('发送消息失败', error)
      message.error('发送消息失败')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleLeaveRoom = async () => {
    if (!roomId || !username) return
    try {
      const response = await api.post('/rooms/leave', { room_id: roomId, username })
      if (response.data.success) {
        message.success('已离开房间')
        navigate('/rooms', { replace: true })
      } else {
        message.error(response.data.message ?? '离开房间失败')
      }
    } catch (error) {
      console.error('离开房间失败', error)
      message.error('离开房间失败')
    }
  }

  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const statusDescription = useMemo(() => {
    switch (status) {
      case 'ready':
        return '所有玩家已整备完毕，等待房主开始回合'
      case 'drawing':
        return currentDrawer ? `${currentDrawer} 正在绘制，提交后由AI判定` : '绘画阶段进行中'
      case 'review':
        return 'AI判定未通过，可重置回合重新绘制'
      case 'success':
        return 'AI判定成功，恭喜完成挑战'
      default:
        return '等待提示词、绘画者和玩家整备'
    }
  }, [status, currentDrawer])

  if (initializing || loading) {
    return (
      <Layout className="drawing-layout">
        <Content className="drawing-content">
          <div className="drawing-loading">
            <Spin tip="加载房间数据中..." />
          </div>
        </Content>
      </Layout>
    )
  }

  if (!roomId || !room) {
    return (
      <Layout className="drawing-layout">
        <Content className="drawing-content">
          <Card>
            <Space direction="vertical" size="middle">
              <Title level={4}>未找到房间</Title>
              <Text>请返回大厅重新选择房间。</Text>
              <Button type="primary" onClick={() => navigate('/rooms', { replace: true })}>
                返回大厅
              </Button>
            </Space>
          </Card>
        </Content>
      </Layout>
    )
  }

  return (
    <Layout className="drawing-layout">
      <Content className="drawing-content">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <Title level={3} style={{ marginBottom: 4 }}>房间 {roomId}</Title>
                  <Text type="secondary">房主：{owner ?? '未知'} · 当前状态：{status}</Text>
                </div>
                <Space wrap>
                  <Button icon={<LogoutOutlined />} onClick={handleLeaveRoom}>
                    离开房间
                  </Button>
                  <Button type={isReady ? 'default' : 'primary'} loading={readyLoading} onClick={handleToggleReady}>
                    {isReady ? '取消整备' : '整备完毕'}
                  </Button>
                </Space>
              </Space>
              <Text type="secondary">{statusDescription}</Text>
              <Space size="small" wrap>
                {players.map((player) => {
                  const ready = readyStatus[player]
                  const isCurrentDrawer = player === currentDrawer
                  return (
                    <Tag key={player} color={isCurrentDrawer ? 'purple' : ready ? 'green' : 'default'}>
                      {player}
                      {isCurrentDrawer ? ' · 绘画者' : ready ? ' · 已整备' : ''}
                    </Tag>
                  )
                })}
              </Space>
            </Space>
          </Card>

          <div className="drawing-grid">
            <Space direction="vertical" size="large" style={{ flex: 2 }}>
              <Card title="房主控制区" extra={isOwner ? '仅房主可操作' : undefined}>
                {isOwner ? (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Space wrap>
                      <Input
                        style={{ minWidth: 220 }}
                        value={hintInput}
                        placeholder="请输入提示词"
                        maxLength={50}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setHintInput(event.target.value)}
                      />
                      <Button type="primary" onClick={handleSetHint}>
                        设置提示词
                      </Button>
                    </Space>
                    <Space wrap>
                      <Select
                        style={{ minWidth: 200 }}
                        placeholder="选择绘画者"
                        value={drawer ?? undefined}
                        onChange={handleSelectDrawer}
                        options={players.map((player) => ({ value: player, label: player }))}
                      />
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        loading={startingRound}
                        onClick={handleStartRound}
                      >
                        开始回合
                      </Button>
                      <Button
                        icon={<RedoOutlined />}
                        onClick={handleResetRound}
                        loading={resettingRound}
                      >
                        重置回合
                      </Button>
                    </Space>
                    <Paragraph type="secondary">
                      从等待状态进入绘画阶段需要：所有玩家整备完毕、设置提示词并指定绘画者。
                    </Paragraph>
                  </Space>
                ) : (
                  <Paragraph type="secondary">仅房主可设置提示词、选择绘画者并开始回合。</Paragraph>
                )}
              </Card>

              <Card title="绘画区">
                {status === 'drawing' && isDrawer ? (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Text type="secondary">提示词：{currentHint || '尚未设置'}</Text>
                    <DrawBoard onSubmit={handleSubmitDrawing} submitting={submitting} />
                    <Text type="secondary">提交后AI将自动识别画面内容。</Text>
                  </Space>
                ) : status === 'drawing' ? (
                  <Paragraph>绘画者 {currentDrawer ?? '未知'} 正在创作，请耐心等待。</Paragraph>
                ) : (
                  <Paragraph>
                    当前未处于绘画阶段。提示词：
                    <Text strong style={{ marginLeft: 8 }}>{currentHint || '尚未设置'}</Text>
                  </Paragraph>
                )}

                {drawingState?.current_submission && (
                  <div className="drawing-preview">
                    <Text strong>最新提交：</Text>
                    <img src={drawingState.current_submission.image} alt="最新作品" />
                    <Text type="secondary">
                      绘画者：{drawingState.current_submission.submitted_by}
                    </Text>
                  </div>
                )}
              </Card>

              <Card title="AI 判定结果">
                {drawingState?.ai_result ? (
                  <Space direction="vertical" size="small">
                    <Text>识别标签：{drawingState.ai_result.label ?? '未知'}</Text>
                    <Text>匹配提示词：{drawingState.ai_result.matched ? '是 ✅' : '否 ❌'}</Text>
                    {typeof drawingState.ai_result.confidence === 'number' && (
                      <Text>置信度：{(drawingState.ai_result.confidence * 100).toFixed(1)}%</Text>
                    )}
                    {drawingState.ai_result.configured ? (
                      drawingState.ai_result.error ? (
                        <Text type="danger">错误信息：{drawingState.ai_result.error}</Text>
                      ) : (
                        <Text type="secondary">来自 ERNIE 官方接口的识别结果</Text>
                      )
                    ) : (
                      <Text type="secondary">当前未配置 ERNIE 接口，使用提示词作为默认结果</Text>
                    )}
                  </Space>
                ) : (
                  <Text type="secondary">暂无判定结果</Text>
                )}
              </Card>

              <Card title="历史记录">
                {drawingState?.draw_history && drawingState.draw_history.length > 0 ? (
                  <List
                    dataSource={drawingState.draw_history.slice().reverse()}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar>{item.drawer?.charAt(0).toUpperCase()}</Avatar>}
                          title={`第 ${item.round} 回合 · 提示词：${item.hint ?? '未知'}`}
                          description={
                            <Space direction="vertical" size="small">
                              <Text>绘画者：{item.drawer ?? '未知'}</Text>
                              <Text>匹配结果：{item.success ? '成功 ✅' : '未通过 ❌'}</Text>
                              {item.result?.label && <Text>AI标签：{item.result.label}</Text>}
                              {typeof item.result?.confidence === 'number' && (
                                <Text>置信度：{(item.result.confidence * 100).toFixed(1)}%</Text>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="还没有历史记录" />
                )}
              </Card>
            </Space>

            <Card title="房间聊天" className="drawing-chat">
              <div className="chat-messages">
                {messagesList.length > 0 ? (
                  <List
                    dataSource={messagesList.slice().reverse()}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar>{item.username.charAt(0).toUpperCase()}</Avatar>}
                          title={item.username}
                          description={item.message}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="暂时没有聊天" />
                )}
              </div>
              <Divider />
              <Space direction="vertical" style={{ width: '100%' }}>
                <TextArea
                  value={chatInput}
                  placeholder="按 Enter 发送，Shift+Enter 换行"
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setChatInput(event.target.value)}
                  onKeyDown={handleChatKeyDown}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sendingMessage}
                  onClick={handleSendMessage}
                >
                  发送
                </Button>
              </Space>
            </Card>
          </div>
        </Space>
      </Content>
    </Layout>
  )
}

export default DrawingRoom
