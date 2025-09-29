import { Alert, Space, Tag, Typography } from 'antd'
import type { GuessPayload } from '../../hooks/useDrawingRoom'

const { Text } = Typography

interface GuessResultBlockProps {
  guess: GuessPayload | null
}

const GuessResultBlock = ({ guess }: GuessResultBlockProps) => {
  if (!guess) {
    return <Text type="secondary">暂未获得 AI 猜测结果</Text>
  }

  if (guess.error) {
    return <Alert type="error" message={`AI 推理出错：${guess.error}`} showIcon />
  }

  const alternatives = guess.alternatives ?? []
  const matched = guess.matched ?? false
  const success = guess.success ?? (matched ? true : undefined)
  const bestGuessLabel = guess.best_guess ?? '暂无'

  let infoMessage = 'AI 已给出猜测结果，请人工确认是否正确。'
  let alertType: 'success' | 'info' | 'warning' = 'info'

  if (matched) {
    infoMessage = `模型猜中：${guess.matched_with ?? guess.best_guess ?? '目标词'}`
    alertType = 'success'
  } else if (success === false) {
    infoMessage = 'AI 未能返回有效猜测，请尝试重新绘制或调整线索。'
    alertType = 'warning'
  }

  return (
    <Space direction="vertical" size="middle">
      <Space wrap>
        <Text strong>主要猜测：</Text>
        <Tag color={matched ? 'success' : success === false ? 'default' : 'processing'}>{bestGuessLabel}</Tag>
      </Space>
      {alternatives.length > 0 && (
        <Space direction="vertical" size="small">
          <Text strong>备选答案：</Text>
          <Space wrap>
            {alternatives.map((alt) => (
              <Tag key={alt} color="default">{alt}</Tag>
            ))}
          </Space>
        </Space>
      )}
      {typeof guess.confidence === 'number' && (
        <Text type="secondary">置信度：{(guess.confidence * 100).toFixed(1)}%</Text>
      )}
      <Alert type={alertType} message={infoMessage} showIcon />
    </Space>
  )
}

export default GuessResultBlock
