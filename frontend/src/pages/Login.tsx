import { useEffect, useState, type ChangeEvent } from 'react'
import { Layout, Card, Typography, Space, Input, Button, message, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import './Login.css'

const { Content } = Layout
const { Title, Text } = Typography

function Login() {
  const navigate = useNavigate()
  const { username, login, updateUsername, loading, initializing, suggestUsername } = useUser()
  const [inputUsername, setInputUsername] = useState('')

  useEffect(() => {
    if (username) {
      setInputUsername(username)
    }
  }, [username])

  const handleLogin = async () => {
    const result = await login()
    if (result.success) {
      message.success(`欢迎回来，${result.username}`)
      navigate('/rooms', { replace: true })
    } else if (result.message) {
      message.error(result.message)
    }
  }

  const handleUpdate = async () => {
    const trimmed = inputUsername.trim()
    if (!trimmed) {
      message.error('用户名不能为空')
      return
    }
    const result = await updateUsername(trimmed)
    if (result.success) {
      message.success(result.message ?? '用户名更新成功')
    } else if (result.message) {
      message.error(result.message)
    }
  }

  const handleSuggest = async () => {
    const result = await suggestUsername()
    if (result.success && result.username) {
      setInputUsername(result.username)
    } else if (result.message) {
      message.error(result.message)
    }
  }

  if (initializing) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin tip="正在准备用户环境..." />
        </Content>
      </Layout>
    )
  }

  return (
    <Layout className="login-layout">
      <Content className="login-content">
        <Card className="login-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={3}>管理你的昵称</Title>
              <Text type="secondary">用户名将用于房间与聊天显示，可随时修改。</Text>
            </div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Input
                value={inputUsername}
                placeholder="输入新的用户名（仅支持英文）"
                maxLength={20}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setInputUsername(event.target.value)}
              />
              <Space wrap>
                <Button onClick={handleSuggest} disabled={loading}>随机生成</Button>
                <Button type="primary" loading={loading} onClick={handleUpdate}>保存用户名</Button>
              </Space>
            </Space>
            <div className="login-divider" />
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Text>还没有分配用户名？</Text>
              <Button type="primary" ghost loading={loading} onClick={handleLogin}>
                一键获取用户名
              </Button>
            </Space>
          </Space>
        </Card>
      </Content>
    </Layout>
  )
}

export default Login
