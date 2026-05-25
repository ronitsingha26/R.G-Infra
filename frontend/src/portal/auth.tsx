import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, setToken, clearToken, type User } from './api'

// Role type — extend this union when new roles are added to the DB
export type PortalRole = string

export type AuthState = {
  user: User | null
  loading: boolean
  login: (userId: string, password: string) => Promise<User>
  logout: () => void
  updateProfile: (data: { name: string; email: string }) => Promise<User>
  changePassword: (current: string, next: string) => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Validate token on mount
  useEffect(() => {
    const token = localStorage.getItem('abc_token')
    if (!token) { setLoading(false); return }
    api.getMe()
      .then(setUser)
      .catch(() => { clearToken(); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    login: async (userId, password) => {
      const { token, user: u } = await api.login(userId, password)
      setToken(token)
      setUser(u)
      return u
    },
    logout: () => {
      clearToken()
      setUser(null)
    },
    updateProfile: async (data) => {
      const updated = await api.updateProfile(data)
      setUser(updated)
      return updated
    },
    changePassword: async (current, next) => {
      await api.changePassword(current, next)
    },
  }), [user, loading])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function usePortalAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('usePortalAuth must be used within PortalAuthProvider')
  return ctx
}
