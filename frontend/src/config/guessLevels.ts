// 猜词闯关配置类型定义
export interface GuessLevelConfig {
  id: string
  title: string
  description: string
  icon: string
  status: 'available' | 'coming-soon'
  difficulty?: string
  keywords: string | string[]  // 翻译键字符串或关键词数组
  clue?: string
}

// 预设猜词关卡 ID 列表
export const GUESS_LEVEL_IDS = [
  'guess_beginner',
  'guess_animals',
  'guess_vehicles',
  'guess_sports',
  'guess_food',
  'guess_clothing',
  'guess_nature',
  'guess_professions',
  'guess_emotions'
]

// 获取猜词关卡配置（通过 i18n）
export const getGuessLevelConfig = (id: string, t: (key: string, options?: any) => any): GuessLevelConfig | undefined => {
  // 移除 'guess_' 前缀来匹配 i18n 键
  const levelKey = id.replace('guess_', '')
  const translated = t(`levels.guess.${levelKey}`, { returnObjects: true })
  if (!translated || typeof translated !== 'object') {
    return undefined
  }
  return {
    id,
    title: translated.title || '',
    description: translated.description || '',
    icon: translated.icon || '',
    status: translated.status || 'coming-soon',
    difficulty: translated.difficulty,
    keywords: translated.keywords,
    clue: translated.clue
  }
}

// 本地存储 key
const CUSTOM_LEVELS_KEY = 'custom_levels'

// 获取自定义关卡列表
const getCustomLevels = (): GuessLevelConfig[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_LEVELS_KEY)
    if (stored) {
      const allCustomLevels = JSON.parse(stored)
      // 只返回猜词类型的自定义关卡，并确保有 keywords（支持 string 或 array）
      return allCustomLevels
        .filter((level: any) => level.type === 'guess' && level.keywords && (typeof level.keywords === 'string' || Array.isArray(level.keywords)))
        .map((level: any) => ({
          ...level,
          keywords: level.keywords,
          status: level.status as 'available' | 'coming-soon'
        }))
    }
  } catch (error) {
    console.error('读取自定义猜词关卡失败:', error)
  }
  return []
}

// 获取可用的猜词关卡
export const getAvailableGuessLevels = (t: (key: string, options?: any) => any): GuessLevelConfig[] => {
  return GUESS_LEVEL_IDS
    .map(id => getGuessLevelConfig(id, t))
    .filter((level): level is GuessLevelConfig => level !== undefined && level.status === 'available')
}

// 根据 ID 获取猜词关卡配置（包含自定义关卡）
export const getGuessLevelById = (id: string, t: (key: string, options?: any) => any): GuessLevelConfig | undefined => {
  // 先从预设关卡中查找
  let level = getGuessLevelConfig(id, t)
  
  // 如果没找到，再从自定义关卡中查找
  if (!level) {
    const customLevels = getCustomLevels()
    level = customLevels.find((level: GuessLevelConfig) => level.id === id)
  }
  
  return level
}

// 获取关卡的随机顺序关键词列表
export const getShuffledKeywords = (levelId: string, t: (key: string, options?: any) => any): string[] => {
  const level = getGuessLevelById(levelId, t)
  if (!level || !level.keywords) {
    return []
  }

  let keywords: string[]

  // 如果 keywords 是字符串（翻译键），从翻译系统中获取
  if (typeof level.keywords === 'string') {
    const translatedKeywords = t(level.keywords, { returnObjects: true })
    keywords = Array.isArray(translatedKeywords) ? translatedKeywords.map(String) : []
  } else {
    // 如果 keywords 是数组，直接使用
    keywords = level.keywords
  }

  if (keywords.length === 0) {
    return []
  }

  // 尝试从 localStorage 获取缓存的顺序
  const cacheKey = `shuffled_keywords_${levelId}`
  const cached = localStorage.getItem(cacheKey)

  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      // 验证缓存是否有效（关键词数量和内容一致）
      if (parsed.length === keywords.length &&
          parsed.every((k: string) => keywords.includes(k))) {
        return parsed
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  // 创建关键词的副本并打乱顺序
  const shuffled = [...keywords]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // 缓存到 localStorage
  localStorage.setItem(cacheKey, JSON.stringify(shuffled))

  return shuffled
}

// 获取关卡的下一个关键词（基于当前进度）
export const getNextKeyword = (levelId: string, currentIndex: number, t: (key: string, options?: any) => any): string | null => {
  const level = getGuessLevelById(levelId, t)
  if (!level || !level.keywords) {
    return null
  }

  // 如果是第一次进入关卡，获取随机顺序
  const shuffledKeywords = getShuffledKeywords(levelId, t)
  return shuffledKeywords[currentIndex] || null
}