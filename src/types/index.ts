import { User } from "@supabase/supabase-js";

// User roles in the system
export type UserRole = 'super_admin' | 'center_admin' | 'coach' | 'parent' | 'player';

// Core entities
export interface AppUser {
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
  user_id?: string | null
}

export interface EventDB {
  id: string
  title: string
  start_time: string
  cancelled?: boolean
  end_time: string
  event_type: 'training' | 'match' | 'meeting' | 'other'
  teams: { name: string }[]
}

export type Message = {
  id: string
  title: string
  body: string
  created_at: string
  users_profile: {
    full_name: string
  } | null
}

// Auth context types
export interface AuthState {
  user: AppUser | null;
  role: UserRole;
  clubId?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
}
