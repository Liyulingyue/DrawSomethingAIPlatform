import { Card, Space, Input, Button, List, Avatar, Empty, Typography, Form, message } from 'antd'
import type { ChangeEvent } from 'react'
import { useRef } from 'react'
import DrawBoard, { type DrawBoardRef } from '../DrawBoard'
import GuessResultBlock from './GuessResultBlock'
import type { GuessPayload } from '../../hooks/useDrawingRoom'
import { formatRelativeTime, api } from '../../utils/api'

const { Text } = Typography

export interface ModelConfig {
  url: string
  key: string
  model: string
  prompt: string
}

export interface SingleHistoryEntry {
  id: number
  target: string
  createdAt: number
  guess: GuessPayload
}

interface SingleTesterProps {
  target: string
  onTargetChange: (value: string) => void
  onSubmit: (image: string) => void
  submitting: boolean
  onReset: () => void
  result: GuessPayload | null
  history: SingleHistoryEntry[]
  modelConfig: ModelConfig
  onModelConfigChange: (patch: Partial<ModelConfig>) => void
  onTestConfig?: (image: string) => void
}

const SingleTester = ({
  target,
  onTargetChange,
  onSubmit,
  submitting,
  onReset,
  result,
  history,
  modelConfig,
  onModelConfigChange,
  onTestConfig,
}: SingleTesterProps) => {
  const drawBoardRef = useRef<DrawBoardRef>(null)

  const handleModelConfigFieldChange = (field: keyof ModelConfig) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    if (field === 'url' && value && !value.match(/^https?:\/\/.+/)) {
      message.warning('请输入有效的HTTP或HTTPS URL')
      return
    }
    onModelConfigChange({ [field]: value })
  }

  const handleTestConfig = () => {
    if (!onTestConfig) return
    const image = drawBoardRef.current?.getImage()
    if (!image) {
      message.warning('请先在画板上绘制一些内容')
      return
    }
    onTestConfig(image)
  }

  const handleRandomTarget = async () => {
    try {
      const response = await api.get('/ai/random-target')
      onTargetChange(response.data.target)
      message.success('已生成随机绘制目标')
    } catch (error) {
      message.error('获取随机目标失败')
      console.error('Random target error:', error)
    }
  }

  return (
    <div className="drawing-single">
      <div className="drawing-single-grid">
        <div className="drawing-single-column drawing-single-column--left">
          <Card title="模型配置">
            <Form layout="vertical">
              <Form.Item label="模型 URL">
                <Input
                  value={modelConfig.url}
                  onChange={handleModelConfigFieldChange('url')}
                  allowClear
                  placeholder="OpenAI兼容API端点，例如：https://api.openai.com/v1"
                />
              </Form.Item>
              <Form.Item label="访问密钥">
                <Input.Password
                  value={modelConfig.key}
                  onChange={handleModelConfigFieldChange('key')}
                  allowClear
                  placeholder="输入API访问密钥"
                />
              </Form.Item>
              <Form.Item label="模型名称">
                <Input
                  value={modelConfig.model}
                  onChange={handleModelConfigFieldChange('model')}
                  allowClear
                  placeholder="例如：gpt-4o-mini 或 ernie-4.5-8k-preview"
                />
              </Form.Item>
              <Form.Item label="自定义提示词">
                <Input.TextArea
                  placeholder="可选：自定义模型指令"
                  value={modelConfig.prompt}
                  onChange={handleModelConfigFieldChange('prompt')}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" onClick={handleTestConfig} disabled={submitting || !onTestConfig}>
                  进行猜词
                </Button>
              </Form.Item>
            </Form>
          </Card>
          <Card title="AI 猜词结果">
            <GuessResultBlock guess={result} />
          </Card>
        </div>
        <div className="drawing-single-column drawing-single-column--center">
          <Card title="绘制目标">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={target}
                  placeholder="输入要画的词语（例如：苹果、猫、房子）"
                  maxLength={50}
                  allowClear
                  onChange={(e) => onTargetChange(e.target.value)}
                />
                <Button onClick={handleRandomTarget}>随机生成</Button>
              </Space.Compact>
            </Space>
          </Card>
          <Card title="绘画区">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <DrawBoard ref={drawBoardRef} onSubmit={onSubmit} submitting={submitting} />
            </Space>
          </Card>
        </div>
        <div className="drawing-single-column drawing-single-column--right">
          <Card
            title="历史测试记录"
            extra={
              history.length > 0 ? (
                <Button type="link" size="small" onClick={onReset}>
                  清空记录
                </Button>
              ) : null
            }
          >
            {history.length > 0 ? (
              <List
                dataSource={history}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar>{(item.guess.best_guess ?? '?').charAt(0).toUpperCase()}</Avatar>}
                      title={item.guess.best_guess ?? '暂无结果'}
                      description={
                        <Space direction="vertical" size="small">
                          <Text>提交时间：{formatRelativeTime(item.createdAt)}</Text>
                          <Text>目标词语：{item.target}</Text>
                          <Text>
                            猜测状态：
                            {item.guess.matched === true ? '猜中 ✅' : item.guess.matched === false ? '未猜中 ❌' : item.guess.success === false ? '失败 ⚠️' : '待确认'}
                          </Text>
                          {item.guess.alternatives && item.guess.alternatives.length > 0 && (
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
              <Empty description="还没有测试记录" />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SingleTester
