import { useState } from 'react'
import { Button, Card, Collapse } from 'antd'
import { QuestionCircleOutlined, RocketOutlined, BulbOutlined, SettingOutlined, GithubOutlined, BugOutlined, HeartOutlined, HomeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import AppSidebar from '../components/AppSidebar'
import SidebarTrigger from '../components/SidebarTrigger'
import AppFooter from '../components/AppFooter'
import './Introduction.css'

const { Panel } = Collapse

function Introduction() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

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
            <h1 className="introduction-title">🎨 你画AI猜</h1>
            <p className="introduction-subtitle">DrawSomething AI Platform</p>
            <p className="introduction-description">
              一个基于 AI 视觉识别的趣味绘画挑战平台
            </p>
          </div>

          {/* 简介卡片 */}
          <Card className="introduction-card" bordered={false}>
            <h2 className="section-title">
              <QuestionCircleOutlined /> 什么是"你画AI猜"？
            </h2>
            <p className="section-content">
              "你画AI猜"是一个创新的绘画挑战平台，结合了人工智能图像识别技术和趣味游戏玩法。
              你只需要在画板上绘制指定的物品，AI 就会智能识别你的作品，判断你是否成功完成挑战。
            </p>
            <p className="section-content">
              无论是新手还是资深画家，都能在这里找到属于自己的乐趣。通过 AI 的即时反馈，
              你可以不断提升绘画技巧，挑战更高难度的关卡！
            </p>
          </Card>

          {/* 功能特性 */}
          <Card className="introduction-card" bordered={false}>
            <h2 className="section-title">
              <RocketOutlined /> 核心功能
            </h2>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🏆</div>
                <h3>绘画闯关</h3>
                <p>从新手入门到高级挑战，循序渐进提升绘画能力。每个关卡都有精心设计的关键词列表。</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎨</div>
                <h3>自由绘画</h3>
                <p>没有限制，随心所欲地创作。输入任意目标词，让 AI 识别你的作品。</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🤖</div>
                <h3>AI 智能识别</h3>
                <p>基于先进的视觉语言模型，AI 能够准确识别你的绘画内容并给出详细分析。</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚙️</div>
                <h3>自定义配置</h3>
                <p>支持配置自己的 AI 服务，使用百度 AI Studio 或其他兼容的 AI 模型。</p>
              </div>
            </div>
          </Card>

          {/* 使用指南 */}
          <Card className="introduction-card" bordered={false}>
            <h2 className="section-title">
              <BulbOutlined /> 快速开始
            </h2>
            <Collapse defaultActiveKey={['login']} ghost>
              <Panel header="📋 登录说明（可选）" key="login">
                <div className="guide-content">
                  <p><strong>不登录不影响正常游戏：</strong></p>
                  <ul>
                    <li>✅ <strong>可以正常绘画：</strong>所有绘画功能都可正常使用</li>
                    <li>✅ <strong>可以体验AI识别：</strong>如果您配置了自定义AI服务</li>
                    <li>✅ <strong>可以自由创作：</strong>绘画闯关和自由绘画模式都可用</li>
                  </ul>
                  <p><strong>登录后的额外功能：</strong></p>
                  <ul>
                    <li>💰 <strong>使用服务器AI资源：</strong>无需配置即可使用平台提供的AI服务</li>
                    <li>🖼️ <strong>作品管理：</strong>登录用户可以删除自己发布的画廊作品，未登录只能发布画廊作品，而无法主动删除</li>
                    <li>🏆 <strong>解锁高级功能：</strong>未来可能推出的更多功能</li>
                  </ul>
                  <p className="tip">💡 提示：如果您想使用平台AI服务进行识别，请先进行登录。登录后系统会自动为您分配点数用于AI调用。</p>
                </div>
              </Panel>
              <Panel header="2️⃣ 配置 AI 服务（首次使用）" key="1">
                <div className="guide-content">
                  <p>首次使用需要配置 AI 服务：</p>
                  <ul>
                    <li>进入"AI 配置"页面</li>
                    <li>输入 API URL：<code>https://aistudio.baidu.com/llm/lmapi/v3</code></li>
                    <li>输入你的 API Key（在 <a href="https://aistudio.baidu.com/account/accessToken" target="_blank" rel="noopener noreferrer">百度 AI Studio</a> 获取）</li>
                    <li>输入模型名称：<code>ernie-4.5-vl-28b-a3b</code></li>
                    <li>点击"测试连接"确保配置正确</li>
                    <li>点击"保存配置"</li>
                  </ul>
                  <p className="tip">💡 提示：如果没有配置 AI 服务，系统无法使用。</p>
                </div>
              </Panel>
              <Panel header="3️⃣ 选择游戏模式" key="2">
                <div className="guide-content">
                  <p><strong>绘画闯关：</strong></p>
                  <ul>
                    <li>选择一个关卡（如"新手入门"）</li>
                    <li>点击"开始挑战"从第一关开始</li>
                    <li>或者点击"选关挑战"选择特定关键词</li>
                    <li>成功完成后自动进入下一关</li>
                  </ul>
                  <p><strong>自由绘画：</strong></p>
                  <ul>
                    <li>输入任意目标词（如"苹果"、"房子"）</li>
                    <li>在画板上自由创作</li>
                    <li>提交后查看 AI 识别结果</li>
                  </ul>
                </div>
              </Panel>
              <Panel header="4️⃣ 开始绘画" key="3">
                <div className="guide-content">
                  <ul>
                    <li>使用画笔工具在画板上绘制</li>
                    <li>可以选择不同的颜色和笔刷大小</li>
                    <li>画错了可以使用橡皮擦或清空画板</li>
                    <li>完成后点击"提交猜词"</li>
                  </ul>
                </div>
              </Panel>
              <Panel header="5️⃣ 查看结果" key="4">
                <div className="guide-content">
                  <p>提交后，AI 会分析你的绘画并给出：</p>
                  <ul>
                    <li>✅ <strong>成功/失败判断：</strong>AI 是否识别出目标词</li>
                    <li>🔍 <strong>识别结果：</strong>AI 认为你画的是什么</li>
                    <li>📋 <strong>备选答案：</strong>其他可能的识别结果</li>
                    <li>💬 <strong>AI 分析：</strong>详细的识别分析和建议</li>
                  </ul>
                </div>
              </Panel>
            </Collapse>
          </Card>

          {/* 提示技巧 */}
          <Card className="introduction-card" bordered={false}>
            <h2 className="section-title">
              💡 绘画技巧
            </h2>
            <div className="tips-grid">
              <div className="tip-item">
                <span className="tip-emoji">🎯</span>
                <p>抓住关键特征，画出物品最明显的标志性元素</p>
              </div>
              <div className="tip-item">
                <span className="tip-emoji">✏️</span>
                <p>线条清晰，避免模糊不清的涂鸦</p>
              </div>
              <div className="tip-item">
                <span className="tip-emoji">🎨</span>
                <p>适当添加细节，让 AI 更容易识别</p>
              </div>
              <div className="tip-item">
                <span className="tip-emoji">🔄</span>
                <p>失败了不要气馁，根据 AI 反馈改进你的作品</p>
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
                <h3 className="feedback-title">发现问题？有改进建议？</h3>
                <p className="feedback-description">
                  欢迎前往 GitHub 项目页面反馈 Bug、提出建议或贡献代码！
                </p>
                <Button
                  type="primary"
                  icon={<GithubOutlined />}
                  href="https://github.com/Liyulingyue/DrawSomethingAIPlatform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="feedback-button"
                >
                  前往 GitHub 反馈
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
              开始使用
            </Button>
            <Button
              size="large"
              icon={<SettingOutlined />}
              onClick={() => navigate('/app/configAI')}
              className="action-button"
            >
              配置 AI
            </Button>
            <Button
              size="large"
              icon={<HeartOutlined />}
              onClick={handleDonate}
              className="action-button action-button-donate"
            >
              支持我们
            </Button>
            <Button
              size="large"
              icon={<HomeOutlined />}
              onClick={() => navigate('/app/home')}
              className="action-button"
            >
              返回主页
            </Button>
          </div>

        </div>
        <AppFooter className="app-footer-light" />
      </div>
    </>
  )
}

export default Introduction
