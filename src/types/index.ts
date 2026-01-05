// User roles in the system
export type UserRole = 'super_admin' | 'club_admin' | 'center_admin' | 'coach' | 'parent' | 'player';

// Core entities
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt: string;
}

export interface Center {
  id: string;
  clubId: string;
  name: string;
  address?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  centerId: string;
  clubId: string;
  name: string;
  category?: string; // e.g., "U12", "Senior"
  createdAt: string;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Event {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  type: 'training' | 'match' | 'meeting' | 'other';
  startTime: string;
  endTime: string;
  location?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  clubId?: string;
  teamId?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  priority: 'normal' | 'important';
  createdAt: string;
}

// Auth context types
export interface AuthState {
  user: User | null;
  role: UserRole;
  clubId?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
}
