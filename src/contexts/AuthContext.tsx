import { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for development
const mockUser: User = {
  id: '1',
  email: 'demo@clubkit.app',
  firstName: 'Alex',
  lastName: 'Johnson',
  createdAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: 'parent',
    clubId: 'club-1',
    isAuthenticated: false,
    isLoading: false,
  });

  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setAuthState({
      user: mockUser,
      role: 'parent',
      clubId: 'club-1',
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    setAuthState({
      user: null,
      role: 'parent',
      clubId: undefined,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const setRole = (role: UserRole) => {
    setAuthState(prev => ({ ...prev, role }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
