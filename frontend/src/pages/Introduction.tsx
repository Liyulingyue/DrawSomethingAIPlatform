import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Collapse } from 'antd'
import { QuestionCircleOutlined, RocketOutlined, BulbOutlined, SettingOutlined, GithubOutlined, BugOutlined, HeartOutlined, HomeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import { isTauri } from '../utils/api'
import './Introduction.css'

const { Panel } = Collapse

function Introduction() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const isInTauriMode = isTauri()
  const { t } = useTranslation()

  const handleDonate = () => {
    navigate('/app/donate')
  }

  return (
    <>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarTrigger onClick={() => setSidebarOpen(true)} />
      
      <div className="introduction-container">
        <div className="introduction-content">
          {/* 标题区域 */}
          <div className="introduction-header">
            <h1 className="introduction-title">{t('introduction.title')}</h1>
            <p className="introduction-subtitle">{t('introduction.subtitle')}</p>
            <p className="introduction-description">{t('introduction.description')}</p>
          </div>

          {/* 简介卡片 */}
          <Card className="introduction-card" bordered={false}>
            <h2 className="section-title">
              <QuestionCircleOutlined /> {t('introduction.what_is.title')}
            </h2>
            <p className="section-content">{t('introduction.what_is.p1')}</p>
            <p className="section-content">{t('introduction.what_is.p2')}</p>
          </Card>

          {/* 功能特性 */}
          <Card className="introduction-card" bordered={false}>
            <h2 className="section-title">
              <RocketOutlined /> {t('introduction.features.title')}
            </h2>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🏆</div>
                <h3>{t('introduction.features.level_draw.title')}</h3>
                <p>{t('introduction.features.level_draw.desc')}</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎨</div>
                <h3>{t('introduction.features.free_draw.title')}</h3>
                <p>{t('introduction.features.free_draw.desc')}</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🤖</div>
                <h3>{t('introduction.features.ai.title')}</h3>
                <p>{t('introduction.features.ai.desc')}</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚙️</div>
                <h3>{t('introduction.features.config.title')}</h3>
                <p>{t('introduction.features.config.desc')}</p>
              </div>
            </div>
          </Card>

          {/* 使用指南 */}
          <Card className="introduction-card" bordered={false}>
            <h2 className="section-title">
              <BulbOutlined /> {t('introduction.quick_start.title')}
            </h2>
            <Collapse defaultActiveKey={['login']} ghost>
              <Panel header={t('introduction.panels.login.header')} key="login">
                <div className="guide-content">
                  <p><strong>{t('introduction.panels.login.note')}</strong></p>
                  <ul>
                    <li>✅ <strong>{t('introduction.panels.login.bullets.can_draw')}</strong></li>
                    <li>✅ <strong>{t('introduction.panels.login.bullets.can_use_ai')}</strong></li>
                    <li>✅ <strong>{t('introduction.panels.login.bullets.can_create')}</strong></li>
                  </ul>
                  <p><strong>{t('introduction.panels.login.extras_title')}</strong></p>
                  <ul>
                    <li>💰 <strong>{t('introduction.panels.login.extras.server_ai')}</strong></li>
                    <li>🖼️ <strong>{t('introduction.panels.login.extras.gallery')}</strong></li>
                    <li>🏆 <strong>{t('introduction.panels.login.extras.unlock')}</strong></li>
                  </ul>
                  <p className="tip">{t('introduction.panels.login.tip')}</p>
                </div>
              </Panel>
              <Panel header={t('introduction.panels.ai_setup.header')} key="1">
                <div className="guide-content">
                  <p>{t('introduction.panels.ai_setup.desc')}</p>
                  <ul>
                    <li>{t('introduction.panels.ai_setup.steps.enter_config_page')}</li>
                    <li>{t('introduction.panels.ai_setup.steps.input_api_url')}: <code>https://aistudio.baidu.com/llm/lmapi/v3</code></li>
                    <li>{t('introduction.panels.ai_setup.steps.input_api_key')} (<a href="https://aistudio.baidu.com/account/accessToken" target="_blank" rel="noopener noreferrer">百度 AI Studio</a>)</li>
                    <li>{t('introduction.panels.ai_setup.steps.input_model_name')}: <code>ernie-4.5-vl-28b-a3b</code></li>
                    <li>{t('introduction.panels.ai_setup.steps.test_connection')}</li>
                    <li>{t('introduction.panels.ai_setup.steps.save_config')}</li>
                  </ul>
                  <p className="tip">{t('introduction.panels.ai_setup.tip')}</p>
                </div>
              </Panel>
              <Panel header={t('introduction.panels.choose_mode.header')} key="2">
                <div className="guide-content">
                  <p><strong>{t('introduction.panels.choose_mode.mode.level_draw.title')}</strong></p>
                  <ul>
                    <li>{t('introduction.panels.choose_mode.mode.level_draw.step.choose_level')}</li>
                    <li>{t('introduction.panels.choose_mode.mode.level_draw.step.start_challenge')}</li>
                    <li>{t('introduction.panels.choose_mode.mode.level_draw.step.select_level')}</li>
                    <li>{t('introduction.panels.choose_mode.mode.level_draw.step.next_level')}</li>
                  </ul>
                  <p><strong>{t('introduction.panels.choose_mode.mode.free_draw.title')}</strong></p>
                  <ul>
                    <li>{t('introduction.panels.choose_mode.mode.free_draw.step.input_target')}</li>
                    <li>{t('introduction.panels.choose_mode.mode.free_draw.step.draw')}</li>
                    <li>{t('introduction.panels.choose_mode.mode.free_draw.step.submit')}</li>
                  </ul>
                </div>
              </Panel>
              <Panel header={t('introduction.panels.start_draw.header')} key="3">
                <div className="guide-content">
                  <ul>
                    <li>{t('introduction.panels.start_draw.step.brush')}</li>
                    <li>{t('introduction.panels.start_draw.step.color_brush')}</li>
                    <li>{t('introduction.panels.start_draw.step.erase')}</li>
                    <li>{t('introduction.panels.start_draw.step.submit_guess')}</li>
                  </ul>
                </div>
              </Panel>
              <Panel header={t('introduction.panels.view_result.header')} key="4">
                <div className="guide-content">
                  <p>{t('introduction.panels.view_result.desc')}</p>
                  <ul>
                    <li>✅ <strong>{t('introduction.panels.view_result.items.success_fail')}</strong></li>
                    <li>🔍 <strong>{t('introduction.panels.view_result.items.recognition')}</strong></li>
                    <li>📋 <strong>{t('introduction.panels.view_result.items.alternatives')}</strong></li>
                    <li>💬 <strong>{t('introduction.panels.view_result.items.analysis')}</strong></li>
                  </ul>
                </div>
              </Panel>
            </Collapse>
          </Card>

          {/* 提示技巧 */}
          <Card className="introduction-card" bordered={false}>
            <h2 className="section-title">{t('introduction.tips.title')}</h2>
            <div className="tips-grid">
              <div className="tip-item">
                <span className="tip-emoji">🎯</span>
                <p>{t('introduction.tips.items.featured')}</p>
              </div>
              <div className="tip-item">
                <span className="tip-emoji">✏️</span>
                <p>{t('introduction.tips.items.clear_lines')}</p>
              </div>
              <div className="tip-item">
                <span className="tip-emoji">🎨</span>
                <p>{t('introduction.tips.items.add_detail')}</p>
              </div>
              <div className="tip-item">
                <span className="tip-emoji">🔄</span>
                <p>{t('introduction.tips.items.dont_give_up')}</p>
              </div>
            </div>
          </Card>

          {/* GitHub 反馈提示 */}
          <Card className="introduction-card feedback-card" bordered={false}>
            <div className="feedback-content">
              <div className="feedback-icon">
                <BugOutlined />
              </div>
              <div className="feedback-text">
                <h3 className="feedback-title">{t('introduction.feedback.title')}</h3>
                <p className="feedback-description">{t('introduction.feedback.description')}</p>
                <Button
                  type="primary"
                  icon={<GithubOutlined />}
                  href="https://github.com/Liyulingyue/DrawSomethingAIPlatform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="feedback-button"
                >
                  {t('introduction.feedback.button')}
                </Button>
              </div>
            </div>
          </Card>

          {/* 底部按钮 */}
          <div className="introduction-actions">
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              onClick={() => navigate('/app/home')}
              className="action-button"
            >
              {t('introduction.actions.start')}
            </Button>
            <Button
              size="large"
              icon={<SettingOutlined />}
              onClick={() => navigate('/app/configAI')}
              className="action-button"
            >
              {t('introduction.actions.config')}
            </Button>
            {!isInTauriMode && (
              <Button
                size="large"
                icon={<HeartOutlined />}
                onClick={handleDonate}
                className="action-button action-button-donate"
              >
                {t('introduction.actions.donate')}
              </Button>
            )}
            <Button
              size="large"
              icon={<HomeOutlined />}
              onClick={() => navigate('/app/home')}
              className="action-button"
            >
              {t('introduction.actions.back_home')}
            </Button>
          </div>

        </div>
        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default Introduction
