import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { AppUser, UserRole, AuthState } from '@/types'
import { supabase } from '@/lib/supabase'
console.log('AUTH SUPABASE CLIENT', supabase)
import i18n from '@/i18n'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setRole: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    clubId: null,
    isAuthenticated: false,
    isLoading: true, // 🔴 IMPORTANTE: empieza en true
  })

  /**
   * 🔹 Restaurar sesión al cargar la app
   */
  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        setAuthState({
          user: null,
          role: null,
          clubId: null,
          isAuthenticated: false,
          isLoading: false,
        })
        return
      }

      const userId = data.session.user.id

      // 🔹 cargar perfil
      const { data: profile } = await supabase
        .from('users_profile')
        .select('id, email, full_name, created_at, language')
        .eq('id', userId)
        .single()

      if (!profile) {
        setAuthState({
          user: null,
          role: null,
          clubId: null,
          isAuthenticated: false,
          isLoading: false,
        })
        return
      }

      i18n.changeLanguage(profile.language || 'es')

      const appUser: AppUser = {
        id: profile.id,
        email: profile.email,
        firstName: profile.full_name.split(' ')[0],
        lastName: profile.full_name.split(' ').slice(1).join(' '),
        createdAt: profile.created_at,
      }

      // 🔹 cargar rol y club
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, club_id')
        .eq('user_id', userId)
        .limit(1)
        .single()

      setAuthState({
        user: appUser,
        role: roleData?.role ?? null,
        clubId: roleData?.club_id ?? null,
        isAuthenticated: true,
        isLoading: false,
      })
    }

    initSession()
  }, [])

  /**
   * 🔹 Login manual
   */
  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }))

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      setAuthState({
        user: null,
        role: null,
        clubId: null,
        isAuthenticated: false,
        isLoading: false,
      })
      throw error
    }

    const userId = data.user.id

    // 🔹 perfil
    const { data: profile } = await supabase
      .from('users_profile')
      .select('id, email, full_name, created_at, language')
      .eq('id', userId)
      .single()

    if (!profile) throw new Error('Profile not found')

    i18n.changeLanguage(profile.language || 'es')

    const appUser: AppUser = {
      id: profile.id,
      email: profile.email,
      firstName: profile.full_name.split(' ')[0],
      lastName: profile.full_name.split(' ').slice(1).join(' '),
      createdAt: profile.created_at,
    }

    // 🔹 rol
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, club_id')
      .eq('user_id', userId)
      .limit(1)
      .single()

    setAuthState({
      user: appUser,
      role: roleData?.role ?? null,
      clubId: roleData?.club_id ?? null,
      isAuthenticated: true,
      isLoading: false,
    })
  }

  /**
   * 🔹 Logout
   */
  const logout = async () => {
    await supabase.auth.signOut()

    setAuthState({
      user: null,
      role: null,
      clubId: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  /**
   * 🔹 Cambiar rol (solo demo)
   */
  const setRole = (role: UserRole) => {
    setAuthState(prev => ({ ...prev, role }))
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
