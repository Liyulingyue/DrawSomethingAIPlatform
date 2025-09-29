import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { message } from 'antd'
import { api } from '../utils/api'

interface UserContextValue {
  username: string
  sessionId: string
  initializing: boolean
  loading: boolean
  login: () => Promise<{ success: boolean; username?: string; message?: string }>
  updateUsername: (newUsername: string) => Promise<{ success: boolean; username?: string; message?: string }>
  suggestUsername: () => Promise<{ success: boolean; username?: string; message?: string }>
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
    const storedSession = safeGetItem('sessionId')
    const storedUsername = safeGetItem('username')

    if (storedSession && storedUsername) {
      setSessionId(storedSession)
      setUsername(storedUsername)
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

  const value = useMemo<UserContextValue>(() => ({
    username,
    sessionId,
    initializing,
    loading,
    login,
    updateUsername,
    suggestUsername,
  }), [username, sessionId, initializing, loading, login, updateUsername, suggestUsername])

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
