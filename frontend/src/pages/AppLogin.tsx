import { useState, useEffect } from 'react'
import { Card, Typography, Space, Input, Button, message, Avatar, Tag, Modal } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { UserOutlined, LogoutOutlined, CrownOutlined, CreditCardOutlined } from '@ant-design/icons'
import './AppLogin.css'

const { Title, Text } = Typography

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8002'

function AppLogin() {
  const navigate = useNavigate()
  const { username, isAdmin, callsRemaining, adminLogin, loading, initializing, refreshUserInfo } = useUser()
  const [loginUsername, setLoginUsername] = useState('')
  const [password, setPassword] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false)
  const [rechargeLoading, setRechargeLoading] = useState(false)
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  // 进入页面时自动刷新登录状态
  useEffect(() => {
    const refreshLoginStatus = async () => {
      const sessionId = localStorage.getItem('sessionId')
      if (sessionId && !initializing) {
        console.log('🔄 进入登录页面，自动刷新登录状态')
        setRefreshingStatus(true)
        try {
          await refreshUserInfo()
        } finally {
          setRefreshingStatus(false)
        }
      }
    }
    refreshLoginStatus()
  }, [initializing, refreshUserInfo])

  const handleLogin = async () => {
    if (!loginUsername.trim()) {
      message.error('请输入用户名')
      return
    }

    if (!password.trim()) {
      message.error('请输入密码')
      return
    }

    // 首先尝试管理员登录
    const adminResult = await adminLogin(loginUsername.trim(), password.trim())
    if (adminResult.success) {
      message.success(`管理员登录成功，欢迎 ${adminResult.username}`)
      navigate('/app/gallery', { replace: true })
      return
    }

    // 如果管理员登录失败，尝试普通用户登录
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: password.trim()
        }),
      })

      if (response.ok) {
        const data = await response.json()
        message.success(`登录成功，欢迎 ${data.username}`)
        
        // 保存登录信息到localStorage
        localStorage.setItem('sessionId', data.session_id)
        localStorage.setItem('username', data.username)
        localStorage.setItem('isAdmin', 'false')
        
        // 刷新页面以更新用户状态
        window.location.reload()
      } else {
        const errorData = await response.json()
        message.error(errorData.message || '登录失败，请检查用户名和密码')
      }
    } catch (error) {
      console.error('Login failed:', error)
      message.error('登录失败，请稍后重试')
    }
  }

  const handleLogout = async () => {
    try {
      // 如果有sessionId，先调用后端登出API
      const sessionId = localStorage.getItem('sessionId')
      if (sessionId) {
        await fetch(`${API_BASE_URL}/auth/user/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId
          }),
        })
      }
    } catch (error) {
      console.warn('Logout API call failed:', error)
      // 即使API调用失败也要继续清理本地状态
    }

    // 清除本地存储的登录信息
    localStorage.removeItem('sessionId')
    localStorage.removeItem('username')
    localStorage.removeItem('isAdmin')

    // 设置退出登录标志，防止自动生成访客用户
    localStorage.setItem('justLoggedOut', 'true')

    message.success('已退出登录')

    // 强制跳转到登录页面
    window.location.href = '/app/login'
  }

  const handleRecharge = async () => {
    setRechargeLoading(true)
    try {
      const sessionId = localStorage.getItem('sessionId')
      if (!sessionId) {
        message.error('请先登录')
        return
      }

      const response = await fetch(`${API_BASE_URL}/auth/user/recharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          amount: 20
        }),
      })

      if (response.ok) {
        message.success(`充值成功！获得 20 次调用`)
        setRechargeModalVisible(false)
        // 刷新用户信息以更新调用次数显示
        await refreshUserInfo()
      } else {
        const errorData = await response.json()
        message.error(errorData.message || '充值失败')
      }
    } catch (error) {
      console.error('Recharge failed:', error)
      message.error('充值失败，请稍后重试')
    } finally {
      setRechargeLoading(false)
    }
  }

  // 如果正在初始化，显示加载状态
  if (initializing) {
    return (
      <>
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <SidebarTrigger onClick={() => setSidebarOpen(true)} />
        <div className="app-login-container">
          <div className="app-login-content">
            <div className="app-login-header">
              <h1 className="app-login-title">🎨 你画AI猜</h1>
              <p className="app-login-subtitle">DrawSomething AI Platform</p>
            </div>
            <Card className="app-login-card" bordered={false}>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Text>加载中...</Text>
              </div>
            </Card>
          </div>
          <AppFooter className="app-footer-light" />
        </div>
      </>
    )
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      <div className="app-login-container">
        <div className="app-login-content">
          <div className="app-login-header">
            <h1 className="app-login-title">🎨 你画AI猜</h1>
            <p className="app-login-subtitle">DrawSomething AI Platform</p>
          </div>

          <Card className="app-login-card" bordered={false}>
            {username ? (
              // 已登录状态
              <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                <div>
                  <Title level={3}>登录状态</Title>
                  <Text type="secondary">您已成功登录</Text>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <Avatar 
                    size={64} 
                    icon={<UserOutlined />} 
                    style={{ backgroundColor: isAdmin ? '#f56a00' : '#1890ff' }}
                  />
                  
                  <div>
                    <Text strong style={{ fontSize: '18px' }}>{username}</Text>
                    {isAdmin && (
                      <div style={{ marginTop: '8px' }}>
                        <Tag icon={<CrownOutlined />} color="gold">管理员</Tag>
                      </div>
                    )}
                    {!isAdmin && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tag color={callsRemaining > 0 ? 'blue' : 'orange'}>
                          剩余调用次数: {refreshingStatus ? '刷新中...' : callsRemaining}
                        </Tag>
                        <Button
                          size="small"
                          icon={<CreditCardOutlined />}
                          onClick={() => setRechargeModalVisible(true)}
                          style={{ fontSize: '12px', padding: '0 8px', height: '24px' }}
                        >
                          充值
                        </Button>
                      </div>
                    )}
                    {isAdmin && (
                      <div style={{ marginTop: '8px' }}>
                        <Tag color="gold">
                          剩余调用次数: {refreshingStatus ? '刷新中...' : '无限'}
                        </Tag>
                      </div>
                    )}
                  </div>

                  <Text type="secondary">
                    欢迎使用你画AI猜平台！
                  </Text>
                </div>

                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<LogoutOutlined />} 
                    onClick={handleLogout} 
                    block
                    danger
                  >
                    退出登录
                  </Button>
                  
                  <Button 
                    type="default" 
                    onClick={() => navigate('/app/home')} 
                    block
                  >
                    返回主页
                  </Button>
                </Space>
              </Space>
            ) : (
              // 未登录状态
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={3}>用户登录</Title>
                  <Text type="secondary">输入用户名和密码登录，登录使您能够使用服务器资源进行模型推理</Text>
                </div>

                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Input
                    value={loginUsername}
                    placeholder="用户名"
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />

                  <Input.Password
                    value={password}
                    placeholder="密码"
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <Button type="primary" loading={loading} onClick={handleLogin} block>
                    用户登录
                  </Button>

                  <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
                    💡 如果用户名不存在，将自动创建新用户
                  </Text>
                </Space>
              </Space>
            )}
          </Card>
        </div>
        <AppFooter className="app-footer-light" />
      </div>

      <Modal
        title={
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <CreditCardOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '8px' }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>充值调用次数</span>
          </div>
        }
        open={rechargeModalVisible}
        onOk={handleRecharge}
        onCancel={() => setRechargeModalVisible(false)}
        okText="立即充值"
        cancelText="取消"
        confirmLoading={rechargeLoading}
        width={400}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            color: 'white'
          }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
              20
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9 }}>
              次调用次数
            </div>
          </div>

          <div style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a', marginBottom: '8px' }}>
              🎉 充值礼包
            </div>
            <div style={{ color: '#666', lineHeight: '1.6' }}>
              • 获得 <strong>20次</strong> AI猜词调用次数<br/>
              • 可用于绘画识别和AI交互<br/>
              • 永久有效，无过期时间
            </div>
          </div>

          <div style={{
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            color: '#d46b08'
          }}>
            💡 每次AI猜词会消耗1次调用次数，请合理使用
          </div>
        </div>
      </Modal>
    </>
  )
}

export default AppLogin