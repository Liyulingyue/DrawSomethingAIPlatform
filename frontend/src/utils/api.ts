import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8002'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

// Add request interceptor to include session-id header
api.interceptors.request.use((config) => {
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
