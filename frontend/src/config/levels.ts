// 关卡配置类型定义
export interface LevelConfig {
  id: string
  title: string
  description: string
  icon: string
  status: 'available' | 'coming-soon'
  difficulty?: string
  keywords?: string | string[]  // 翻译键字符串或关键词数组
  clue?: string        // 提示信息
  type?: 'draw' | 'guess'  // 关卡类型：绘画闯关或猜词闯关
}

// 预设关卡 ID 列表
export const LEVEL_IDS = [
  'beginner',
  'animals',
  'vehicles',
  'sports',
  'food',
  'clothing'
]

// 获取关卡配置（通过 i18n）
export const getLevelConfig = (id: string, t: (key: string, options?: any) => any): LevelConfig | undefined => {
  const translated = t(`levels.draw.${id}`, { returnObjects: true })
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
    clue: translated.clue,
    type: 'draw'
  }
}

// 本地存储 key
const CUSTOM_LEVELS_KEY = 'custom_levels'

// 获取自定义关卡列表
const getCustomLevels = (): LevelConfig[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_LEVELS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('读取自定义关卡失败:', error)
  }
  return []
}

// 获取可用的关卡
export const getAvailableLevels = (t: (key: string, options?: any) => any): LevelConfig[] => {
  return LEVEL_IDS
    .map(id => getLevelConfig(id, t))
    .filter((level): level is LevelConfig => level !== undefined && level.status === 'available')
}

// 根据 ID 获取关卡配置（包含自定义关卡）
export const getLevelById = (id: string, t: (key: string, options?: any) => any): LevelConfig | undefined => {
  // 先从预设关卡中查找
  let level: LevelConfig | undefined = getLevelConfig(id, t)
  
  // 如果没找到，再从自定义关卡中查找
  if (!level) {
    const customLevels = getCustomLevels()
    level = customLevels.find(level => level.id === id)
  }
  
  return level
}

// 从关卡中随机获取一个关键词
export const getRandomKeyword = (levelId: string, t: (key: string, options?: any) => any): string | null => {
  const level = getLevelById(levelId, t)
  if (!level || !level.keywords) {
    return null
  }
  let keywordsArray: string[]
  if (typeof level.keywords === 'string') {
    if (t) {
      const translated = t(level.keywords, { returnObjects: true })
      keywordsArray = Array.isArray(translated) ? translated.map(String) : []
    } else {
      keywordsArray = []
    }
  } else {
    keywordsArray = level.keywords
  }
  if (keywordsArray.length === 0) return null
  const randomIndex = Math.floor(Math.random() * keywordsArray.length)
  return keywordsArray[randomIndex]
}
