import { useState, useEffect } from 'react'
import { Card, Typography, Space, Input, Button, message, Avatar, Tag, Modal } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { UserOutlined, LogoutOutlined, CrownOutlined, CreditCardOutlined } from '@ant-design/icons'
import { getApiBaseUrlSync } from '../config/api'
import { useTranslation } from 'react-i18next'
import './AppLogin.css'

const { Title, Text } = Typography

function AppLogin() {
  const navigate = useNavigate()
  const { username, isAdmin, callsRemaining, adminLogin, loading, initializing, refreshUserInfo } = useUser()
  const { t } = useTranslation('appLogin')
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
      message.error(t('appLogin.messages.usernameRequired'))
      return
    }

    if (!password.trim()) {
      message.error(t('appLogin.messages.passwordRequired'))
      return
    }

    // 首先尝试管理员登录
    const adminResult = await adminLogin(loginUsername.trim(), password.trim())
    if (adminResult.success) {
      message.success(t('appLogin.messages.adminLoginSuccess', { username: adminResult.username }))
      navigate('/app/gallery', { replace: true })
      return
    }

    // 如果管理员登录失败，尝试普通用户登录
    try {
      const response = await fetch(`${getApiBaseUrlSync()}/auth/user/login`, {
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
        message.success(t('appLogin.messages.loginSuccess', { username: data.username }))
        
        // 保存登录信息到localStorage
        localStorage.setItem('sessionId', data.session_id)
        localStorage.setItem('username', data.username)
        localStorage.setItem('isAdmin', 'false')
        
        // 刷新页面以更新用户状态
        window.location.reload()
      } else {
        const errorData = await response.json()
        message.error(errorData.message || t('appLogin.messages.loginFailed'))
      }
    } catch (error) {
      console.error('Login failed:', error)
      message.error(t('appLogin.messages.retryLater'))
    }
  }

  const handleLogout = async () => {
    try {
      // 如果有sessionId，先调用后端登出API
      const sessionId = localStorage.getItem('sessionId')
      if (sessionId) {
        await fetch(`${getApiBaseUrlSync()}/auth/user/logout`, {
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

    message.success(t('appLogin.messages.logoutSuccess'))

    // 强制跳转到登录页面
    window.location.href = '/app/login'
  }

  const handleRecharge = async () => {
    setRechargeLoading(true)
    try {
      const sessionId = localStorage.getItem('sessionId')
      if (!sessionId) {
        message.error(t('appLogin.messages.loginRequired'))
        return
      }

      const response = await fetch(`${getApiBaseUrlSync()}/auth/user/recharge`, {
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
        message.success(t('appLogin.messages.rechargeSuccess'))
        setRechargeModalVisible(false)
        // 刷新用户信息以更新调用次数显示
        await refreshUserInfo()
      } else {
        const errorData = await response.json()
        message.error(errorData.message || t('appLogin.messages.rechargeFailed'))
      }
    } catch (error) {
      console.error('Recharge failed:', error)
      message.error(t('appLogin.messages.rechargeFailed'))
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
              <h1 className="app-login-title">{t('appLogin.title')}</h1>
              <p className="app-login-subtitle">{t('appLogin.subtitle')}</p>
            </div>
            <Card className="app-login-card" variant="borderless">
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Text>{t('appLogin.loading')}</Text>
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
            <h1 className="app-login-title">{t('appLogin.title')}</h1>
            <p className="app-login-subtitle">{t('appLogin.subtitle')}</p>
          </div>

          <Card className="app-login-card" variant="borderless">
            {username ? (
              // 已登录状态
              <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                <div>
                  <Title level={3}>{t('appLogin.loginStatus.title')}</Title>
                  <Text type="secondary">{t('appLogin.loginStatus.loggedIn')}</Text>
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
                        <Tag icon={<CrownOutlined />} color="gold">{t('appLogin.loginStatus.adminTag')}</Tag>
                      </div>
                    )}
                    {!isAdmin && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tag color={callsRemaining > 0 ? 'blue' : 'orange'}>
                          {t('appLogin.loginStatus.callsRemaining')} {refreshingStatus ? t('appLogin.loginStatus.refreshing') : callsRemaining}
                        </Tag>
                        <Button
                          size="small"
                          icon={<CreditCardOutlined />}
                          onClick={() => setRechargeModalVisible(true)}
                          style={{ fontSize: '12px', padding: '0 8px', height: '24px' }}
                        >
                          {t('appLogin.loginStatus.recharge')}
                        </Button>
                      </div>
                    )}
                    {isAdmin && (
                      <div style={{ marginTop: '8px' }}>
                        <Tag color="gold">
                          {t('appLogin.loginStatus.callsRemaining')} {refreshingStatus ? t('appLogin.loginStatus.refreshing') : t('appLogin.loginStatus.unlimited')}
                        </Tag>
                      </div>
                    )}
                  </div>

                  <Text type="secondary">
                    {t('appLogin.loginStatus.welcome')}
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
                    {t('appLogin.loginStatus.logout')}
                  </Button>
                  
                  <Button 
                    type="default" 
                    onClick={() => navigate('/app/home')} 
                    block
                  >
                    {t('appLogin.loginStatus.backHome')}
                  </Button>
                </Space>
              </Space>
            ) : (
              // 未登录状态
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={3}>{t('appLogin.userLogin.title')}</Title>
                  <Text type="secondary">{t('appLogin.userLogin.description')}</Text>
                </div>

                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Input
                    value={loginUsername}
                    placeholder={t('appLogin.userLogin.usernamePlaceholder')}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />

                  <Input.Password
                    value={password}
                    placeholder={t('appLogin.userLogin.passwordPlaceholder')}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <Button type="primary" loading={loading} onClick={handleLogin} block>
                    {t('appLogin.userLogin.loginButton')}
                  </Button>

                  <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
                    {t('appLogin.userLogin.autoCreateHint')}
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
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{t('appLogin.rechargeModal.title')}</span>
          </div>
        }
        open={rechargeModalVisible}
        onOk={handleRecharge}
        onCancel={() => setRechargeModalVisible(false)}
        okText={t('appLogin.rechargeModal.okText')}
        cancelText={t('appLogin.rechargeModal.cancelText')}
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
              {t('appLogin.rechargeModal.amount')}
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9 }}>
              {t('appLogin.rechargeModal.unit')}
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
              {t('appLogin.rechargeModal.packageTitle')}
            </div>
            <div style={{ color: '#666', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: t('appLogin.rechargeModal.packageDesc') }}>
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
            {t('appLogin.rechargeModal.tip')}
          </div>
        </div>
      </Modal>
    </>
  )
}

export default AppLogin