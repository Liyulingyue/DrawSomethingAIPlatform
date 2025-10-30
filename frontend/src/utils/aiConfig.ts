// AI 配置管理工具类
export interface AIConfig {
  url: string
  key: string
  modelName: string
  callPreference: 'custom' | 'server'  // 调用偏好：自定义服务或服务器调用点
}

// 默认配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  url: 'https://aistudio.baidu.com/llm/lmapi/v3',
  key: '',
  modelName: 'ernie-4.5-vl-28b-a3b',
  callPreference: 'server',  // 默认使用服务器调用点
}

// 本地存储键名
const AI_CONFIG_KEYS = {
  URL: 'ai_url',
  KEY: 'ai_key',
  MODEL_NAME: 'ai_model_name',
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
      url: localStorage.getItem(AI_CONFIG_KEYS.URL) || DEFAULT_AI_CONFIG.url,
      key: localStorage.getItem(AI_CONFIG_KEYS.KEY) || DEFAULT_AI_CONFIG.key,
      modelName: localStorage.getItem(AI_CONFIG_KEYS.MODEL_NAME) || DEFAULT_AI_CONFIG.modelName,
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
    localStorage.setItem(AI_CONFIG_KEYS.URL, config.url || '')
    localStorage.setItem(AI_CONFIG_KEYS.KEY, config.key || '')
    localStorage.setItem(AI_CONFIG_KEYS.MODEL_NAME, config.modelName || '')
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
export const isAIConfigValid = (config?: AIConfig): boolean => {
  const currentConfig = config || getAIConfig()
  
  // 如果选择服务器调用点，则配置始终有效
  if (currentConfig.callPreference === 'server') {
    return true
  }
  
  // 如果选择自定义服务，则需要检查 API 配置是否完整
  return !!(
    currentConfig.url &&
    currentConfig.key &&
    currentConfig.modelName
  )
}

/**
 * 重置 AI 配置为默认值
 */
export const resetAIConfig = (): boolean => {
  return saveAIConfig({ ...DEFAULT_AI_CONFIG })
}

/**
 * 获取用于 API 调用的请求头
 */
export const getAIRequestHeaders = (): Record<string, string> => {
  const config = getAIConfig()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.key}`,
  }
}

/**
 * 获取 AI API 的完整请求配置
 */
export const getAIRequestConfig = () => {
  const config = getAIConfig()
  
  if (!isAIConfigValid(config)) {
    throw new Error('AI 配置不完整，请先在设置页面配置 AI 服务参数')
  }

  return {
    url: config.url,
    headers: getAIRequestHeaders(),
    model: config.modelName,
  }
}

/**
 * 创建标准的 AI 请求体
 */
export const createAIRequestBody = (
  messages: Array<{ role: string; content: string | Array<any> }>,
  options?: {
    temperature?: number
    max_tokens?: number
    top_p?: number
  }
) => {
  const config = getAIConfig()
  
  return {
    model: config.modelName,
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