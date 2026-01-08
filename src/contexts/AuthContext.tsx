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
  forcePasswordReset?: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<
    AuthState & { forcePasswordReset?: boolean }
  >({
    user: null,
    role: null,
    clubId: null,
    isAuthenticated: false,
    isLoading: true,
    forcePasswordReset: false,
  })

  /**
   * 🔹 Restaurar sesión al cargar la app
   */
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          setAuthState({
            user: null,
            role: null,
            clubId: null,
            isAuthenticated: false,
            isLoading: false,
            forcePasswordReset: false,
          })
          return
        }

        const userId = data.session.user.id
        const tempPassword =
          data.session.user.user_metadata?.temp_password === true

        // 🔹 Perfil
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('id, email, full_name, created_at, language')
          .eq('id', userId)
          .maybeSingle()

        if (profileError || !profile) {
          setAuthState({
            user: null,
            role: null,
            clubId: null,
            isAuthenticated: false,
            isLoading: false,
            forcePasswordReset: tempPassword,
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

        // 🔹 Rol (puede NO existir aún)
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role, club_id')
          .eq('user_id', userId)
          .maybeSingle()

        if (roleError) {
          console.error('Error loading user role', roleError)
        }

        setAuthState({
          user: appUser,
          role: roleData?.role ?? null,
          clubId: roleData?.club_id ?? null,
          isAuthenticated: true,
          isLoading: false,
          forcePasswordReset: tempPassword,
        })
      } catch (err) {
        console.error('Error restoring session', err)
        setAuthState({
          user: null,
          role: null,
          clubId: null,
          isAuthenticated: false,
          isLoading: false,
          forcePasswordReset: false,
        })
      }
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
        forcePasswordReset: false,
      })
      throw error
    }

    const userId = data.user.id
    const tempPassword =
      data.user.user_metadata?.temp_password === true

    // 🔹 Perfil
    const { data: profile } = await supabase
      .from('users_profile')
      .select('id, email, full_name, created_at, language')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) {
      throw new Error('Profile not found')
    }

    i18n.changeLanguage(profile.language || 'es')

    const appUser: AppUser = {
      id: profile.id,
      email: profile.email,
      firstName: profile.full_name.split(' ')[0],
      lastName: profile.full_name.split(' ').slice(1).join(' '),
      createdAt: profile.created_at,
    }

    // 🔹 Rol (NO forzamos single)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, club_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (roleError) {
      console.error('Error loading user role', roleError)
    }

    setAuthState({
      user: appUser,
      role: roleData?.role ?? null,
      clubId: roleData?.club_id ?? null,
      isAuthenticated: true,
      isLoading: false,
      forcePasswordReset: tempPassword,
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
