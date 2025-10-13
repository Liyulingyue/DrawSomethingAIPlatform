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
    id: 'idioms',
    title: '四字成语',
    description: '富有画面感的中国成语',
    icon: '📚',
    status: 'available',
    difficulty: '困难',
    keywords: ['愚公移山', '精卫填海', '守株待兔', '画蛇添足', '井底之蛙', '对牛弹琴', '鹤立鸡群', '狐假虎威', '亡羊补牢', '刻舟求剑'],
    clue: '一个四字成语，请通过画面猜测其含义',
  },
  {
    id: 'chinese-festivals',
    title: '中国节日',
    description: '传统节日和文化习俗',
    icon: '🎊',
    status: 'available',
    difficulty: '中等',
    keywords: ['春节', '元宵节', '清明节', '端午节', '中秋节', '重阳节', '七夕节', '中元节', '腊八节', '除夕'],
    clue: '中国传统节日',
  },
  {
    id: 'pokemon',
    title: '宝可梦',
    description: '神奇的宝可梦世界',
    icon: '⚡',
    status: 'available',
    difficulty: '困难',
    keywords: ['皮卡丘', '杰尼龟', '小火龙', '妙蛙种子', '喷火龙', '水箭龟', '妙蛙花', '雷丘', '风速狗', '尼多王'],
    clue: '一种宝可梦',
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
