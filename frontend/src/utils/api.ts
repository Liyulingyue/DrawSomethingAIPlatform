import axios from 'axios'
import { getApiBaseUrlSync, initApiConfig } from '../config/api'

// 重新导出 getApiBaseUrlSync 供其他模块使用
export { getApiBaseUrlSync, initApiConfig }

// 初始化 API 配置（应用启动时会调用）
let isInitialized = false
export const ensureApiInitialized = async () => {
  if (!isInitialized) {
    console.log('🔧 正在初始化 API 配置...')
    await initApiConfig()
    const newBaseUrl = getApiBaseUrlSync()
    console.log('🔄 更新 axios baseURL 为:', newBaseUrl)
    updateApiBaseUrl(newBaseUrl)
    isInitialized = true
    console.log('✅ API 初始化完成')
  }
}

// 动态获取 API_BASE_URL（向后兼容）
export const getApiBaseUrl = () => getApiBaseUrlSync()

// 获取当前 API 基础 URL（会在运行时更新）
export const API_BASE_URL = getApiBaseUrlSync()

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

// 更新 axios 实例的 baseURL（在 API 初始化后调用）
export const updateApiBaseUrl = (url: string) => {
  api.defaults.baseURL = url
}

// Add request interceptor to include session-id header
api.interceptors.request.use((config) => {
  // 每次请求时动态更新 baseURL（确保使用最新的后端地址）
  const currentBaseUrl = getApiBaseUrlSync()
  console.log('🔍 请求拦截器 - 当前 baseURL:', currentBaseUrl)
  // 只要不是 null/undefined 就更新（空字符串也是有效的）
  if (currentBaseUrl !== null && currentBaseUrl !== undefined) {
    config.baseURL = currentBaseUrl
    console.log('🔄 更新请求 baseURL 为:', config.baseURL)
  }
  
  const sessionId = localStorage.getItem('sessionId')
  if (sessionId) {
    config.headers['session-id'] = sessionId
  }
  return config
})

export function formatRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return '未知'
  const diff = Math.max(0, Date.now() / 1000 - timestamp)
  if (diff < 60) return `${Math.floor(diff)}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}
