// AI 配置管理工具类
export interface AIConfig {
  // 视觉模型配置（你画AI猜）
  visionUrl: string
  visionKey: string
  visionModelName: string
  
  // 文生图模型配置（AI画你猜）
  imageUrl: string
  imageKey: string
  imageModelName: string
  
  callPreference: 'custom' | 'server'  // 调用偏好：自定义服务或服务器调用点
}

// 默认配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  // 视觉模型默认配置
  visionUrl: 'https://aistudio.baidu.com/llm/lmapi/v3',
  visionKey: '',
  visionModelName: 'ernie-4.5-vl-28b-a3b',
  
  // 文生图模型默认配置
  imageUrl: 'https://aistudio.baidu.com/llm/lmapi/v3',
  imageKey: '',
  imageModelName: 'Stable-Diffusion-XL',
  
  callPreference: 'server',  // 默认使用服务器调用点
}

// 不同平台的预设配置
export const PLATFORM_PRESETS = {
  baidu: {
    name: 'Baidu AI Studio',
    visionUrl: 'https://aistudio.baidu.com/llm/lmapi/v3',
    visionKey: '',
    visionModelName: 'ernie-4.5-vl-28b-a3b',
    imageUrl: 'https://aistudio.baidu.com/llm/lmapi/v3',
    imageKey: '',
    imageModelName: 'Stable-Diffusion-XL',
    callPreference: 'server' as const,
  },
  modelscope: {
    name: 'ModelScope',
    visionUrl: 'https://api-inference.modelscope.cn/v1',
    visionKey: '',
    visionModelName: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
    imageUrl: 'https://api-inference.modelscope.cn/v1',
    imageKey: '',
    imageModelName: '',
    callPreference: 'custom' as const,
  },
  huggingface: {
    name: 'Hugging Face',
    visionUrl: 'https://router.huggingface.co/v1',
    visionKey: '',
    visionModelName: 'baidu/ERNIE-4.5-VL-28B-A3B-PT:fastest',
    imageUrl: 'https://router.huggingface.co/v1',
    imageKey: '',
    imageModelName: '',
    callPreference: 'custom' as const,
  },
}

// 本地存储键名
const AI_CONFIG_KEYS = {
  // 视觉模型
  VISION_URL: 'ai_vision_url',
  VISION_KEY: 'ai_vision_key',
  VISION_MODEL_NAME: 'ai_vision_model_name',
  
  // 文生图模型
  IMAGE_URL: 'ai_image_url',
  IMAGE_KEY: 'ai_image_key',
  IMAGE_MODEL_NAME: 'ai_image_model_name',
  
  CALL_PREFERENCE: 'ai_call_preference',
} as const

/**
 * 获取完整的 AI 配置
 */
export const getAIConfig = (): AIConfig => {
  try {
    const storedCallPreference = localStorage.getItem(AI_CONFIG_KEYS.CALL_PREFERENCE)
    const callPreference = (storedCallPreference === 'custom' || storedCallPreference === 'server')
      ? storedCallPreference as 'custom' | 'server'
      : DEFAULT_AI_CONFIG.callPreference

    return {
      // 视觉模型配置
      visionUrl: localStorage.getItem(AI_CONFIG_KEYS.VISION_URL) || DEFAULT_AI_CONFIG.visionUrl,
      visionKey: localStorage.getItem(AI_CONFIG_KEYS.VISION_KEY) || DEFAULT_AI_CONFIG.visionKey,
      visionModelName: localStorage.getItem(AI_CONFIG_KEYS.VISION_MODEL_NAME) || DEFAULT_AI_CONFIG.visionModelName,
      
      // 文生图模型配置
      imageUrl: localStorage.getItem(AI_CONFIG_KEYS.IMAGE_URL) || DEFAULT_AI_CONFIG.imageUrl,
      imageKey: localStorage.getItem(AI_CONFIG_KEYS.IMAGE_KEY) || DEFAULT_AI_CONFIG.imageKey,
      imageModelName: localStorage.getItem(AI_CONFIG_KEYS.IMAGE_MODEL_NAME) || DEFAULT_AI_CONFIG.imageModelName,
      
      callPreference,
    }
  } catch (error) {
    console.warn('获取 AI 配置失败，使用默认配置:', error)
    return { ...DEFAULT_AI_CONFIG }
  }
}

/**
 * 保存完整的 AI 配置
 */
export const saveAIConfig = (config: AIConfig): boolean => {
  try {
    if (!config.callPreference) {
      console.warn('callPreference 未定义，跳过保存')
      return false
    }
    
    // 保存视觉模型配置
    localStorage.setItem(AI_CONFIG_KEYS.VISION_URL, config.visionUrl || '')
    localStorage.setItem(AI_CONFIG_KEYS.VISION_KEY, config.visionKey || '')
    localStorage.setItem(AI_CONFIG_KEYS.VISION_MODEL_NAME, config.visionModelName || '')
    
    // 保存文生图模型配置
    localStorage.setItem(AI_CONFIG_KEYS.IMAGE_URL, config.imageUrl || '')
    localStorage.setItem(AI_CONFIG_KEYS.IMAGE_KEY, config.imageKey || '')
    localStorage.setItem(AI_CONFIG_KEYS.IMAGE_MODEL_NAME, config.imageModelName || '')
    
    localStorage.setItem(AI_CONFIG_KEYS.CALL_PREFERENCE, config.callPreference || 'server')
    return true
  } catch (error) {
    console.error('保存 AI 配置失败:', error)
    return false
  }
}

/**
 * 检查 AI 配置是否完整
 */
export const isAIConfigValid = (config?: AIConfig, modelType: 'vision' | 'image' = 'vision'): boolean => {
  const currentConfig = config || getAIConfig()
  
  // 如果选择服务器调用点，则配置始终有效
  if (currentConfig.callPreference === 'server') {
    return true
  }
  
  // 如果选择自定义服务，则需要检查对应模型的 API 配置是否完整
  if (modelType === 'vision') {
    return !!(
      currentConfig.visionUrl &&
      currentConfig.visionKey &&
      currentConfig.visionModelName
    )
  } else {
    return !!(
      currentConfig.imageUrl &&
      currentConfig.imageKey &&
      currentConfig.imageModelName
    )
  }
}

/**
 * 重置 AI 配置为默认值
 */
export const resetAIConfig = (): boolean => {
  return saveAIConfig({ ...DEFAULT_AI_CONFIG })
}

/**
 * 重置为指定平台的预设配置
 */
export const resetAIConfigToPlatform = (platform: keyof typeof PLATFORM_PRESETS): boolean => {
  try {
    const preset = PLATFORM_PRESETS[platform]
    if (!preset) {
      console.error(`未知平台: ${platform}`)
      return false
    }

    const config: AIConfig = {
      visionUrl: preset.visionUrl,
      visionKey: preset.visionKey,
      visionModelName: preset.visionModelName,
      imageUrl: preset.imageUrl,
      imageKey: preset.imageKey,
      imageModelName: preset.imageModelName,
      callPreference: preset.callPreference,
    }

    return saveAIConfig(config)
  } catch (error) {
    console.error('重置平台配置失败:', error)
    return false
  }
}

/**
 * 获取用于 API 调用的请求头
 */
export const getAIRequestHeaders = (modelType: 'vision' | 'image' = 'vision'): Record<string, string> => {
  const config = getAIConfig()
  const key = modelType === 'vision' ? config.visionKey : config.imageKey
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
  }
}

/**
 * 获取 AI API 的完整请求配置
 */
export const getAIRequestConfig = (modelType: 'vision' | 'image' = 'vision') => {
  const config = getAIConfig()
  
  if (!isAIConfigValid(config, modelType)) {
    const modelName = modelType === 'vision' ? '视觉模型' : '文生图模型'
    throw new Error(`${modelName}配置不完整，请先在设置页面配置 ${modelName} 服务参数`)
  }

  const url = modelType === 'vision' ? config.visionUrl : config.imageUrl
  const modelName = modelType === 'vision' ? config.visionModelName : config.imageModelName

  return {
    url,
    headers: getAIRequestHeaders(modelType),
    model: modelName,
  }
}

/**
 * 创建标准的 AI 请求体
 */
export const createAIRequestBody = (
  messages: Array<{ role: string; content: string | Array<any> }>,
  modelType: 'vision' | 'image' = 'vision',
  options?: {
    temperature?: number
    max_tokens?: number
    top_p?: number
  }
) => {
  const config = getAIConfig()
  const modelName = modelType === 'vision' ? config.visionModelName : config.imageModelName
  
  return {
    model: modelName,
    messages,
    temperature: options?.temperature || 0.7,
    max_tokens: options?.max_tokens || 1000,
    top_p: options?.top_p || 0.9,
    stream: false,
  }
}

/**
 * 监听配置变化的回调类型
 */
export type AIConfigChangeCallback = (config: AIConfig) => void

// 配置变化监听器
const configChangeListeners: AIConfigChangeCallback[] = []

/**
 * 添加配置变化监听器
 */
export const addAIConfigChangeListener = (callback: AIConfigChangeCallback) => {
  configChangeListeners.push(callback)
}

/**
 * 移除配置变化监听器
 */
export const removeAIConfigChangeListener = (callback: AIConfigChangeCallback) => {
  const index = configChangeListeners.indexOf(callback)
  if (index > -1) {
    configChangeListeners.splice(index, 1)
  }
}

/**
 * 通知所有监听器配置已变化
 */
export const notifyAIConfigChange = () => {
  const currentConfig = getAIConfig()
  configChangeListeners.forEach(callback => {
    try {
      callback(currentConfig)
    } catch (error) {
      console.error('配置变化监听器执行失败:', error)
    }
  })
}

/**
 * 带通知的保存配置函数
 */
export const saveAIConfigWithNotification = (config: AIConfig): boolean => {
  const success = saveAIConfig(config)
  if (success) {
    notifyAIConfigChange()
  }
  return success
}