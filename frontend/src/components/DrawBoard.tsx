import { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Slider, Space, Button } from 'antd'
import { ClearOutlined } from '@ant-design/icons'
import './DrawBoard.css'

interface DrawBoardProps {
  width?: number
  height?: number
  submitting?: boolean
  disabled?: boolean
  onSubmit?: (image: string) => void
}

export interface DrawBoardRef {
  getImage: () => string | null
}

const DEFAULT_WIDTH = 560
const DEFAULT_HEIGHT = 420
const DEFAULT_COLOR = '#1f1f1f'
const DEFAULT_SIZE = 6
const COLOR_PRESETS = ['#1f1f1f', '#f5222d', '#faad14', '#52c41a', '#13c2c2', '#1677ff', '#722ed1', '#ffffff']

function DrawBoard({ width, height, disabled = false }: DrawBoardProps, ref: React.Ref<DrawBoardRef>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const brushColorRef = useRef(DEFAULT_COLOR)
  const brushSizeRef = useRef(DEFAULT_SIZE)

  const [isDrawing, setIsDrawing] = useState(false)
  const [brushColor, setBrushColor] = useState(DEFAULT_COLOR)
  const [brushSize, setBrushSize] = useState(DEFAULT_SIZE)
  const [canvasSize, setCanvasSize] = useState(() => ({
    width: width ?? DEFAULT_WIDTH,
    height: height ?? DEFAULT_HEIGHT,
  }))

  // 暴露getImage方法给父组件
  useImperativeHandle(ref, () => ({
    getImage: () => {
      const canvas = canvasRef.current
      if (!canvas) return null
      return canvas.toDataURL('image/png')
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

  useEffect(() => {
    if (width && height) {
      setCanvasSize({ width, height })
      return
    }

    const container = containerRef.current
    if (!container) return

    const aspect = (height ?? DEFAULT_HEIGHT) / (width ?? DEFAULT_WIDTH)

    const resize = () => {
      const rectWidth = container.clientWidth
      const maxWidth = Math.min(rectWidth, DEFAULT_WIDTH)
      setCanvasSize({
        width: maxWidth,
        height: Math.round(maxWidth * aspect),
      })
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [width, height])

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
    if (disabled || event.button !== 0) return
    const ctx = contextRef.current
    if (!ctx) return
    const { x, y } = getCanvasCoords(event.nativeEvent)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [disabled, getCanvasCoords])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const ctx = contextRef.current
    if (!ctx) return
    const { x, y } = getCanvasCoords(event.nativeEvent)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing, getCanvasCoords])

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const ctx = contextRef.current
    if (!ctx) return
    ctx.closePath()
    setIsDrawing(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [isDrawing])

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
    <div className="draw-board" ref={containerRef} style={{ position: 'relative' }}>
      <div className="draw-board-toolbar">
        <Space className="draw-board-controls" wrap>
          <Space size="small">
            <span className="draw-board-label">笔刷颜色</span>
            <Space size={6} className="draw-board-colors" wrap>
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  className={`draw-board-color${color === brushColor ? ' active' : ''}`}
                  style={{ background: color, color: color === '#ffffff' ? '#ccc' : undefined }}
                  type="button"
                  onClick={() => disabled ? undefined : setBrushColor(color)}
                  disabled={disabled}
                  aria-label={`选择颜色 ${color}`}
                >
                  {color === '#ffffff' ? '擦' : ''}
                </button>
              ))}
            </Space>
          </Space>
          <Space size="small" align="center">
            <span className="draw-board-label">笔刷粗细</span>
            <div className="draw-board-slider">
              <Slider
                min={2}
                max={24}
                step={1}
                value={brushSize}
                onChange={(value) => disabled ? undefined : setBrushSize(value as number)}
                disabled={disabled}
              />
            </div>
          </Space>
        </Space>
        <Button
          type="default"
          icon={<ClearOutlined />}
          onClick={() => disabled ? undefined : clearCanvas()}
          disabled={disabled}
        >
          清空
        </Button>
      </div>
      <div className="draw-board-canvas">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      {disabled && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            borderRadius: '12px',
            zIndex: 10,
          }}
        >
          <span style={{ color: '#666', fontSize: '16px', fontWeight: 'bold' }}>
            等待绘画阶段
          </span>
        </div>
      )}
    </div>
  )
}

export default forwardRef(DrawBoard)
