// 关卡配置类型定义
export interface LevelConfig {
  id: string
  title: string
  description: string
  icon: string
  status: 'available' | 'coming-soon'
  difficulty?: string
  keywords?: string[]  // 该关卡的关键词列表
}

// 关卡配置数据
export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 'beginner',
    title: '新手入门',
    description: '简单的物品，适合新手练习',
    icon: '🌱',
    status: 'available',
    difficulty: '简单',
    keywords: ['苹果', '香蕉', '太阳', '月亮', '星星', '房子', '树', '花', '猫', '狗'],
  },
  {
    id: 'animals',
    title: '动物',
    description: '各种可爱的动物',
    icon: '🐾',
    status: 'available',
    difficulty: '中等',
    keywords: ['大象', '长颈鹿', '狮子', '老虎', '熊猫', '兔子', '猴子', '企鹅', '海豚', '蝴蝶'],
  },
  {
    id: 'vehicles',
    title: '交通工具',
    description: '各种交通工具',
    icon: '🚗',
    status: 'coming-soon',
    difficulty: '中等',
    keywords: [],
  },
  {
    id: 'sports',
    title: '体育运动',
    description: '各种运动项目',
    icon: '⚽',
    status: 'coming-soon',
    difficulty: '中等',
    keywords: [],
  }
]

// 获取可用的关卡
export const getAvailableLevels = (): LevelConfig[] => {
  return LEVEL_CONFIGS.filter(level => level.status === 'available')
}

// 根据 ID 获取关卡配置
export const getLevelById = (id: string): LevelConfig | undefined => {
  return LEVEL_CONFIGS.find(level => level.id === id)
}

// 从关卡中随机获取一个关键词
export const getRandomKeyword = (levelId: string): string | null => {
  const level = getLevelById(levelId)
  if (!level || !level.keywords || level.keywords.length === 0) {
    return null
  }
  const randomIndex = Math.floor(Math.random() * level.keywords.length)
  return level.keywords[randomIndex]
}
