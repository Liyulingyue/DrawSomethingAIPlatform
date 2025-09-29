import {
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Spin,
  Select,
  Input,
  Divider,
  List,
  Avatar,
  Empty,
} from 'antd'
import { SendOutlined, RedoOutlined, PlayCircleOutlined, LogoutOutlined } from '@ant-design/icons'
import type { ChangeEvent, KeyboardEvent } from 'react'
import DrawBoard from '../DrawBoard'
import GuessResultBlock from './GuessResultBlock'
import {
  type GuessPayload,
  type DrawHistoryItem,
  type ChatMessage,
  type SubmissionPreview,
} from '../../hooks/useDrawingRoom'
import { formatRelativeTime } from '../../utils/api'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface MultiplayerViewProps {
  loading: boolean
  initializing: boolean
  hasRoomData: boolean
  roomId: string | null
  owner: string | null
  status: string
  players: string[]
  currentDrawer: string | null
  currentRound: number
  currentTarget: string
  currentClue: string
  guess: GuessPayload | null
  currentSubmission: SubmissionPreview | null
  history: DrawHistoryItem[]
  messages: ChatMessage[]
  username: string | null
  isReady: boolean
  readyStatus: Record<string, boolean>
  statusDescription: string
  targetInput: string
  clueInput: string
  chatInput: string
  state: {
    readyLoading: boolean
    configLoading: boolean
    selectingDrawer: boolean
    startingRound: boolean
    resettingRound: boolean
    submitting: boolean
    sendingMessage: boolean
    leaving: boolean
  }
  onTargetInputChange: (value: string) => void
  onClueInputChange: (value: string) => void
  onChatInputChange: (value: string) => void
  onChatKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onToggleReady: () => void
  onConfigureRound: () => void
  onSelectDrawer: (value: string) => void
  onStartRound: () => void
  onResetRound: () => void
  onSubmitDrawing: (image: string) => void
  onSendMessage: () => void
  onLeaveRoom: () => void
}

const MultiplayerView = ({
  loading,
  initializing,
  hasRoomData,
  roomId,
  owner,
  status,
  players,
  currentDrawer,
  currentRound,
  currentTarget,
  currentClue,
  guess,
  currentSubmission,
  history,
  messages,
  username,
  isReady,
  readyStatus,
  statusDescription,
  targetInput,
  clueInput,
  chatInput,
  state,
  onTargetInputChange,
  onClueInputChange,
  onChatInputChange,
  onChatKeyDown,
  onToggleReady,
  onConfigureRound,
  onSelectDrawer,
  onStartRound,
  onResetRound,
  onSubmitDrawing,
  onSendMessage,
  onLeaveRoom,
}: MultiplayerViewProps) => {
  if (initializing || loading) {
    return (
      <Card bordered={false} className="drawing-loading-card">
        <div className="drawing-loading">
          <Spin tip="加载房间数据中..." />
        </div>
      </Card>
    )
  }

  if (!hasRoomData || !roomId) {
    return (
      <Card bordered={false}>
        <Space direction="vertical" size="middle">
          <Title level={4}>未找到房间</Title>
          <Text>请返回大厅重新选择房间。</Text>
          <Button type="primary" onClick={() => void onLeaveRoom()} loading={state.leaving}>
            返回大厅
          </Button>
        </Space>
      </Card>
    )
  }

  const handleTargetChange = (event: ChangeEvent<HTMLInputElement>) => {
    onTargetInputChange(event.target.value)
  }

  const handleClueChange = (event: ChangeEvent<HTMLInputElement>) => {
    onClueInputChange(event.target.value)
  }

  const handleChatChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChatInputChange(event.target.value)
  }

  return (
    <>
      <Card className="drawing-header" bordered={false}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>房间 {roomId}</Title>
              <Text type="secondary">
                房主：{owner ?? '未知'} · 当前状态：{status}
              </Text>
            </div>
            <Space wrap>
              <Button icon={<LogoutOutlined />} onClick={() => void onLeaveRoom()} loading={state.leaving}>
                离开房间
              </Button>
              <Button
                type={isReady ? 'default' : 'primary'}
                loading={state.readyLoading}
                onClick={() => void onToggleReady()}
              >
                {isReady ? '取消整备' : '整备完毕'}
              </Button>
            </Space>
          </Space>
          <Text type="secondary">{statusDescription}</Text>
          <Space size="small" wrap>
            {players.map((player) => {
              const ready = readyStatus[player]
              const isCurrentDrawer = player === currentDrawer
              const color = isCurrentDrawer ? 'purple' : ready ? 'success' : 'default'
              return (
                <Tag key={player} color={color} bordered>
                  {player}
                  {isCurrentDrawer ? ' · 绘画者' : ready ? ' · 已整备' : ''}
                </Tag>
              )
            })}
          </Space>
        </Space>
      </Card>

      <div className="drawing-grid">
        <div className="drawing-column drawing-column--left">
          <Card title="回合信息">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space size="small" wrap>
                <Text strong>当前回合：</Text>
                <Tag color="geekblue">第 {currentRound || 1} 回合</Tag>
              </Space>
              <Space direction="vertical" size="small">
                <Text strong>提示词 / 目标词：</Text>
                <Text>{currentTarget || '尚未设置'}</Text>
              </Space>
              <Space direction="vertical" size="small">
                <Text strong>线索：</Text>
                <Text type={currentClue ? undefined : 'secondary'}>
                  {currentClue || '尚未提供，可选项'}
                </Text>
              </Space>
            </Space>
          </Card>

          {owner === username && (
            <Card title="房主控制区" extra="仅房主可操作">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space wrap>
                  <Input
                    style={{ minWidth: 220 }}
                    value={targetInput}
                    placeholder="目标词 / 提示词"
                    maxLength={50}
                    onChange={handleTargetChange}
                  />
                  <Button type="primary" onClick={() => void onConfigureRound()} loading={state.configLoading}>
                    保存提示词
                  </Button>
                </Space>
                <Input
                  value={clueInput}
                  placeholder="可选线索（不会透露给AI，可用于玩家协作）"
                  maxLength={120}
                  onChange={handleClueChange}
                />
                <Space wrap>
                  <Select
                    style={{ minWidth: 200 }}
                    placeholder="选择绘画者"
                    value={currentDrawer ?? undefined}
                    onChange={(value) => {
                      void onSelectDrawer(value)
                    }}
                    loading={state.selectingDrawer}
                    options={players.map((player) => ({ value: player, label: player }))}
                  />
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={state.startingRound}
                    onClick={() => void onStartRound()}
                  >
                    开始回合
                  </Button>
                  <Button
                    icon={<RedoOutlined />}
                    onClick={() => void onResetRound()}
                    loading={state.resettingRound}
                  >
                    重置回合
                  </Button>
                </Space>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  建议在所有玩家整备完成后再开始绘画，若 AI 未能猜中可重置重新来过。
                </Paragraph>
              </Space>
            </Card>
          )}
        </div>

        <div className="drawing-column drawing-column--center">
          <Card title="绘画区">
            {status === 'drawing' && currentDrawer === username ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Text type="secondary">提示词：{currentTarget || '尚未设置'}</Text>
                <DrawBoard
                  onSubmit={(image) => {
                    void onSubmitDrawing(image)
                  }}
                  submitting={state.submitting}
                />
                <Text type="secondary">完成后点击提交，AI 将立即给出猜词结果。</Text>
              </Space>
            ) : status === 'drawing' ? (
              <Paragraph>绘画者 {currentDrawer ?? '未知'} 正在创作，请耐心等待。</Paragraph>
            ) : (
              <Paragraph>
                当前未处于绘画阶段。提示词：
                <Text strong style={{ marginLeft: 8 }}>{currentTarget || '尚未设置'}</Text>
              </Paragraph>
            )}

            {currentSubmission && (
              <div className="drawing-preview">
                <Text strong>最新提交：</Text>
                <img src={currentSubmission.image} alt="最新作品" />
                <Text type="secondary">
                  绘画者：{currentSubmission.submitted_by} · {formatRelativeTime(currentSubmission.submitted_at)} 提交
                </Text>
              </div>
            )}
          </Card>

          <Card title="AI 猜词结果">
            <GuessResultBlock guess={guess} />
          </Card>

          <Card title="历史记录">
            {history.length > 0 ? (
              <List
                dataSource={[...history].reverse()}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar>{(item.drawer ?? '?').charAt(0).toUpperCase()}</Avatar>}
                      title={`第 ${item.round} 回合 · 目标词：${item.target_word ?? '未知'}`}
                      description={
                        <Space direction="vertical" size="small">
                          <Text>绘画者：{item.drawer ?? '未知'}</Text>
                          <Text>提交时间：{formatRelativeTime(item.submitted_at)}</Text>
                          <Text>结果：{item.success ? '成功 ✅' : '未猜中 ❌'}</Text>
                          {item.guess?.best_guess && (
                            <Text>主要猜测：{item.guess.best_guess}</Text>
                          )}
                          {item.guess?.alternatives && item.guess.alternatives.length > 0 && (
                            <Text type="secondary">
                              备选：{item.guess.alternatives.join(' / ')}
                            </Text>
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
        </div>

        <div className="drawing-column drawing-column--right">
          <Card title="房间聊天" className="drawing-chat">
            <div className="chat-messages">
              {messages.length > 0 ? (
                <List
                  dataSource={[...messages].reverse()}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar>{item.username.charAt(0).toUpperCase()}</Avatar>}
                        title={`${item.username} · ${formatRelativeTime(item.timestamp)}`}
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
                onChange={handleChatChange}
                onKeyDown={onChatKeyDown}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={state.sendingMessage}
                onClick={() => void onSendMessage()}
              >
                发送
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    </>
  )
}

export default MultiplayerView
