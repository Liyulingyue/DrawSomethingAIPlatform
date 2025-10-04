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
} from '@ant-design/icons'
import './AppSidebar.css'

interface AppSidebarProps {
  open: boolean
  onClose: () => void
}

function AppSidebar({ open, onClose }: AppSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/app/home',
      icon: <HomeOutlined />,
      label: '主页',
    },
    {
      key: '/app/level-set',
      icon: <TrophyOutlined />,
      label: '闯关模式',
    },
    {
      key: '/app/level-config',
      icon: <PlusOutlined />,
      label: '自定义关卡',
    },
    {
      key: '/app/draw',
      icon: <EditOutlined />,
      label: '自由绘画',
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
