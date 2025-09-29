import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Modal, Input, Button, message } from 'antd'
import { GithubOutlined } from '@ant-design/icons'
import './Navbar.css'
import { useUser } from '../context/UserContext'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { username, updateUsername, initializing, loading, suggestUsername } = useUser()
  const [modalVisible, setModalVisible] = useState(false)
  const [newUsername, setNewUsername] = useState('')

  const activeKey = useMemo(() => {
    if (location.pathname.startsWith('/rooms')) return 'rooms'
    if (location.pathname.startsWith('/game')) {
      const params = new URLSearchParams(location.search)
      if (params.get('tab') === 'single') {
        return 'single'
      }
      return 'game'
    }
    if (location.pathname.startsWith('/login')) return 'login'
    return 'home'
  }, [location.pathname, location.search])

  useEffect(() => {
    if (modalVisible) {
      setNewUsername(username)
    }
  }, [modalVisible, username])

  const handleUsernameClick = () => {
    if (initializing) {
      message.info('正在加载用户信息...')
      return
    }
    setModalVisible(true)
  }

  const handleOk = async () => {
    const trimmed = newUsername.trim()
    if (!trimmed) {
      message.error('用户名不能为空')
      return
    }
    if (!/^[a-zA-Z]+$/.test(trimmed)) {
      message.error('用户名只能包含英文字母')
      return
    }
    if (trimmed.length > 20) {
      message.error('用户名长度不能超过20个字符')
      return
    }

    const result = await updateUsername(trimmed)
    if (result.success) {
      message.success(result.message ?? '用户名更新成功')
      setModalVisible(false)
    } else {
      message.error(result.message ?? '用户名更新失败')
    }
  }

  const handleCancel = () => {
    setModalVisible(false)
  }

  const handleGenerate = async () => {
    const result = await suggestUsername()
    if (result.success && result.username) {
      setNewUsername(result.username)
      message.success('已生成随机用户名')
    } else {
      message.error(result.message ?? '获取用户名失败')
    }
  }

  const handleNavigate = (path: string) => {
    if (path === '/login') {
      navigate('/login')
      return
    }
    navigate(path)
  }

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand" onClick={() => handleNavigate('/')}>你画我猜AI平台</div>
        <ul className="nav-links">
          <li className={activeKey === 'home' ? 'active' : ''}><Link to="/">首页</Link></li>
          <li className={activeKey === 'single' ? 'active' : ''}><Link to="/game?tab=single">单人AI测试</Link></li>
          <li className={activeKey === 'rooms' ? 'active' : ''}><Link to="/rooms">房间大厅</Link></li>
          <li className={activeKey === 'game' ? 'active' : ''}><span onClick={() => message.info('请先进入房间后再开始对局')} role="button">对局</span></li>
        </ul>
        <div className="nav-actions">
          <a
            className="nav-source"
            href="https://github.com/Liyulingyue/DrawSomethingAIPlatform"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="DrawSomethingAIPlatform GitHub repository"
          >
            <GithubOutlined className="nav-source-icon" />
            <span className="nav-source-text">
              <span className="nav-source-repo">DrawSomethingAIPlatform</span>
              <span className="nav-source-owner">Liyulingyue</span>
            </span>
          </a>
          <div className="nav-user" onClick={handleUsernameClick} role="button">
            {initializing ? '加载中...' : username || '未命名用户'}
          </div>
        </div>
      </nav>
      <Modal
        title="更换用户名"
        open={modalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
        okText="确认"
        cancelText="取消"
      >
        <Input
          placeholder="输入新用户名"
          value={newUsername}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setNewUsername(event.target.value)}
          maxLength={20}
        />
        <Button type="link" onClick={handleGenerate} disabled={loading || initializing} style={{ padding: 0, marginTop: 12 }}>
          随机生成用户名
        </Button>
      </Modal>
    </>
  )
}

export default Navbar
