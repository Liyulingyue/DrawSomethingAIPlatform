export interface PosterData {
  drawingImage: string
  targetKeyword: string
  guessResult: string
  aiModel: string
  platformName?: string
  githubRepo?: string
}

export interface PosterConfig {
  width?: number
  height?: number
  backgroundColor?: string
  primaryColor?: string
  fontFamily?: string
  theme?: 'default' | 'gradient' | 'minimal' | 'colorful'
}

const DEFAULT_CONFIG: Required<Omit<PosterConfig, 'theme'>> & { theme: PosterConfig['theme'] } = {
  width: 800,
  height: 900,  // 减少页面高度到900px
  backgroundColor: '#ffffff',
  primaryColor: '#1677ff',
  fontFamily: '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif',
  theme: 'gradient'
}

// 主题配置
const THEMES = {
  default: {
    primaryColor: '#1677ff',
    secondaryColor: '#3b82f6',
    backgroundColor: '#ffffff'
  },
  gradient: {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    backgroundColor: '#f8fafc'
  },
  minimal: {
    primaryColor: '#374151',
    secondaryColor: '#6b7280',
    backgroundColor: '#ffffff'
  },
  colorful: {
    primaryColor: '#f59e0b',
    secondaryColor: '#ef4444',
    backgroundColor: '#fef3c7'
  }
}

export const generatePoster = (
  data: PosterData, 
  config: PosterConfig = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
    
    // 应用主题
    const theme = THEMES[finalConfig.theme || 'gradient']
    const primaryColor = config.primaryColor || theme.primaryColor
    const secondaryColor = theme.secondaryColor
    const backgroundColor = config.backgroundColor || theme.backgroundColor
    
    // 创建画布生成海报
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('无法创建画布'))
      return
    }

    // 设置海报尺寸
    canvas.width = finalConfig.width
    canvas.height = finalConfig.height

    // 创建渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    if (finalConfig.theme === 'minimal') {
      gradient.addColorStop(0, backgroundColor)
      gradient.addColorStop(1, backgroundColor)
    } else {
      gradient.addColorStop(0, '#f0f9ff')
      gradient.addColorStop(0.3, backgroundColor)
      gradient.addColorStop(0.7, backgroundColor)
      gradient.addColorStop(1, '#f8fafc')
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 添加装饰性圆圈（根据主题调整）
    if (finalConfig.theme !== 'minimal') {
      ctx.globalAlpha = 0.1
      ctx.fillStyle = primaryColor
      ctx.beginPath()
      ctx.arc(canvas.width - 100, 150, 80, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(100, canvas.height - 200, 60, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // 创建图片对象
    const drawingImg = new Image()
    drawingImg.onload = () => {
      try {
        // 添加顶部装饰条 - 稍微增高适应双行标题
        const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
        headerGradient.addColorStop(0, primaryColor)
        headerGradient.addColorStop(1, secondaryColor)
        ctx.fillStyle = headerGradient
        ctx.fillRect(0, 0, canvas.width, 100)

        // 中英文双行标题
        ctx.shadowColor = 'rgba(0,0,0,0.3)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetY = 2
        ctx.fillStyle = '#ffffff'
        
        // 中文标题
        ctx.font = `bold 38px ${finalConfig.fontFamily}`
        ctx.textAlign = 'center'
        ctx.fillText('我画AI猜', canvas.width / 2, 40)
        
        // 英文标题
        ctx.font = `bold 20px ${finalConfig.fontFamily}`
        ctx.fillText('Draw Something AI Platform', canvas.width / 2, 70)
        
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0

        // 绘制画作容器背景 - 增加更大的留白距离
        const imgSize = Math.min(450, canvas.width * 0.56)
        const imgX = (canvas.width - imgSize) / 2
        const imgY = 150  // 从130增加到150，增大与标题的距离
        
        // 画作阴影 - 更强的立体效果
        ctx.shadowColor = 'rgba(0,0,0,0.25)'
        ctx.shadowBlur = 30
        ctx.shadowOffsetY = 20
        ctx.fillStyle = '#ffffff'
        drawRoundedRect(ctx, imgX - 30, imgY - 30, imgSize + 60, imgSize + 60, 30)
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0

        // 绘制画作 - 确保完全居中
        ctx.save()
        drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, 20)
        ctx.clip()
        ctx.drawImage(drawingImg, imgX, imgY, imgSize, imgSize)
        ctx.restore()

        // 画作边框 - 更精致的边框
        ctx.strokeStyle = '#d1d5db'
        ctx.lineWidth = 3
        drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, 20)
        ctx.stroke()

        // 添加内边框效果
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        drawRoundedRect(ctx, imgX + 2, imgY + 2, imgSize - 4, imgSize - 4, 18)
        ctx.stroke()

        // 判断识别是否正确
        const isCorrect = data.targetKeyword.toLowerCase() === data.guessResult.toLowerCase() || 
                         data.guessResult.toLowerCase().includes(data.targetKeyword.toLowerCase())

        // 信息卡片区域 - 重新组织布局
        const mainInfoY = imgY + imgSize + 50  // 增加卡片与画作的距离，从30增加到50
        const cardHeight = 70
        const cardSpacing = 12
        const cardWidth = (canvas.width - 100 - cardSpacing) / 2
        
        // 第一行：目标词汇、识别状态
        const firstRowCards = [
          { 
            icon: '🎯', 
            label: '目标词汇', 
            value: data.targetKeyword, 
            color: '#dc2626',
            bgColor: ['#fef2f2', '#fee2e2']
          },
          { 
            icon: isCorrect ? '✅' : '❌', 
            label: '识别状态', 
            value: isCorrect ? '识别正确' : '识别错误', 
            color: isCorrect ? '#16a34a' : '#dc2626',
            bgColor: isCorrect ? ['#f0fdf4', '#dcfce7'] : ['#fef2f2', '#fee2e2']
          }
        ]

        // 第二行：AI模型、AI识别结果（同一行）
        const secondRowCards = [
          {
            icon: '🧠', 
            label: 'AI 模型', 
            value: data.aiModel,
            color: '#8b5cf6',
            bgColor: ['#faf5ff', '#f3e8ff']
          },
          {
            icon: '🤖', 
            label: 'AI 识别结果', 
            value: data.guessResult, 
            color: '#10b981',
            bgColor: ['#ecfdf5', '#d1fae5']
          }
        ]

        // 绘制第一行卡片
        firstRowCards.forEach((card, index) => {
          const cardX = 50 + index * (cardWidth + cardSpacing)
          const cardY = mainInfoY

          // 卡片阴影
          ctx.shadowColor = 'rgba(0,0,0,0.08)'
          ctx.shadowBlur = 8
          ctx.shadowOffsetY = 4
          
          // 卡片渐变背景
          const cardGradient = ctx.createLinearGradient(0, cardY, 0, cardY + cardHeight)
          cardGradient.addColorStop(0, card.bgColor[0])
          cardGradient.addColorStop(1, card.bgColor[1])
          ctx.fillStyle = cardGradient
          drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10)
          ctx.fill()
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetY = 0

          // 卡片边框
          ctx.strokeStyle = card.color + '30'
          ctx.lineWidth = 1.5
          drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10)
          ctx.stroke()

          // 图标
          ctx.fillStyle = card.color
          ctx.font = `20px ${finalConfig.fontFamily}`
          ctx.textAlign = 'center'
          ctx.fillText(card.icon, cardX + cardWidth / 2, cardY + 25)
          
          // 标签
          ctx.fillStyle = '#6b7280'
          ctx.font = `bold 12px ${finalConfig.fontFamily}`
          ctx.fillText(card.label, cardX + cardWidth / 2, cardY + 45)
          
          // 值
          ctx.fillStyle = '#374151'
          ctx.font = `14px ${finalConfig.fontFamily}`
          ctx.fillText(card.value, cardX + cardWidth / 2, cardY + 62)
        })

        // 绘制第二行卡片（AI模型、AI识别结果）
        secondRowCards.forEach((card, index) => {
          const cardX = 50 + index * (cardWidth + cardSpacing)
          const cardY = mainInfoY + cardHeight + cardSpacing

          // 卡片阴影
          ctx.shadowColor = 'rgba(0,0,0,0.08)'
          ctx.shadowBlur = 8
          ctx.shadowOffsetY = 4
          
          // 卡片渐变背景
          const cardGradient = ctx.createLinearGradient(0, cardY, 0, cardY + cardHeight)
          cardGradient.addColorStop(0, card.bgColor[0])
          cardGradient.addColorStop(1, card.bgColor[1])
          ctx.fillStyle = cardGradient
          drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10)
          ctx.fill()
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetY = 0

          // 卡片边框
          ctx.strokeStyle = card.color + '30'
          ctx.lineWidth = 1.5
          drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10)
          ctx.stroke()

          // 图标
          ctx.fillStyle = card.color
          ctx.font = `20px ${finalConfig.fontFamily}`
          ctx.textAlign = 'center'
          ctx.fillText(card.icon, cardX + cardWidth / 2, cardY + 25)
          
          // 标签
          ctx.fillStyle = '#6b7280'
          ctx.font = `bold 12px ${finalConfig.fontFamily}`
          ctx.fillText(card.label, cardX + cardWidth / 2, cardY + 45)
          
          // 值
          ctx.fillStyle = '#374151'
          ctx.font = `14px ${finalConfig.fontFamily}`
          // 对于AI模型名称较长的情况，进行适当的文本截断
          let displayValue = card.value
          if (card.label === 'AI 模型' && card.value.length > 20) {
            displayValue = card.value.substring(0, 17) + '...'
          }
          ctx.fillText(displayValue, cardX + cardWidth / 2, cardY + 62)
        })

        // 底部GitHub区域 - 调整位置以适应新的两行布局
        const secondRowBottomY = mainInfoY + (cardHeight + cardSpacing) * 2
        const footerY = secondRowBottomY + 30
        const footerHeight = canvas.height - footerY
        const footerGradient = ctx.createLinearGradient(0, footerY, canvas.width, footerY + footerHeight)
        footerGradient.addColorStop(0, primaryColor)
        footerGradient.addColorStop(1, secondaryColor)
        ctx.fillStyle = footerGradient
        drawRoundedRect(ctx, 0, footerY, canvas.width, footerHeight, 0)
        ctx.fill()

        // GitHub链接
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold 14px ${finalConfig.fontFamily}`
        ctx.textAlign = 'center'
        ctx.fillText('💻 github.com/Liyulingyue/DrawSomethingAIPlatform', canvas.width / 2, footerY + footerHeight / 2 + 2)

        // 版本水印
        ctx.font = `9px ${finalConfig.fontFamily}`
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.textAlign = 'right'
        ctx.fillText('v1.0', canvas.width - 10, canvas.height - 5)

        // 返回生成的海报数据URL
        resolve(canvas.toDataURL('image/png', 0.95))
      } catch (error) {
        reject(error)
      }
    }

    drawingImg.onerror = () => {
      reject(new Error('无法加载画作图片'))
    }

    drawingImg.src = data.drawingImage
  })
}

// 绘制圆角矩形的辅助函数
function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export const downloadPoster = (dataUrl: string, filename: string) => {
  try {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('下载海报失败:', error)
    throw new Error('下载海报失败')
  }
}

export const previewPoster = (dataUrl: string) => {
  const newWindow = window.open()
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head><title>海报预览</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#f0f0f0;">
          <img src="${dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />
        </body>
      </html>
    `)
  }
}