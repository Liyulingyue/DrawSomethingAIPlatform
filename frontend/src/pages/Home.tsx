import { useState, useRef, useEffect } from 'react'
import { Layout, Typography, Button, Space } from 'antd'
import { Link } from 'react-router-dom'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import Navbar from '../components/Navbar'
import './Home.css'

const { Content } = Layout
const { Title, Paragraph, Text } = Typography

function Home() {
  const [activeIndex, setActiveIndex] = useState(0)
  const sliderTrackRef = useRef<HTMLDivElement | null>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [trackOffset, setTrackOffset] = useState(0)

  const slides = [
    {
      key: 'hero',
      className: 'home-slide home-slide--hero',
      content: (
        <>
          <div className="home-hero-text">
            <Title level={1} className="home-hero-title">你画我猜 AI 协作平台</Title>
            <Paragraph className="home-hero-intro">
              让玩家专注绘画、AI 负责猜词。
              随时邀请伙伴进入房间，共同帮助模型读懂你的创意。
            </Paragraph>
            <Title level={2} className="home-hero-subtitle">画出线索，交给模型来猜</Title>
            <Paragraph>
              房主配置目标词、组织队友整备，绘画者实时作画，AI 根据画面与线索进行推理，
              所有过程都被记录在房间日志中，方便复盘与分享。
            </Paragraph>
            <Space size="middle" wrap>
              <Link to="/game/single">
                <Button type="primary" size="large">单人测试</Button>
              </Link>
              <Link to="/rooms">
                <Button size="large">多人游戏</Button>
              </Link>
            </Space>
          </div>
          <div className="home-hero-highlight">
            <Text strong>多人协作 · AI 猜词 · 实时画板</Text>
          </div>
        </>
      ),
    },
    {
      key: 'about',
      className: 'home-slide home-slide--about',
      content: (
        <>
          <Title level={2} className="home-section-title">为什么要与 AI 合作？</Title>
          <Paragraph className="home-section-paragraph">
            DrawSomethingAIPlatform 提供一个低门槛的画板与轮询服务，帮助你快速验证视觉大模型的理解力。
            通过多人协作的方式，玩家可以针对同一个目标词不断尝试不同的表达方式，观察 AI 的猜测与反馈。
          </Paragraph>
          <Paragraph className="home-section-paragraph">
            我们保留了用户名管理、房主权限、聊天室与历史记录，让整个过程可控、可复盘。
            你可以在友好界面下迭代画面细节，直到模型给出正确答案。
          </Paragraph>
          <Paragraph className="home-section-paragraph">
            和 AI 合作不仅解决了一个人无法游戏的问题，也让你可以随时体验“你画我猜”的乐趣。
            通过与 AI 的互动，你能更好地认识 AI 能力的边界，发现哪些表达方式容易被模型理解，哪些则是 AI 的盲区。
          </Paragraph>
        </>
      ),
    },
    {
      key: 'setup',
      className: 'home-slide home-slide--setup',
      content: (
        <>
          <Title level={2} className="home-section-title">如何开始一局合作猜词？</Title>
          <ol className="home-steps">
            <li>
              <Text strong>创建或加入房间：</Text>
              <span> 系统将自动生成本回合的目标词，所有玩家准备开始游戏。</span>
            </li>
            <li>
              <Text strong>所有玩家整备：</Text>
              <span> 所有玩家点击“整备完毕”以准备开始游戏。</span>
            </li>
            <li>
              <Text strong>开始回合：</Text>
              <span> 房主启动回合，系统自动选择第一位绘画者。</span>
            </li>
            <li>
              <Text strong>绘画与提交：</Text>
              <span> 绘画者作画并提交给 AI，系统会即时给出猜测结果与备选词。</span>
            </li>
            <li>
              <Text strong>AI 猜测与轮换：</Text>
              <span> AI 根据画面进行推理，如果所有猜测者完成，则轮换到下一位绘画者。</span>
            </li>
          </ol>
          <Paragraph className="home-section-tip" type="secondary">
            小提示：绘画者按顺序轮流承担，每回合结束后自动轮换。如果模型没能猜中，可继续补充细节或重新绘制，房主可重置回合重新开始。
          </Paragraph>
        </>
      ),
    },
    {
      key: 'flow',
      className: 'home-slide home-slide--ai',
      content: (
        <>
          <Title level={2} className="home-section-title">AI 接入与自定义能力</Title>
          <Paragraph className="home-section-paragraph">
            本项目专为<strong>多模态大模型</strong>设计，用于理解绘画内容而非简单的文本补全。请注意：对话补全模型（如 GPT-3.5）无法处理图像输入，请务必选择支持视觉理解的模型。
          </Paragraph>
          <Title level={3} className="home-section-subtitle">如何获取 API 密钥</Title>
          <Paragraph className="home-section-paragraph">
            访问 <a href="https://aistudio.baidu.com/account/accessToken" target="_blank" rel="noopener noreferrer">百度 AI Studio</a> 获取您的 API 密钥。
            系统默认集成百度文心视觉语言模型，您也可以配置其他兼容的多模态模型服务。
          </Paragraph>
          <Title level={3} className="home-section-subtitle">支持的模型列表</Title>
          <Paragraph className="home-section-paragraph">
            详细的可用模型请参考 <a href="https://ai.baidu.com/ai-doc/AISTUDIO/rm344erns" target="_blank" rel="noopener noreferrer">百度 AI 模型文档</a>。
            推荐使用支持图像输入的视觉语言模型，如文心一言 VL 或类似的多模态大模型。
          </Paragraph>
          <ul className="home-list">
            <li>支持自定义 API 端点和凭证配置，灵活接入不同模型服务。</li>
            <li>提示词（线索）仅作为可选辅助信息，AI 主要依靠画面内容进行推理。</li>
            <li>前端与后端采用轮询与容错设计，确保多人协作的稳定性。</li>
            <li>所有响应数据在浏览器本地呈现，便于可视化和评估结果。</li>
          </ul>
        </>
      ),
    },
  ]

  const totalSlides = slides.length

  const goToSlide = (index: number) => {
    setActiveIndex((index + totalSlides) % totalSlides)
  }

  const handlePrev = () => {
    goToSlide(activeIndex - 1)
  }

  const handleNext = () => {
    goToSlide(activeIndex + 1)
  }

  useEffect(() => {
    const track = sliderTrackRef.current
    const activeSlide = slideRefs.current[activeIndex]
    if (!track || !activeSlide) {
      return
    }

    const trackRect = track.getBoundingClientRect()
    const slideRect = activeSlide.getBoundingClientRect()
    const offset = (slideRect.left - trackRect.left) + slideRect.width / 2 - trackRect.width / 2

    setTrackOffset(offset)
  }, [activeIndex])

  useEffect(() => {
    const handleResize = () => {
      const track = sliderTrackRef.current
      const activeSlide = slideRefs.current[activeIndex]
      if (!track || !activeSlide) {
        return
      }

      const trackRect = track.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()
      const offset = (slideRect.left - trackRect.left) + slideRect.width / 2 - trackRect.width / 2
      setTrackOffset(offset)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [activeIndex])

  return (
    <Layout className="home-layout">
      <Navbar />
      <Content className="home-content">
        <main className="home-main">
          <div className="home-slider">
            <div
              className="home-slider-track"
              style={{ transform: `translateX(${-trackOffset}px)` }}
              ref={sliderTrackRef}
            >
              {slides.map((slide, index) => (
                <div
                  key={slide.key}
                  className="home-slide-wrapper"
                  ref={(node) => {
                    slideRefs.current[index] = node
                  }}
                >
                  <section className={slide.className}>
                    {slide.content}
                  </section>
                </div>
              ))}
            </div>

            <div className="home-slider-arrows">
              <Button
                shape="circle"
                size="large"
                icon={<LeftOutlined />}
                onClick={handlePrev}
                aria-label="上一页"
                className="home-slider-arrow home-slider-arrow--prev"
              />
              <Button
                shape="circle"
                size="large"
                icon={<RightOutlined />}
                onClick={handleNext}
                aria-label="下一页"
                className="home-slider-arrow home-slider-arrow--next"
              />
            </div>

            <div className="home-slider-dots" role="tablist" aria-label="首页内容分页">
              {slides.map((slide, index) => (
                <button
                  key={slide.key}
                  type="button"
                  className={`home-slider-dot ${index === activeIndex ? 'home-slider-dot--active' : ''}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`查看第 ${index + 1} 页`}
                  aria-selected={index === activeIndex}
                  role="tab"
                />
              ))}
            </div>
          </div>
        </main>
      </Content>
    </Layout>
  )
}

export default Home
