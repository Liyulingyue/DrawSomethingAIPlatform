// 关卡配置类型定义
export interface LevelConfig {
  id: string
  title: string
  description: string
  icon: string
  status: 'available' | 'coming-soon'
  difficulty?: string
  keywords?: string[]  // 该关卡的关键词列表
  clue?: string        // 提示信息
  type?: 'draw' | 'guess'  // 关卡类型：绘画闯关或猜词闯关
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
    clue: '',
  },
  {
    id: 'animals',
    title: '动物',
    description: '各种可爱的动物',
    icon: '🐾',
    status: 'available',
    difficulty: '中等',
    keywords: ['大象', '长颈鹿', '狮子', '老虎', '熊猫', '兔子', '猴子', '企鹅', '海豚', '蝴蝶'],
    clue: '一种动物',
  },
  {
    id: 'vehicles',
    title: '交通工具',
    description: '各种交通工具',
    icon: '🚗',
    status: 'available',
    difficulty: '中等',
    keywords: ['汽车', '自行车', '火车', '飞机', '轮船', '摩托车', '公交车', '地铁', '直升机', '帆船'],
    clue: '一种交通工具或载具',
  },
  {
    id: 'sports',
    title: '体育运动',
    description: '各种运动项目',
    icon: '⚽',
    status: 'available',
    difficulty: '中等',
    keywords: ['足球', '篮球', '乒乓球', '羽毛球', '网球', '游泳', '跑步', '跳绳', '滑冰', '跳高'],
    clue: '一种体育运动或运动项目',
  },
  {
    id: 'food',
    title: '中华美食',
    description: '各种传统美食和小吃',
    icon: '🥟',
    status: 'available',
    difficulty: '简单',
    keywords: ['饺子', '包子', '馒头', '烧饼', '月饼', '粽子', '汤圆', '春卷', '煎饼', '面条', '米饭'],
    clue: '一种中华传统美食',
  },
  {
    id: 'clothing',
    title: '服装衣物',
    description: '各种服装和配饰',
    icon: '👕',
    status: 'available',
    difficulty: '简单',
    keywords: ['T恤', '裙子', '裤子', '毛衣', '背心', '围巾', '帽子', '鞋子', '袜子', '手套', '领带', '腰带', '眼镜'],
    clue: '一种服装或穿戴用品',
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
export const getRandomKeyword = (levelId: string): string | null => {
  const level = getLevelById(levelId)
  if (!level || !level.keywords || level.keywords.length === 0) {
    return null
  }
  const randomIndex = Math.floor(Math.random() * level.keywords.length)
  return level.keywords[randomIndex]
}
