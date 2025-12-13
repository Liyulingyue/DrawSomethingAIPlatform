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



// 关卡配置数据
export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 'beginner',
    title: 'levels.draw.beginner.title',
    description: 'levels.draw.beginner.description',
    icon: '🌱',
    status: 'available',
    difficulty: 'levels.draw.beginner.difficulty',
    keywords: 'levels.draw.beginner.keywords',
    clue: 'levels.draw.beginner.clue',
  },
  {
    id: 'animals',
    title: 'levels.draw.animals.title',
    description: 'levels.draw.animals.description',
    icon: '🐾',
    status: 'available',
    difficulty: 'levels.draw.animals.difficulty',
    keywords: 'levels.draw.animals.keywords',
    clue: 'levels.draw.animals.clue',
  },
  {
    id: 'vehicles',
    title: 'levels.draw.vehicles.title',
    description: 'levels.draw.vehicles.description',
    icon: '🚗',
    status: 'available',
    difficulty: 'levels.draw.vehicles.difficulty',
    keywords: 'levels.draw.vehicles.keywords',
    clue: 'levels.draw.vehicles.clue',
  },
  {
    id: 'sports',
    title: 'levels.draw.sports.title',
    description: 'levels.draw.sports.description',
    icon: '⚽',
    status: 'available',
    difficulty: 'levels.draw.sports.difficulty',
    keywords: 'levels.draw.sports.keywords',
    clue: 'levels.draw.sports.clue',
  },
  {
    id: 'food',
    title: 'levels.draw.food.title',
    description: 'levels.draw.food.description',
    icon: '🥟',
    status: 'available',
    difficulty: 'levels.draw.food.difficulty',
    keywords: 'levels.draw.food.keywords',
    clue: 'levels.draw.food.clue',
  },
  {
    id: 'clothing',
    title: 'levels.draw.clothing.title',
    description: 'levels.draw.clothing.description',
    icon: '👕',
    status: 'available',
    difficulty: 'levels.draw.clothing.difficulty',
    keywords: 'levels.draw.clothing.keywords',
    clue: 'levels.draw.clothing.clue',
  }
]

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
export const getAvailableLevels = (): LevelConfig[] => {
  return LEVEL_CONFIGS.filter(level => level.status === 'available')
}

// 根据 ID 获取关卡配置（包含自定义关卡）
export const getLevelById = (id: string): LevelConfig | undefined => {
  // 先从预设关卡中查找
  let level = LEVEL_CONFIGS.find(level => level.id === id)
  
  // 如果没找到，再从自定义关卡中查找
  if (!level) {
    const customLevels = getCustomLevels()
    level = customLevels.find(level => level.id === id)
  }
  
  return level
}

// 从关卡中随机获取一个关键词
export const getRandomKeyword = (levelId: string, t?: (key: string, options?: any) => any): string | null => {
  const level = getLevelById(levelId)
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
