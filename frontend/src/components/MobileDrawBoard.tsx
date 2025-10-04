import { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Slider, Space, Button } from 'antd'
import { ClearOutlined } from '@ant-design/icons'
import './MobileDrawBoard.css'

interface MobileDrawBoardProps {
  onDraw?: (image: string) => void
}

export interface MobileDrawBoardRef {
  getImage: () => string | null
  clearCanvas: () => void
}

const DEFAULT_COLOR = '#1f1f1f'
const DEFAULT_SIZE = 6
const COLOR_PRESETS = ['#1f1f1f', '#f5222d', '#faad14', '#52c41a', '#13c2c2', '#1677ff', '#722ed1', '#ffffff']

function MobileDrawBoard({ onDraw }: MobileDrawBoardProps, ref: React.Ref<MobileDrawBoardRef>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const brushColorRef = useRef(DEFAULT_COLOR)
  const brushSizeRef = useRef(DEFAULT_SIZE)

  const [isDrawing, setIsDrawing] = useState(false)
  const [brushColor, setBrushColor] = useState(DEFAULT_COLOR)
  const [brushSize, setBrushSize] = useState(DEFAULT_SIZE)
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 })

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getImage: () => {
      const canvas = canvasRef.current
      if (!canvas) return null
      return canvas.toDataURL('image/png')
    },
    clearCanvas: () => {
      clearCanvas()
    }
  }), [])

  const updateCanvasTransform = useCallback((displayWidth: number, displayHeight: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ratio = window.devicePixelRatio || 1
    canvas.width = displayWidth * ratio
    canvas.height = displayHeight * ratio
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    const context = canvas.getContext('2d')
    if (!context) return

    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = brushSizeRef.current
    context.strokeStyle = brushColorRef.current
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, displayWidth, displayHeight)

    contextRef.current = context
  }, [])

  // 计算画布尺寸
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resize = () => {
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      
      // 使用容器的实际尺寸，保持正方形或适应容器
      const size = Math.min(containerWidth, containerHeight)
      
      setCanvasSize({
        width: size,
        height: size,
      })
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    updateCanvasTransform(canvasSize.width, canvasSize.height)
  }, [canvasSize.width, canvasSize.height, updateCanvasTransform])

  useEffect(() => {
    brushColorRef.current = brushColor
    if (contextRef.current) {
      contextRef.current.strokeStyle = brushColor
    }
  }, [brushColor])

  useEffect(() => {
    brushSizeRef.current = brushSize
    if (contextRef.current) {
      contextRef.current.lineWidth = brushSize
    }
  }, [brushSize])

  const getCanvasCoords = useCallback((event: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }, [])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    
    // 阻止默认行为，防止页面滚动
    event.preventDefault()
    
    const ctx = contextRef.current
    if (!ctx) return
    
    const { x, y } = getCanvasCoords(event.nativeEvent)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    
    // 使用 pointer capture 确保后续事件都能捕获
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [getCanvasCoords])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    // 阻止默认行为，防止页面滚动
    event.preventDefault()
    
    const ctx = contextRef.current
    if (!ctx) return
    
    const { x, y } = getCanvasCoords(event.nativeEvent)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing, getCanvasCoords])

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    event.preventDefault()
    
    const ctx = contextRef.current
    if (!ctx) return
    
    ctx.closePath()
    setIsDrawing(false)
    
    event.currentTarget.releasePointerCapture(event.pointerId)

    // 绘画结束时同步图像数据
    if (onDraw) {
      const image = canvasRef.current?.toDataURL('image/png')
      if (image) {
        onDraw(image)
      }
    }
  }, [isDrawing, onDraw])

  const clearCanvas = useCallback(() => {
    const ctx = contextRef.current
    if (!ctx) return
    
    const { width: displayWidth, height: displayHeight } = canvasSize
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.restore()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, displayWidth, displayHeight)
    ctx.strokeStyle = brushColorRef.current
    ctx.lineWidth = brushSizeRef.current
  }, [canvasSize])

  return (
    <div className="mobile-draw-board">
      <div className="mobile-draw-board-toolbar">
        <Space className="mobile-draw-board-controls" wrap>
          <Space size="small">
            <span className="mobile-draw-board-label">颜色</span>
            <Space size={4} className="mobile-draw-board-colors" wrap>
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  className={`mobile-draw-board-color${color === brushColor ? ' active' : ''}`}
                  style={{ background: color, color: color === '#ffffff' ? '#ccc' : undefined }}
                  type="button"
                  onClick={() => setBrushColor(color)}
                  aria-label={`选择颜色 ${color}`}
                >
                  {color === '#ffffff' ? '擦' : ''}
                </button>
              ))}
            </Space>
          </Space>
          <Space size="small" align="center" className="mobile-draw-board-size-control">
            <span className="mobile-draw-board-label">粗细</span>
            <div className="mobile-draw-board-slider">
              <Slider
                min={2}
                max={24}
                step={1}
                value={brushSize}
                onChange={(value) => setBrushSize(value as number)}
              />
            </div>
          </Space>
        </Space>
        <Button
          type="default"
          icon={<ClearOutlined />}
          onClick={clearCanvas}
          size="small"
        >
          清空
        </Button>
      </div>
      
      <div className="mobile-draw-board-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="mobile-draw-board-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  )
}

export default forwardRef(MobileDrawBoard)
