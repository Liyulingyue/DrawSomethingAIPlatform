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
  GithubOutlined,
} from '@ant-design/icons'
import { isTauri } from '../utils/api'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  const menuItems = [
    {
      key: '/app/home',
      icon: <HomeOutlined />,
      label: t('sidebar.home'),
    },
    // Tauri 模式下不显示登录按钮（自动登录管理员）
    ...(!isInTauriMode ? [{
      key: '/app/login',
      icon: <UserOutlined />,
      label: t('sidebar.login'),
    }] : []),
    {
      key: '/app/level-set',
      icon: <TrophyOutlined />,
      label: t('sidebar.level_draw'),
    },
    {
      key: '/app/level-set-guess',
      icon: <TrophyOutlined />,
      label: t('sidebar.level_guess'),
    },
    {
      key: '/app/my-custom-levels',
      icon: <PlusOutlined />,
      label: t('sidebar.my_custom_levels'),
    },
    {
      key: '/app/draw',
      icon: <EditOutlined />,
      label: t('sidebar.free_draw'),
    },
    {
      key: '/app/gallery',
      icon: <PictureOutlined />,
      label: t('sidebar.gallery'),
    },
    {
      key: '/app/introduction',
      icon: <InfoCircleOutlined />,
      label: t('sidebar.introduction'),
    },
    {
      key: '/app/configAI',
      icon: <SettingOutlined />,
      label: t('sidebar.config_ai'),
    },
    // Tauri 模式下不显示支持我们按钮（桌面应用）
    ...(!isInTauriMode ? [{
      key: '/app/donate',
      icon: <HeartOutlined />,
      label: t('sidebar.donate'),
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
          <span className="app-sidebar-title">{t('sidebar.title')}</span>
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
        <div className="app-sidebar-repository">
          <a 
            href="https://github.com/Liyulingyue/DrawSomethingAIPlatform" 
            target="_blank" 
            rel="noopener noreferrer"
            className="app-sidebar-repo-link"
            title={t('sidebar.repository_title')}
          >
            <GithubOutlined />
            <span>{t('sidebar.repository')}</span>
          </a>
        </div>
        <div className="app-sidebar-info">
          <p className="app-sidebar-version">{t('sidebar.version', { version: '1.0.0' })}</p>
          <p className="app-sidebar-copyright">{t('sidebar.copyright', { year: 2025 })}</p>
        </div>
      </div>
    </Drawer>
  )
}

export default AppSidebar
