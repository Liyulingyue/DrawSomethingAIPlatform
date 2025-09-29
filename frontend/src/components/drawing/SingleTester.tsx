import { Card, Space, Input, Button, List, Avatar, Empty, Typography, Form } from 'antd'
import type { ChangeEvent } from 'react'
import DrawBoard from '../DrawBoard'
import GuessResultBlock from './GuessResultBlock'
import type { GuessPayload } from '../../hooks/useDrawingRoom'
import { formatRelativeTime } from '../../utils/api'

const { Text } = Typography

export interface ModelConfig {
  url: string
  key: string
  model: string
  prompt: string
}

export interface SingleHistoryEntry {
  id: number
  clue?: string
  createdAt: number
  guess: GuessPayload
}

interface SingleTesterProps {
  clue: string
  onClueChange: (value: string) => void
  onSubmit: (image: string) => void
  submitting: boolean
  onReset: () => void
  result: GuessPayload | null
  history: SingleHistoryEntry[]
  modelConfig: ModelConfig
  onModelConfigChange: (patch: Partial<ModelConfig>) => void
  onResetModelConfig: () => void
  isCustomConfig: boolean
}

const SingleTester = ({
  clue,
  onClueChange,
  onSubmit,
  submitting,
  onReset,
  result,
  history,
  modelConfig,
  onModelConfigChange,
  onResetModelConfig,
  isCustomConfig,
}: SingleTesterProps) => {
  const handleClueChange = (event: ChangeEvent<HTMLInputElement>) => {
    onClueChange(event.target.value)
  }

  const handleModelConfigFieldChange = (field: keyof ModelConfig) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onModelConfigChange({ [field]: event.target.value })
  }

  return (
    <div className="drawing-single">
      <div className="drawing-single-grid">
        <div className="drawing-single-column drawing-single-column--left">
          <Card
            title="模型配置"
            extra={
              <Button type="link" size="small" onClick={onResetModelConfig} disabled={!isCustomConfig}>
                恢复默认
              </Button>
            }
          >
            <Form layout="vertical">
              <Form.Item label="模型 URL">
                <Input
                  placeholder="例如：https://api.example.com/v1/inference"
                  value={modelConfig.url}
                  onChange={handleModelConfigFieldChange('url')}
                  allowClear
                />
              </Form.Item>
              <Form.Item label="访问密钥">
                <Input.Password
                  placeholder="用于鉴权的 API Key"
                  value={modelConfig.key}
                  onChange={handleModelConfigFieldChange('key')}
                  allowClear
                />
              </Form.Item>
              <Form.Item label="模型名称">
                <Input
                  placeholder="例如：ernie-4.5-vl-28b-a3b"
                  value={modelConfig.model}
                  onChange={handleModelConfigFieldChange('model')}
                  allowClear
                />
              </Form.Item>
              <Form.Item label="提示词">
                <Input.TextArea
                  placeholder="可选：自定义模型指令"
                  value={modelConfig.prompt}
                  onChange={handleModelConfigFieldChange('prompt')}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
              </Form.Item>
              <Text type="secondary">以上配置仅作用于单人测试，并保存在本地浏览器，不会同步至多人房间。</Text>
            </Form>
          </Card>
          <Card title="AI 猜词结果">
            <GuessResultBlock guess={result} />
          </Card>
        </div>
        <div className="drawing-single-column drawing-single-column--center">
          <Card title="绘画区（单人测试）">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Input
                value={clue}
                placeholder="可选线索（例如主题、颜色、动作等）"
                maxLength={120}
                allowClear
                onChange={handleClueChange}
              />
              <DrawBoard onSubmit={onSubmit} submitting={submitting} />
              <Space wrap>
                <Button onClick={onReset} disabled={!result && history.length === 0 && !clue}>
                  清空测试内容
                </Button>
              </Space>
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
                          {item.clue && <Text>线索：{item.clue}</Text>}
                          <Text>
                            猜测状态：
                            {item.guess.matched ? '猜中 ✅' : item.guess.success === false ? '失败 ⚠️' : '待确认'}
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
