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
    title: 'draw.beginner.title',
    description: 'draw.beginner.description',
    icon: '🌱',
    status: 'available',
    difficulty: 'draw.beginner.difficulty',
    keywords: 'draw.beginner.keywords',
    clue: 'draw.beginner.clue',
  },
  {
    id: 'animals',
    title: 'draw.animals.title',
    description: 'draw.animals.description',
    icon: '🐾',
    status: 'available',
    difficulty: 'draw.animals.difficulty',
    keywords: 'draw.animals.keywords',
    clue: 'draw.animals.clue',
  },
  {
    id: 'vehicles',
    title: 'draw.vehicles.title',
    description: 'draw.vehicles.description',
    icon: '🚗',
    status: 'available',
    difficulty: 'draw.vehicles.difficulty',
    keywords: 'draw.vehicles.keywords',
    clue: 'draw.vehicles.clue',
  },
  {
    id: 'sports',
    title: 'draw.sports.title',
    description: 'draw.sports.description',
    icon: '⚽',
    status: 'available',
    difficulty: 'draw.sports.difficulty',
    keywords: 'draw.sports.keywords',
    clue: 'draw.sports.clue',
  },
  {
    id: 'food',
    title: 'draw.food.title',
    description: 'draw.food.description',
    icon: '🥟',
    status: 'available',
    difficulty: 'draw.food.difficulty',
    keywords: 'draw.food.keywords',
    clue: 'draw.food.clue',
  },
  {
    id: 'clothing',
    title: 'draw.clothing.title',
    description: 'draw.clothing.description',
    icon: '👕',
    status: 'available',
    difficulty: 'draw.clothing.difficulty',
    keywords: 'draw.clothing.keywords',
    clue: 'draw.clothing.clue',
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
