import {
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Spin,
  Input,
  Divider,
  List,
  Avatar,
  Empty,
  Form,
  message,
  Tooltip,
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

interface ModelConfig {
  url: string
  key: string
  model: string
  prompt: string
}

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
  guess: GuessPayload | null
  currentSubmission: SubmissionPreview | null
  history: DrawHistoryItem[]
  messages: ChatMessage[]
  scores: Record<string, number>
  username: string | null
  isReady: boolean
  readyStatus: Record<string, boolean>
  statusDescription: string
  targetInput: string
  chatInput: string
  guessStatus: string
  currentDrawing: string | null
  state: {
    readyLoading: boolean
    configLoading: boolean
    startingRound: boolean
    resettingRound: boolean
    submitting: boolean
    sendingMessage: boolean
    leaving: boolean
  }
  modelConfig: ModelConfig
  isLocked: boolean
  isPrepared: boolean
  onModelConfigChange: (patch: Partial<ModelConfig>) => void
  onLock: () => void
  onUnlock: () => void
  onPrepare: () => void
  onUnprepare: () => void
  onGuess: (image: string) => void
  onGuessWord: (guess: string) => void
  onSkipGuess: () => void
  onSyncDrawing: (image: string) => void
  onTargetInputChange: (value: string) => void
  onChatInputChange: (value: string) => void
  onChatKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onToggleReady: () => void
  onConfigureRound: () => void
  onStartRound: () => void
  onResetRound: () => void
  onResetScores: () => void
  onSubmitDrawing: (image: string) => void
  onSendMessage: () => void
  onLeaveRoom: () => void
}

const ROOM_CHAT_ENABLED = false

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
  guess,
  currentSubmission,
  history,
  messages,
  scores,
  username,
  isReady,
  readyStatus,
  statusDescription,
  targetInput,
  chatInput,
  guessStatus,
  currentDrawing,
  state,
  modelConfig,
  isLocked,
  isPrepared,
  onModelConfigChange,
  onLock,
  onUnlock,
  onPrepare,
  onUnprepare,
  onGuess,
  onGuessWord,
  onSkipGuess,
  onSyncDrawing,
  onTargetInputChange,
  onChatInputChange,
  onChatKeyDown,
  onToggleReady,
  onConfigureRound,
  onStartRound,
  onResetRound,
  onResetScores,
  onSubmitDrawing,
  onSendMessage,
  onLeaveRoom,
}: MultiplayerViewProps) => {
  if (initializing || loading) {
    return (
      <Card variant="borderless" className="drawing-loading-card">
        <div className="drawing-loading">
          <Spin />
        </div>
      </Card>
    )
  }

  if (!hasRoomData || !roomId) {
    return (
      <Card variant="borderless">
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

  const handleChatChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChatInputChange(event.target.value)
  }

  const handleModelConfigFieldChange = (field: keyof ModelConfig) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    if (field === 'url' && value && !value.match(/^https?:\/\/.+/)) {
      message.warning('请输入有效的HTTP或HTTPS URL')
      return
    }
    onModelConfigChange({ [field]: value })
  }

  return (
    <>
      <Card className="drawing-header" variant="borderless">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Space direction="vertical" size="small">
              <Title level={3} style={{ marginBottom: 4 }}>房间 {roomId}</Title>
              <Text type="secondary">
                房主：{owner ?? '未知'} · 当前状态：{status}
              </Text>
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
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
            <Button icon={<LogoutOutlined />} onClick={() => void onLeaveRoom()} loading={state.leaving}>
              离开房间
            </Button>
            <Tooltip title={owner !== username ? "等待房主开启回合" : undefined}>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={state.startingRound}
                disabled={owner !== username}
                onClick={() => void onStartRound()}
              >
                开始回合
              </Button>
            </Tooltip>
            <Tooltip title={owner !== username ? "只有房主可以重置积分" : status === 'drawing' ? "游戏进行中无法重置积分" : undefined}>
              <Button
                icon={<RedoOutlined />}
                disabled={owner !== username || status === 'drawing'}
                onClick={() => void onResetScores()}
              >
                重置积分
              </Button>
            </Tooltip>
          </div>
        </div>
      </Card>

      <Card className="drawing-body" variant="borderless">
        <div className="drawing-grid">
          <div className="drawing-column drawing-column--left">
            <Card title="模型配置">
              <Form layout="vertical">
                <Form.Item label="模型 URL">
                  <Input
                    value={modelConfig.url}
                    onChange={handleModelConfigFieldChange('url')}
                    allowClear
                    placeholder="OpenAI兼容API端点，例如：https://api.openai.com/v1"
                    disabled={isLocked}
                  />
                </Form.Item>
                <Form.Item label="访问密钥">
                  <Input.Password
                    value={modelConfig.key}
                    onChange={handleModelConfigFieldChange('key')}
                    allowClear
                    placeholder="输入API访问密钥"
                    disabled={isLocked}
                  />
                </Form.Item>
                <Form.Item label="模型名称">
                  <Input
                    value={modelConfig.model}
                    onChange={handleModelConfigFieldChange('model')}
                    allowClear
                    placeholder="例如：gpt-4o-mini 或 ernie-4.5-8k-preview"
                    disabled={isLocked}
                  />
                </Form.Item>
                <Form.Item label="自定义提示词">
                  <Input.TextArea
                    placeholder="可选：自定义模型指令"
                    value={modelConfig.prompt}
                    onChange={handleModelConfigFieldChange('prompt')}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    disabled={isLocked}
                  />
                </Form.Item>
                <Form.Item>
                  <Space wrap>
                    {!isLocked ? (
                      <Button type="primary" onClick={onLock}>
                        锁定
                      </Button>
                    ) : (
                      <>
                        <Tooltip title={
                          status === 'drawing' || status === 'success' || status === 'review'
                            ? '进行中无法解锁'
                            : isPrepared
                              ? '请先解除整备后再解锁'
                              : undefined
                        }>
                          <Button
                            onClick={onUnlock}
                            disabled={status === 'drawing' || status === 'success' || status === 'review' || isPrepared}
                          >
                            解锁
                          </Button>
                        </Tooltip>
                        {!isPrepared ? (
                          <Button type="primary" onClick={onPrepare}>
                            整备完毕
                          </Button>
                        ) : (
                          <>
                            <Button onClick={onUnprepare} disabled={status === 'drawing' || status === 'success' || status === 'review'}>
                              解除整备
                            </Button>
                            <Button type="primary" onClick={() => onGuess(currentSubmission!.image)} disabled={!currentSubmission}>
                              进行猜词
                            </Button>
                            <Button onClick={() => void onSkipGuess()} disabled={guessStatus === 'guessed' || guessStatus === 'skipped'}>
                              跳过
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </Space>
                </Form.Item>
              </Form>
            </Card>

            <Card title="AI 猜词结果">
              <GuessResultBlock guess={guess} />
            </Card>
          </div>

          <div className="drawing-column drawing-column--center">
            <Card title="绘制目标" extra={<Tag color={status === 'drawing' ? 'geekblue' : 'default'}>{status === 'drawing' ? `第 ${currentRound || 1} 回合` : '等待开始'}</Tag>}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Input
                  value={currentTarget || '系统将自动生成目标词...'}
                  placeholder="系统将自动生成目标词..."
                  disabled
                  readOnly
                />
              </Space>
            </Card>

            <Card title="绘画区">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <DrawBoard
                  disabled={!(status === 'drawing' && currentDrawer === username)}
                  onDraw={(image) => {
                    void onSyncDrawing(image)
                  }}
                />
                {status === 'drawing' && currentDrawer === username && (
                  <Text type="secondary">开始绘画吧，所有人可以实时看到你的作品并随时猜词！</Text>
                )}
                {status === 'drawing' && currentDrawer !== username && (
                  <Text type="secondary">绘画者 {currentDrawer ?? '未知'} 正在创作，请耐心等待。</Text>
                )}
              </Space>

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
          </div>

          <div className="drawing-column drawing-column--right">
            <Card title="积分榜">
              <List
                size="small"
                dataSource={players.map(player => [player, (scores || {})[player] || 0] as const).sort(([, a], [, b]) => b - a)}
                renderItem={([player, score]) => (
                  <List.Item>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text>{player}</Text>
                      <Text strong>{score}</Text>
                    </Space>
                  </List.Item>
                )}
              />
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
            {ROOM_CHAT_ENABLED && (
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
            )}
          </div>
        </div>
      </Card>
    </>
  )
}

export default MultiplayerView
