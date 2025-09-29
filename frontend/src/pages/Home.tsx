import { Button, Card, Space, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import './Home.css'

const { Title, Paragraph, Text } = Typography

function Home() {
  const navigate = useNavigate()
  const { username, initializing } = useUser()

  return (
    <div className="home-wrapper">
      <div className="home-hero">
        <Title level={2}>让AI成为你的你画我猜裁判</Title>
        <Paragraph>
          DrawSomethingAIPlatform 复用了 GomokuAIBattlePlatform 的多人房间、用户体系与实时流程，
          加入了适配绘画玩法的画板与 ERNIE 识图判定。邀请好友一起绘制提示词，看看 AI 能否准确识别你的作品。
        </Paragraph>
        <Space size="middle" wrap>
          <Button type="primary" size="large" onClick={() => navigate('/rooms')}>
            进入房间大厅
          </Button>
          <Button size="large" onClick={() => navigate('/login')} disabled={initializing}>
            {username ? `当前用户：${username}` : '管理我的用户名'}
          </Button>
        </Space>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 900 }}>
        <Card title="平台特性">
          <Space direction="vertical" size="middle">
            <div>
              <Text strong>共享架构：</Text>
              <Text>沿用 Gomoku 平台的 FastAPI + React + Ant Design 技术栈，体验一致。</Text>
            </div>
            <div>
              <Text strong>实时房间：</Text>
              <Text>多人房主控制、准备状态、聊天互动全保留，适配你画我猜流程。</Text>
            </div>
            <div>
              <Text strong>AI 判定：</Text>
              <Text>集成文心一言视觉语言模型 ernie-4.5-vl-28b-a3b，根据画布内容识别提示词。</Text>
            </div>
          </Space>
        </Card>

        <Card title="快速开始">
          <Space direction="vertical" size="middle">
            <Text>1. 登录或自动分配用户名。</Text>
            <Text>2. 在房间大厅创建或加入你的小队。</Text>
            <Text>3. 房主设置提示词和绘画者，所有玩家准备完毕后一键开始。</Text>
            <Text>4. 绘画者提交作品后等待 AI 判定，可查看历史记录与聊天讨论。</Text>
          </Space>
        </Card>
      </Space>
    </div>
  )
}

export default Home
