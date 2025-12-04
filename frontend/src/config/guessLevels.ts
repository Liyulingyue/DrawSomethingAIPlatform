// 猜词闯关配置类型定义
export interface GuessLevelConfig {
  id: string
  title: string
  description: string
  icon: string
  status: 'available' | 'coming-soon'
  difficulty?: string
  keywords: string[]  // 该关卡的关键词列表（固定10个）
  clue?: string       // 提示信息
}

// 猜词闯关配置数据
export const GUESS_LEVEL_CONFIGS: GuessLevelConfig[] = [
  {
    id: 'guess_beginner',
    title: '新手猜词',
    description: '简单的物品，适合新手练习猜词',
    icon: '🌱',
    status: 'available',
    difficulty: '简单',
    keywords: ['苹果', '香蕉', '太阳', '月亮', '星星', '房子', '树', '花', '猫', '狗'],
    clue: '一个简单的物品或事物',
  },
  {
    id: 'guess_animals',
    title: '动物猜词',
    description: '各种可爱的动物，考验你的观察力',
    icon: '🐾',
    status: 'available',
    difficulty: '中等',
    keywords: ['大象', '长颈鹿', '狮子', '老虎', '熊猫', '兔子', '猴子', '企鹅', '海豚', '蝴蝶'],
    clue: '一种动物',
  },
  {
    id: 'guess_vehicles',
    title: '交通工具猜词',
    description: '各种交通工具，挑战你的想象力',
    icon: '🚗',
    status: 'available',
    difficulty: '中等',
    keywords: ['汽车', '自行车', '火车', '飞机', '轮船', '摩托车', '公交车', '地铁', '直升机', '帆船'],
    clue: '一种交通工具或载具',
  },
  {
    id: 'guess_sports',
    title: '体育运动猜词',
    description: '各种运动项目，动起来猜词更有趣',
    icon: '⚽',
    status: 'available',
    difficulty: '中等',
    keywords: ['足球', '篮球', '乒乓球', '羽毛球', '网球', '游泳', '跑步', '跳绳', '滑冰', '跳高'],
    clue: '一种体育运动或运动项目',
  },
  {
    id: 'guess_food',
    title: '中华美食猜词',
    description: '各种传统美食，闻着味儿来猜词',
    icon: '🥟',
    status: 'available',
    difficulty: '简单',
    keywords: ['饺子', '包子', '馒头', '烧饼', '月饼', '粽子', '汤圆', '春卷', '煎饼', '面条'],
    clue: '一种中华传统美食',
  },
  {
    id: 'guess_clothing',
    title: '服装衣物猜词',
    description: '各种服装和配饰，穿搭猜词挑战',
    icon: '👕',
    status: 'available',
    difficulty: '简单',
    keywords: ['T恤', '裙子', '裤子', '毛衣', '背心', '围巾', '帽子', '鞋子', '袜子', '手套'],
    clue: '一种服装或穿戴用品',
  },
  {
    id: 'guess_pokemon',
    title: '宝可梦猜词',
    description: '神奇的宝可梦世界，皮卡丘在等你',
    icon: '⚡',
    status: 'available',
    difficulty: '困难',
    keywords: ['皮卡丘', '杰尼龟', '小火龙', '妙蛙种子', '喷火龙', '水箭龟', '妙蛙花', '雷丘', '风速狗', '尼多王'],
    clue: '一种宝可梦',
  },
  {
    id: 'guess_nature',
    title: '自然景观猜词',
    description: '美丽的自然风景，大自然的神奇',
    icon: '🌄',
    status: 'available',
    difficulty: '中等',
    keywords: ['山脉', '河流', '湖泊', '瀑布', '森林', '沙漠', '海洋', '草原', '雪山', '峡谷'],
    clue: '一种自然景观',
  },
  {
    id: 'guess_professions',
    title: '职业角色猜词',
    description: '各种职业和角色，职业猜词挑战',
    icon: '👨‍⚕️',
    status: 'available',
    difficulty: '中等',
    keywords: ['医生', '老师', '警察', '厨师', '司机', '护士', '消防员', '记者', '律师', '工程师'],
    clue: '一种职业或工作角色',
  },
  {
    id: 'guess_emotions',
    title: '表情情感猜词',
    description: '各种表情和情感，读心猜词游戏',
    icon: '😊',
    status: 'available',
    difficulty: '困难',
    keywords: ['开心', '悲伤', '生气', '惊讶', '害怕', '害羞', '骄傲', '失望', '兴奋', '平静'],
    clue: '一种表情或情感状态',
  }
]

// 本地存储 key
const CUSTOM_LEVELS_KEY = 'custom_levels'

// 获取自定义关卡列表
const getCustomLevels = (): GuessLevelConfig[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_LEVELS_KEY)
    if (stored) {
      const allCustomLevels = JSON.parse(stored)
      // 只返回猜词类型的自定义关卡，并确保有 keywords
      return allCustomLevels
        .filter((level: any) => level.type === 'guess' && level.keywords && level.keywords.length > 0)
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
export const getAvailableGuessLevels = (): GuessLevelConfig[] => {
  return GUESS_LEVEL_CONFIGS.filter(level => level.status === 'available')
}

// 根据 ID 获取猜词关卡配置（包含自定义关卡）
export const getGuessLevelById = (id: string): GuessLevelConfig | undefined => {
  // 先从预设关卡中查找
  let level = GUESS_LEVEL_CONFIGS.find(level => level.id === id)
  
  // 如果没找到，再从自定义关卡中查找
  if (!level) {
    const customLevels = getCustomLevels()
    level = customLevels.find(level => level.id === id)
  }
  
  return level
}

// 获取关卡的随机顺序关键词列表
export const getShuffledKeywords = (levelId: string): string[] => {
  const level = getGuessLevelById(levelId)
  if (!level || !level.keywords || level.keywords.length === 0) {
    return []
  }

  // 尝试从 localStorage 获取缓存的顺序
  const cacheKey = `shuffled_keywords_${levelId}`
  const cached = localStorage.getItem(cacheKey)

  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      // 验证缓存是否有效（关键词数量和内容一致）
      if (parsed.length === level.keywords.length &&
          parsed.every((k: string) => level.keywords.includes(k))) {
        return parsed
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  // 创建关键词的副本并打乱顺序
  const shuffled = [...level.keywords]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // 缓存到 localStorage
  localStorage.setItem(cacheKey, JSON.stringify(shuffled))

  return shuffled
}

// 获取关卡的下一个关键词（基于当前进度）
export const getNextKeyword = (levelId: string, currentIndex: number): string | null => {
  const level = getGuessLevelById(levelId)
  if (!level || !level.keywords || currentIndex >= level.keywords.length) {
    return null
  }

  // 如果是第一次进入关卡，获取随机顺序
  const shuffledKeywords = getShuffledKeywords(levelId)
  return shuffledKeywords[currentIndex] || null
}