import { Button } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import './SidebarTrigger.css'

interface SidebarTriggerProps {
  onClick: () => void
  isDark?: boolean
}

function SidebarTrigger({ onClick, isDark = false }: SidebarTriggerProps) {
  return (
    <Button
      type="text"
      icon={<MenuOutlined />}
      onClick={onClick}
      className={`sidebar-trigger ${isDark ? 'sidebar-trigger-dark' : ''}`}
      aria-label="打开菜单"
    />
  )
}

export default SidebarTrigger
