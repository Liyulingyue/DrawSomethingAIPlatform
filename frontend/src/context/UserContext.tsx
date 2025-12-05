import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { api, getApiBaseUrlSync } from '../utils/api'

interface UserContextValue {
  userId: number | null
  username: string
  sessionId: string
  isAdmin: boolean
  callsRemaining: number
  initializing: boolean
  loading: boolean
  adminLogin: (username: string, password: string) => Promise<{ success: boolean; username?: string; message?: string }>
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
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [callsRemaining, setCallsRemaining] = useState(0)
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)

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
            const verifyResponse = await fetch(`${getApiBaseUrlSync()}/auth/user/verify_session`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                session_id: storedSession
              }),
            })
            
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json()
              if (verifyData.valid) {
                // 会话有效，获取用户信息
                const infoResponse = await fetch(`${getApiBaseUrlSync()}/auth/user/get_info`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    session_id: storedSession
                  }),
                })
                
                if (infoResponse.ok) {
                  const infoData = await infoResponse.json()
                  if (infoData.success) {
                    setUserId(infoData.user_id || null)
                    setSessionId(storedSession)
                    setUsername(infoData.username)
                    setIsAdmin(infoData.is_admin)
                    setCallsRemaining(infoData.calls_remaining || 0)
                    setInitializing(false)
                    return
                  }
                }
              }
            }
          } catch (error) {
            console.warn('Session verification failed:', error)
          }
          
          // session无效或获取信息失败，清除本地存储
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

    // 对于非 /app 路由，设置为未初始化状态
    setInitializing(false)
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
        setUserId(null) // 管理员没有对应的user记录
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

  const refreshUserInfo = useCallback(async () => {
    const storedSession = safeGetItem('sessionId')
    if (!storedSession) return

    try {
      // 首先验证会话有效性
      const verifyResponse = await fetch(`${getApiBaseUrlSync()}/auth/user/verify_session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: storedSession
        }),
      })
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json()
        if (verifyData.valid) {
          // 会话有效，获取用户信息
          const infoResponse = await fetch(`${getApiBaseUrlSync()}/auth/user/get_info`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: storedSession
            }),
          })
          
          if (infoResponse.ok) {
            const infoData = await infoResponse.json()
            if (infoData.success) {
              setUserId(infoData.user_id || null)
              setSessionId(storedSession)
              setUsername(infoData.username)
              setIsAdmin(infoData.is_admin)
              setCallsRemaining(infoData.calls_remaining || 0)
              safeSetItem('username', infoData.username)
              safeSetItem('isAdmin', infoData.is_admin ? 'true' : 'false')
              console.log('🔄 用户信息已刷新，剩余调用次数:', infoData.calls_remaining)
              return
            }
          }
        }
      }
      
      // 会话无效或获取信息失败，清除登录状态
      console.log('🔄 会话无效或获取信息失败，清除登录状态')
      localStorage.removeItem('sessionId')
      localStorage.removeItem('username')
      localStorage.removeItem('isAdmin')
      setSessionId('')
      setUsername('')
      setIsAdmin(false)
      setCallsRemaining(0)
    } catch (error) {
      console.warn('刷新用户信息失败:', error)
      // 网络错误，暂时不清空状态，避免误操作
    }
  }, [])

  const value = useMemo<UserContextValue>(() => ({
    userId,
    username,
    sessionId,
    isAdmin,
    callsRemaining,
    initializing,
    loading,
    adminLogin,
    refreshUserInfo,
  }), [userId, username, sessionId, isAdmin, callsRemaining, initializing, loading, adminLogin, refreshUserInfo])

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
