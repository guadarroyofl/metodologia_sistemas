import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken } from '../lib/api'
import type { AuthResponse, User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<User>
  register: (payload: {
    name: string
    email: string
    password: string
    phone?: string
  }) => Promise<User>
  logout: () => void
  refresh: () => Promise<void>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const current = await api.get<User>('/auth/me')
      setUser(current)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<AuthResponse>('/auth/login', { email, password })
    setToken(result.access_token)
    setUser(result.user)
    return result.user
  }, [])

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; phone?: string }) => {
      const result = await api.post<AuthResponse>('/auth/register', payload)
      setToken(result.access_token)
      setUser(result.user)
      return result.user
    },
    [],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refresh,
      updateUser: setUser,
    }),
    [user, loading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
