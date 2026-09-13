import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { pb } from '../lib/pbClient'
import type { AppUser } from '../types/auth'

interface AuthContextValue {
  session: { access_token: string } | null
  appUser: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function recordToAppUser(record: Record<string, unknown>): AppUser {
  return {
    id: record.id as string,
    email: record.email as string,
    fullName: record.full_name as string,
    role: record.role as AppUser['role'],
    year: record.year as number | undefined,
    department: record.department as string | undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Init from stored auth
    if (pb.authStore.isValid && pb.authStore.record) {
      setAppUser(recordToAppUser(pb.authStore.record as Record<string, unknown>))
    }
    setLoading(false)

    // Listen for auth changes
    const unsub = pb.authStore.onChange(() => {
      if (pb.authStore.isValid && pb.authStore.record) {
        setAppUser(recordToAppUser(pb.authStore.record as Record<string, unknown>))
      } else {
        setAppUser(null)
      }
    })

    return () => unsub()
  }, [])

  async function signIn(email: string, password: string) {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (e) {
      return { error: e as Error }
    }
  }

  async function signOut() {
    pb.authStore.clear()
    setAppUser(null)
  }

  const session = pb.authStore.isValid ? { access_token: pb.authStore.token } : null

  return (
    <AuthContext.Provider value={{ session, appUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
