import { useNavigate, useLocation } from 'react-router-dom'
import { Drawer, Menu, Button } from 'antd'
import {
  HomeOutlined,
  TrophyOutlined,
  EditOutlined,
  SettingOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  PictureOutlined,
  UserOutlined,
  HeartOutlined,
} from '@ant-design/icons'
import { isTauri } from '../utils/api'
import './AppSidebar.css'

interface AppSidebarProps {
  open: boolean
  onClose: () => void
}

function AppSidebar({ open, onClose }: AppSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // 检测是否在 Tauri 环境中
  const isInTauriMode = isTauri()

  const menuItems = [
    {
      key: '/app/home',
      icon: <HomeOutlined />,
      label: '主页',
    },
    // Tauri 模式下不显示登录按钮（自动登录管理员）
    ...(!isInTauriMode ? [{
      key: '/app/login',
      icon: <UserOutlined />,
      label: '登录',
    }] : []),
    {
      key: '/app/level-set',
      icon: <TrophyOutlined />,
      label: '绘画闯关',
    },
    {
      key: '/app/level-set-guess',
      icon: <TrophyOutlined />,
      label: '猜词闯关',
    },
    {
      key: '/app/my-custom-levels',
      icon: <PlusOutlined />,
      label: '我的自定义关卡',
    },
    {
      key: '/app/draw',
      icon: <EditOutlined />,
      label: '自由绘画',
    },
    {
      key: '/app/gallery',
      icon: <PictureOutlined />,
      label: '画廊',
    },
    {
      key: '/app/introduction',
      icon: <InfoCircleOutlined />,
      label: '使用说明',
    },
    {
      key: '/app/configAI',
      icon: <SettingOutlined />,
      label: 'AI 配置',
    },
    // Tauri 模式下不显示支持我们按钮（桌面应用）
    ...(!isInTauriMode ? [{
      key: '/app/donate',
      icon: <HeartOutlined />,
      label: '支持我们',
    }] : []),
  ]

  const handleMenuClick = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <Drawer
      title={
        <div className="app-sidebar-header">
          <span className="app-sidebar-title">DrawSomething AI</span>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="app-sidebar-close"
          />
        </div>
      }
      placement="left"
      onClose={onClose}
      open={open}
      width={280}
      closable={false}
      className="app-sidebar-drawer"
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        className="app-sidebar-menu"
        items={menuItems.map(item => ({
          ...item,
          onClick: () => handleMenuClick(item.key),
        }))}
      />
      
      <div className="app-sidebar-footer">
        <div className="app-sidebar-info">
          <p className="app-sidebar-version">Version 1.0.0</p>
          <p className="app-sidebar-copyright">© 2025 DrawSomething AI Platform</p>
        </div>
      </div>
    </Drawer>
  )
}

export default AppSidebar
