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

function Introduction() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const isInTauriMode = isTauri()
  const { t } = useTranslation('introduction')

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
          <Card className="introduction-card" variant="borderless">
            <h2 className="section-title">
              <QuestionCircleOutlined /> {t('introduction.what_is.title')}
            </h2>
            {(t('introduction.what_is.content', { returnObjects: true }) as string[]).map((paragraph: string, index: number) => (
              <p key={index} className="section-content">{paragraph}</p>
            ))}
          </Card>

          {/* 功能特性 */}
          <Card className="introduction-card" variant="borderless">
            <h2 className="section-title">
              <RocketOutlined /> {t('introduction.features.title')}
            </h2>
            <div className="features-grid">
              {(t('introduction.features.items', { returnObjects: true }) as Array<{icon: string, title: string, desc: string}>).map((feature, index) => (
                <div key={index} className="feature-item">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 使用指南 */}
          <Card className="introduction-card" variant="borderless">
            <h2 className="section-title">
              <BulbOutlined /> {t('introduction.quick_start.title')}
            </h2>
            <Collapse 
              defaultActiveKey={[isInTauriMode ? '1' : 'login']} 
              ghost
              items={[
                // 登录说明只在非Tauri模式下显示
                ...(!isInTauriMode ? [{
                  key: 'login',
                  label: t('introduction.panels.login.header'),
                  children: (
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
                  )
                }] : []),
                {
                  key: '1',
                  label: t('introduction.panels.ai_setup.header'),
                  children: (
                    <div className="guide-content">
                      <p>{t('introduction.panels.ai_setup.desc')}</p>
                      <ul>
                        <li>{t('introduction.panels.ai_setup.steps.enter_config_page')}</li>
                        <li>{t('introduction.panels.ai_setup.steps.input_api_url')}</li>
                        <li>{t('introduction.panels.ai_setup.steps.input_api_key')}</li>
                        <li>{t('introduction.panels.ai_setup.steps.input_model_name')}</li>
                        <li>{t('introduction.panels.ai_setup.steps.test_connection')}</li>
                        <li>{t('introduction.panels.ai_setup.steps.save_config')}</li>
                      </ul>
                      
                      <h4>{t('introduction.panels.ai_setup.examples.title')}</h4>
                      {(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).baidu && (
                        <div style={{ marginBottom: '1rem' }}>
                          <h5>{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).baidu.name}:</h5>
                          <ul>
                            <li>API URL: <code>{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).baidu.api_url}</code></li>
                            <li>API Key: <a href="https://aistudio.baidu.com/account/accessToken" target="_blank" rel="noopener noreferrer">{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).baidu.api_key}</a></li>
                            <li>Model Name: <code>{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).baidu.model_name}</code></li>
                          </ul>
                        </div>
                      )}
                      
                      {(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).modelscope && (
                        <div style={{ marginBottom: '1rem' }}>
                          <h5>{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).modelscope.name}:</h5>
                          <ul>
                            <li>API URL: <code>{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).modelscope.api_url}</code></li>
                            <li>API Key: <a href="https://modelscope.cn/my/myaccesstoken" target="_blank" rel="noopener noreferrer">{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).modelscope.api_key}</a></li>
                            <li>Model Name: <code>{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).modelscope.model_name}</code></li>
                          </ul>
                        </div>
                      )}
                      
                      {(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).huggingface && (
                        <div style={{ marginBottom: '1rem' }}>
                          <h5>{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).huggingface.name}:</h5>
                          <ul>
                            <li>API URL: <code>{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).huggingface.api_url}</code></li>
                            <li>API Key: <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).huggingface.api_key}</a></li>
                            <li>Model Name: <code>{(t('introduction.panels.ai_setup.examples', { returnObjects: true }) as any).huggingface.model_name}</code></li>
                          </ul>
                        </div>
                      )}
                      
                      <p className="tip">{t('introduction.panels.ai_setup.tip')}</p>
                    </div>
                  )
                },
                {
                  key: '2',
                  label: t('introduction.panels.choose_mode.header'),
                  children: (
                    <div className="guide-content">
                      <p><strong>{t('introduction.panels.choose_mode.drawing_mode.title')}</strong></p>
                      <p>{t('introduction.panels.choose_mode.drawing_mode.desc')}</p>
                      <p><strong>{t('introduction.panels.choose_mode.guessing_mode.title')}</strong></p>
                      <p>{t('introduction.panels.choose_mode.guessing_mode.desc')}</p>
                    </div>
                  )
                },
                {
                  key: '3',
                  label: t('introduction.panels.start_draw.header'),
                  children: (
                    <div className="guide-content">
                      <ul>
                        <li>{t('introduction.panels.start_draw.step.input_target')}</li>
                        <li>{t('introduction.panels.start_draw.step.draw')}</li>
                        <li>{t('introduction.panels.start_draw.step.submit')}</li>
                      </ul>
                    </div>
                  )
                },
                {
                  key: '4',
                  label: t('introduction.panels.view_result.header'),
                  children: (
                    <div className="guide-content">
                      <p>{t('introduction.panels.view_result.desc')}</p>
                      <ul>
                        <li>{t('introduction.panels.view_result.step.choose_level')}</li>
                        <li>{t('introduction.panels.view_result.step.start_challenge')}</li>
                        <li>{t('introduction.panels.view_result.step.select_level')}</li>
                        <li>{t('introduction.panels.view_result.step.next_level')}</li>
                      </ul>
                      <p>{t('introduction.panels.view_result.result_desc')}</p>
                      <ul>
                        <li>✅ <strong>{t('introduction.panels.view_result.items.success_fail')}</strong></li>
                        <li>🔍 <strong>{t('introduction.panels.view_result.items.recognition')}</strong></li>
                        <li>📋 <strong>{t('introduction.panels.view_result.items.alternatives')}</strong></li>
                        <li>💬 <strong>{t('introduction.panels.view_result.items.analysis')}</strong></li>
                      </ul>
                    </div>
                  )
                }
              ]}
            />
          </Card>

          {/* 提示技巧 */}
          <Card className="introduction-card" variant="borderless">
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

          {/* 免责声明 */}
          <Card className="introduction-card disclaimer-card" variant="borderless">
            <h2 className="section-title">
              {t('introduction.disclaimer.title')}
            </h2>
            <div className="disclaimer-content">
              {(t('introduction.disclaimer.content', { returnObjects: true }) as string[]).map((paragraph: string, index: number) => (
                <p key={index} className="disclaimer-text">
                  <span className="disclaimer-bullet">🟠 </span>
                  {paragraph}
                </p>
              ))}
            </div>
          </Card>

          {/* GitHub 反馈提示 */}
          <Card className="introduction-card feedback-card" variant="borderless">
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
