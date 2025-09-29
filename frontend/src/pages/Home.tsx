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
              参考 GomokuAIBattlePlatform 的房间与会话设计，让玩家专注绘画、AI 负责猜词。
              随时邀请伙伴进入房间，共同帮助模型读懂你的创意。
            </Paragraph>
            <Title level={2} className="home-hero-subtitle">画出线索，交给模型来猜</Title>
            <Paragraph>
              房主配置目标词、组织队友整备，绘画者实时作画，AI 根据画面与线索进行推理，
              所有过程都被记录在房间日志中，方便复盘与分享。
            </Paragraph>
            <Space size="middle" wrap>
              <Link to="/rooms">
                <Button type="primary" size="large">进入房间大厅</Button>
              </Link>
              <Link to="/login">
                <Button size="large">管理我的用户名</Button>
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
            与 Gomoku 平台相同，我们保留了用户名管理、房主权限、聊天室与历史记录，让整个过程可控、可复盘。
            你可以在友好界面下迭代画面细节，直到模型给出正确答案。
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
              <span> 房主决定本回合的目标词，可选填线索帮助队友理解主题。</span>
            </li>
            <li>
              <Text strong>选择绘画者：</Text>
              <span> 在房间面板中直接指定负责绘画的玩家，其余成员辅助提供思路。</span>
            </li>
            <li>
              <Text strong>整备与开始：</Text>
              <span> 所有玩家点击“整备完毕”，房主确认后即可开始绘画回合。</span>
            </li>
            <li>
              <Text strong>提交作品：</Text>
              <span> 绘画者将画布提交给 AI，系统会即时给出猜测结果与备选词。</span>
            </li>
          </ol>
          <Paragraph className="home-section-tip" type="secondary">
            小提示：如果模型没能猜中，可继续补充细节或重新绘制，房主可随时重置回合以换词或轮换绘画者。
          </Paragraph>
        </>
      ),
    },
    {
      key: 'flow',
      className: 'home-slide home-slide--single',
      content: (
        <>
          <Title level={2} className="home-section-title">房间内有哪些协作组件？</Title>
          <ul className="home-list">
            <li>玩家列表与准备状态，方便房主确认整备情况并分配绘画者。</li>
            <li>实时画板，支持压力感画笔、颜色与粗细切换，并适配高分屏。</li>
            <li>AI 猜测面板，展示主猜、备选答案、置信度与匹配进度。</li>
            <li>回合历史记录，保留每次提交的目标词、猜测以及成功与否。</li>
            <li>内置聊天窗口，团队可以同步交流绘画思路与下一步计划。</li>
          </ul>
        </>
      ),
    },
    {
      key: 'ai',
      className: 'home-slide home-slide--multi',
      content: (
        <>
          <Title level={2} className="home-section-title">AI 接入与自定义能力</Title>
          <ul className="home-list">
            <li>默认集成百度文心视觉语言模型，支持自定义接入点和凭证配置。</li>
            <li>提示词（线索）只作为可选信息，AI 必须依靠画面来给出答案。</li>
            <li>前端与后端均复用 Gomoku 的轮询与容错设计，保证多人协作稳定。</li>
            <li>若未配置真实服务，系统会保留线索但不会提前泄露目标词。</li>
            <li>所有响应数据均在浏览器内呈现，方便你进行可视化和下一步评估。</li>
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
