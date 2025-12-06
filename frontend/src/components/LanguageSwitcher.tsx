import React from 'react'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'
import './LanguageSwitcher.css'

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation()
  const current = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en'

  const onChange = (value: string) => {
    i18n.changeLanguage(value)
    try { localStorage.setItem('i18nextLng', value) } catch {}
  }

  return (
    <div className="language-switcher" title="Switch language">
      <Select 
        value={current} 
        onChange={onChange} 
        className="language-select"
        variant="borderless"
        aria-label="Language selector"
      >
        <Select.Option value="zh-CN">
          <span className="language-option-content">
            <span className="language-flag">🇨🇳</span>
            <span className="language-label">中文</span>
          </span>
        </Select.Option>
        <Select.Option value="en">
          <span className="language-option-content">
            <span className="language-flag">🇺🇸</span>
            <span className="language-label">English</span>
          </span>
        </Select.Option>
      </Select>
    </div>
  )
}

export default LanguageSwitcher
