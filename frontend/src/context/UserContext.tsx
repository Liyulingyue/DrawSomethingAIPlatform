import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { message } from 'antd'
import { api } from '../utils/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8002'

interface UserContextValue {
  username: string
  sessionId: string
  isAdmin: boolean
  callsRemaining: number
  initializing: boolean
  loading: boolean
  login: () => Promise<{ success: boolean; username?: string; message?: string }>
  adminLogin: (username: string, password: string) => Promise<{ success: boolean; username?: string; message?: string }>
  updateUsername: (newUsername: string) => Promise<{ success: boolean; username?: string; message?: string }>
  suggestUsername: () => Promise<{ success: boolean; username?: string; message?: string }>
  refreshUserInfo: () => Promise<void>
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

const safeGetItem = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage`, error)
    return null
  }
}

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`Failed to write ${key} to localStorage`, error)
  }
}

export function UserProvider({ children }: UserProviderProps) {
  const [username, setUsername] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [callsRemaining, setCallsRemaining] = useState(0)
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)

  const loginInternal = useCallback(async () => {
    try {
      const response = await api.post('/auth/login')
      const { session_id: newSessionId, username: newUsername } = response.data
      setSessionId(newSessionId)
      setUsername(newUsername)
      safeSetItem('sessionId', newSessionId)
      safeSetItem('username', newUsername)
      return { success: true, username: newUsername }
    } catch (error) {
      console.error('Auto login failed:', error)
      return { success: false, message: '自动登录失败，请稍后重试' }
    }
  }, [])

  useEffect(() => {
    // 对于 /app 路由下的页面,使用纯前端模式,不需要后端登录
    const isAppRoute = window.location.pathname.startsWith('/app')
    
    if (isAppRoute) {
      // 检查是否刚刚退出登录
      const justLoggedOut = safeGetItem('justLoggedOut') === 'true'
      if (justLoggedOut) {
        // 清除退出登录标志
        localStorage.removeItem('justLoggedOut')
        // 不设置用户名，保持未登录状态
        setInitializing(false)
        return
      }

      // 尝试验证现有的session
      const storedSession = safeGetItem('sessionId')
      const storedUsername = safeGetItem('username')

      if (storedSession && storedUsername) {
        // 验证session是否仍然有效
        const verifySession = async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/auth/user/verify_session`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                session_id: storedSession
              }),
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.valid) {
                // session有效，使用存储的信息
                setSessionId(storedSession)
                setUsername(data.username)
                setIsAdmin(data.is_admin)
                setCallsRemaining(data.calls_remaining || 0)
                setInitializing(false)
                return
              }
            }
          } catch (error) {
            console.warn('Session verification failed:', error)
          }
          
          // session无效，清除本地存储
          localStorage.removeItem('sessionId')
          localStorage.removeItem('username')
          localStorage.removeItem('isAdmin')
          setInitializing(false)
        }
        
        verifySession()
        return
      }

      // 没有有效的session，保持未登录状态
      setInitializing(false)
      return
    }

    // 其他路由:尝试使用后端登录
    const storedSession = safeGetItem('sessionId')
    const storedUsername = safeGetItem('username')
    const storedIsAdmin = safeGetItem('isAdmin') === 'true'

    if (storedSession && storedUsername) {
      setSessionId(storedSession)
      setUsername(storedUsername)
      setIsAdmin(storedIsAdmin)
      setInitializing(false)
      return
    }

    const autoLogin = async () => {
      const result = await loginInternal()
      if (!result.success && result.message) {
        message.error(result.message)
      }
      setInitializing(false)
    }

    autoLogin().catch(() => setInitializing(false))
  }, [loginInternal])

  const login = useCallback(async () => {
    setLoading(true)
    try {
      const result = await loginInternal()
      return result
    } finally {
      setLoading(false)
    }
  }, [loginInternal])

  const updateUsername = useCallback(async (newUsername: string) => {
    if (!username) {
      return { success: false, message: '当前没有有效的用户名，请刷新页面重试' }
    }
    setLoading(true)
    try {
      const response = await api.post('/auth/update_username', {
        old_username: username,
        new_username: newUsername,
      })
      if (response.data.success) {
        const updatedUsername = response.data.username ?? newUsername
        setUsername(updatedUsername)
        safeSetItem('username', updatedUsername)
        return { success: true, username: updatedUsername, message: response.data.message }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Update username failed:', error)
      return { success: false, message: '更新用户名失败，请稍后重试' }
    } finally {
      setLoading(false)
    }
  }, [username])

  const suggestUsername = useCallback(async () => {
    try {
      const response = await api.get('/auth/suggest_username')
      return { success: true, username: response.data.username }
    } catch (error) {
      console.error('Suggest username failed:', error)
      return { success: false, message: '获取随机用户名失败，请稍后重试' }
    }
  }, [])

  const adminLogin = useCallback(async (adminUsername: string, adminPassword: string) => {
    setLoading(true)
    try {
      const response = await api.post('/auth/app/login', {
        username: adminUsername,
        password: adminPassword,
      })
      if (response.data.success) {
        const { session_id: newSessionId, username: newUsername, is_admin } = response.data
        setSessionId(newSessionId)
        setUsername(newUsername)
        setIsAdmin(is_admin)
        setCallsRemaining(-1) // 管理员无限调用次数
        safeSetItem('sessionId', newSessionId)
        safeSetItem('username', newUsername)
        safeSetItem('isAdmin', 'true')
        return { success: true, username: newUsername }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Admin login failed:', error)
      return { success: false, message: '管理员登录失败，请检查账号密码' }
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo<UserContextValue>(() => ({
    username,
    sessionId,
    isAdmin,
    callsRemaining,
    initializing,
    loading,
    login,
    adminLogin,
    updateUsername,
    suggestUsername,
    refreshUserInfo,
  }), [username, sessionId, isAdmin, callsRemaining, initializing, loading, login, adminLogin, updateUsername, suggestUsername, refreshUserInfo])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
