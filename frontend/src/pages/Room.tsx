import { useState, useEffect, useCallback, useMemo } from 'react'
import { Layout, Card, Button, Typography, message, Space, List, Tag, Spin, Tooltip, Empty, Popconfirm } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import Navbar from '../components/Navbar'
import { api, formatRelativeTime } from '../utils/api'
import './Room.css'

const { Content } = Layout
const { Title, Text } = Typography

interface LobbyRoom {
  room_id: string
  players: string[]
  player_count: number
  max_players: number
  created_at: number
  last_activity: number
  status: string
  owner?: string | null
}

function Room() {
  const navigate = useNavigate()
  const { username, initializing, loading: userLoading, login } = useUser()
  const [rooms, setRooms] = useState<LobbyRoom[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)

  const ensureUsername = useCallback(async () => {
    if (initializing || username) {
      return
    }
    const result = await login()
    if (!result.success) {
      message.error(result.message ?? '无法获取用户名，请稍后再试')
    }
  }, [initializing, username, login])

  useEffect(() => {
    ensureUsername()
  }, [ensureUsername])

  const fetchRooms = useCallback(async (withLoading = false) => {
    if (withLoading) {
      setRoomsLoading(true)
    }
    try {
      const response = await api.get('/rooms')
      if (response.data.success) {
        setRooms(response.data.rooms)
      }
    } catch (error) {
      console.error('获取房间列表失败', error)
      message.error('获取房间列表失败')
    } finally {
      if (withLoading) {
        setRoomsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (initializing) {
      return
    }
    fetchRooms(true)
    const interval = setInterval(() => {
      fetchRooms(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [initializing, fetchRooms])

  const currentRoomId = useMemo(() => {
    if (!username) {
      return null
    }
    const existing = rooms.find((room) => room.players.includes(username))
    return existing ? existing.room_id : null
  }, [rooms, username])

  const handleCreateOrEnterRoom = useCallback(async () => {
    if (!username) {
      message.warning('正在获取用户名，请稍等…')
      return
    }
    setCreating(true)
    try {
      const response = await api.post('/rooms/create', { username })
      if (response.data.success) {
        const { room_id: roomId, message: msg, already_in_room: alreadyInRoom } = response.data
        message.success(msg ?? (alreadyInRoom ? '正在返回房间' : '房间创建成功'))
        navigate(`/game?roomId=${roomId}`)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('创建房间失败', error)
      message.error('创建房间失败')
    } finally {
      setCreating(false)
    }
  }, [username, navigate])

  const handleJoinRoom = useCallback(async (room: LobbyRoom) => {
    if (!username) {
      message.warning('正在获取用户名，请稍等…')
      return
    }

    const isMember = room.players.includes(username)
    if (isMember) {
      navigate(`/game?roomId=${room.room_id}`)
      return
    }

    if (room.player_count >= room.max_players) {
      message.warning('房间已满')
      return
    }

    setJoiningRoomId(room.room_id)
    try {
      const response = await api.post('/rooms/join', { room_id: room.room_id, username })
      if (response.data.success) {
        const msg = response.data.message ?? '加入房间成功'
        message.success(msg)
        navigate(`/game?roomId=${room.room_id}`)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('加入房间失败', error)
      message.error('加入房间失败')
    } finally {
      setJoiningRoomId(null)
    }
  }, [username, navigate])

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    if (!username) {
      message.warning('正在获取用户名，请稍等…')
      return
    }
    setDeletingRoomId(roomId)
    try {
      const response = await api.post('/rooms/delete', { room_id: roomId, username })
      if (response.data.success) {
        message.success('房间已解散')
        fetchRooms(true)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('解散房间失败', error)
      message.error('解散房间失败')
    } finally {
      setDeletingRoomId(null)
    }
  }, [username, fetchRooms])

  const availableRooms = useMemo(
    () => rooms.filter((room) => room.player_count < room.max_players),
    [rooms]
  )

  if (initializing) {
    return (
      <Layout className="room-layout">
        <Navbar />
        <Content className="room-content initializing">
          <Spin tip="正在加载用户信息…" />
        </Content>
      </Layout>
    )
  }

  return (
    <Layout className="room-layout">
      <Navbar />
      <Content className="room-content">
        <div className="room-inner">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space size="large" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div>
                    <Title level={3} style={{ marginBottom: 0 }}>多人绘猜大厅</Title>
                    <Text type="secondary">从这里进入房间、邀请伙伴一起绘画猜词</Text>
                  </div>
                  <Space>
                    <Tooltip title="手动刷新房间列表">
                      <Button onClick={() => fetchRooms(true)} loading={roomsLoading}>刷新</Button>
                    </Tooltip>
                    <Button
                      type="primary"
                      size="middle"
                      onClick={handleCreateOrEnterRoom}
                      loading={creating || userLoading}
                    >
                      {currentRoomId ? '进入我的房间' : '创建房间'}
                    </Button>
                  </Space>
                </Space>
                <Space size="small">
                  <Text strong>当前用户名：</Text>
                  <Tag color="blue">{username || '获取中…'}</Tag>
                </Space>
              </Space>
            </Card>

            <Card title="房间列表">
              {roomsLoading ? (
                <div className="room-list-loading">
                  <Spin tip="正在加载房间…" />
                </div>
              ) : rooms.length === 0 ? (
                <Empty description="暂时没有房间，点击上方按钮创建第一个吧！" />
              ) : (
                <List
                  dataSource={rooms}
                  renderItem={(room) => {
                    const isMember = username ? room.players.includes(username) : false
                    const isOwner = isMember && room.owner === username
                    const isFull = room.player_count >= room.max_players
                    const disableJoin = !isMember && isFull
                    return (
                      <List.Item
                        actions={[
                          <Button
                            key="join"
                            type="primary"
                            disabled={disableJoin}
                            loading={joiningRoomId === room.room_id}
                            onClick={() => handleJoinRoom(room)}
                          >
                            {isMember ? '进入' : (isFull ? '已满' : '加入')}
                          </Button>,
                          isOwner ? (
                            <Popconfirm
                              key="delete"
                              title="确认解散房间？"
                              okText="确认"
                              cancelText="取消"
                              onConfirm={() => handleDeleteRoom(room.room_id)}
                            >
                              <Button danger loading={deletingRoomId === room.room_id}>
                                解散
                              </Button>
                            </Popconfirm>
                          ) : null,
                        ].filter(Boolean)}
                      >
                        <List.Item.Meta
                          title={
                            <Space size="middle">
                              <Text strong>房间ID:</Text>
                              <Text code>{room.room_id}</Text>
                              {isMember ? (
                                <Tag color="purple">{isOwner ? '我的房间(房主)' : '我的房间'}</Tag>
                              ) : (
                                disableJoin ? <Tag color="red">已满</Tag> : <Tag color="green">可加入</Tag>
                              )}
                              <Tag color="geekblue">状态：{room.status}</Tag>
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size="small">
                              <Space size="small" wrap>
                                <Text>玩家：</Text>
                                {room.players.map((player) => (
                                  <Tag key={player}>{player}</Tag>
                                ))}
                                {Array.from({ length: Math.max(0, room.max_players - room.player_count) }).map((_, index) => (
                                  <Tag key={`empty-${room.room_id}-${index}`} color="default">等待玩家</Tag>
                                ))}
                              </Space>
                              <Space size="middle">
                                <Text type="secondary">创建于 {formatRelativeTime(room.created_at)}</Text>
                                <Text type="secondary">最后活动 {formatRelativeTime(room.last_activity)}</Text>
                              </Space>
                            </Space>
                          }
                        />
                      </List.Item>
                    )
                  }}
                />
              )}
            </Card>

            {availableRooms.length > 0 && (
              <Card type="inner" title="正在等待玩家的房间">
                <Space wrap>
                  {availableRooms.map((room) => (
                    <Tag key={`waiting-${room.room_id}`} color="processing">{room.room_id}</Tag>
                  ))}
                </Space>
              </Card>
            )}
          </Space>
        </div>
      </Content>
    </Layout>
  )
}

export default Room
