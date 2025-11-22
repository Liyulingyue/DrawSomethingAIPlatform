/**
 * 简笔画生成和分解 API
 */
import { api } from './api'

export interface SketchStep {
  final_sketch: string
  steps: string[]
  total_steps: number
  original_contours: number
}

export interface GenerateSketchRequest {
  prompt: string
  max_steps?: number
  sort_method?: 'area' | 'position'
}

export interface DecomposeImageRequest {
  image: string
  max_steps?: number
  sort_method?: 'area' | 'position'
}

// 简笔画缓存
const SKETCH_CACHE_KEY = 'sketch_cache'
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24小时

// 全局请求锁，防止并发请求同一个 prompt
const pendingRequests = new Map<string, Promise<SketchStep>>()

interface CachedSketch {
  data: SketchStep
  timestamp: number
}

/**
 * 获取缓存的简笔画
 */
function getCachedSketch(prompt: string): SketchStep | null {
  try {
    const cache = localStorage.getItem(SKETCH_CACHE_KEY)
    if (!cache) return null

    const cacheMap: Record<string, CachedSketch> = JSON.parse(cache)
    const cached = cacheMap[prompt]

    if (!cached) return null

    // 检查是否过期
    if (Date.now() - cached.timestamp > CACHE_EXPIRY_MS) {
      delete cacheMap[prompt]
      localStorage.setItem(SKETCH_CACHE_KEY, JSON.stringify(cacheMap))
      return null
    }

    console.log(`💾 从缓存加载简笔画: ${prompt}`)
    return cached.data
  } catch (error) {
    console.error('读取缓存失败:', error)
    return null
  }
}

/**
 * 缓存简笔画
 */
function setCachedSketch(prompt: string, data: SketchStep): void {
  try {
    const cache = localStorage.getItem(SKETCH_CACHE_KEY)
    const cacheMap: Record<string, CachedSketch> = cache ? JSON.parse(cache) : {}

    cacheMap[prompt] = {
      data,
      timestamp: Date.now()
    }

    localStorage.setItem(SKETCH_CACHE_KEY, JSON.stringify(cacheMap))
    console.log(`💾 缓存简笔画: ${prompt}`)
  } catch (error) {
    console.error('保存缓存失败:', error)
  }
}

/**
 * 生成简笔画并分解为步骤
 */
export async function generateSketch(request: GenerateSketchRequest): Promise<SketchStep> {
  const cacheKey = request.prompt
  
  // 先检查缓存
  const cached = getCachedSketch(cacheKey)
  if (cached) {
    return cached
  }

  // 检查是否有相同的请求正在进行
  const pending = pendingRequests.get(cacheKey)
  if (pending) {
    console.log(`⏳ 等待正在进行的请求: ${cacheKey}`)
    return pending
  }

  // 创建新请求
  const requestPromise = (async () => {
    try {
      console.log(`🌐 发起网络请求: ${cacheKey}`)
      const response = await api.post('/sketch/generate', {
        prompt: request.prompt,
        max_steps: request.max_steps ?? 20,
        sort_method: request.sort_method ?? 'position'
      }, {
        timeout: 60000 // 60秒超时
      })

      const data = response.data.data
      
      // 缓存结果
      setCachedSketch(cacheKey, data)
      
      return data
    } finally {
      // 请求完成后移除锁
      pendingRequests.delete(cacheKey)
    }
  })()

  // 添加到待处理请求
  pendingRequests.set(cacheKey, requestPromise)
  
  return requestPromise
}

/**
 * 分解已有图片为简笔画步骤
 */
export async function decomposeImage(request: DecomposeImageRequest): Promise<SketchStep> {
  const response = await api.post('/sketch/decompose', {
    image: request.image,
    max_steps: request.max_steps ?? 20,
    sort_method: request.sort_method ?? 'position'
  }, {
    timeout: 30000 // 30秒超时
  })
  return response.data.data
}
