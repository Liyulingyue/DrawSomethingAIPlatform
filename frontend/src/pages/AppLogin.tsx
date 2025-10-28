import { useState } from 'react'
import { Layout, Card, Typography, Space, Input, Button, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import './Login.css'

const { Content } = Layout
const { Title, Text } = Typography

function AppLogin() {
  const navigate = useNavigate()
  const { adminLogin, loading } = useUser()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      message.error('请输入用户名和密码')
      return
    }
    const result = await adminLogin(username.trim(), password.trim())
    if (result.success) {
      message.success(`管理员登录成功，欢迎 ${result.username}`)
      navigate('/gallery', { replace: true })
    } else if (result.message) {
      message.error(result.message)
    }
  }

  return (
    <Layout className="login-layout">
      <Content className="login-content">
        <Card className="login-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={3}>管理员登录</Title>
              <Text type="secondary">请输入管理员账号和密码</Text>
            </div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Input
                value={username}
                placeholder="用户名"
                onChange={(e) => setUsername(e.target.value)}
              />
              <Input.Password
                value={password}
                placeholder="密码"
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="primary" loading={loading} onClick={handleLogin} block>
                登录
              </Button>
            </Space>
          </Space>
        </Card>
      </Content>
    </Layout>
  )
}

export default AppLogin