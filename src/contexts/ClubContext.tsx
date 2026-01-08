import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Club } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface ClubContextType {
  club: Club | null;
  refreshClub: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({ children }: { children: ReactNode }) {
  const { clubId } = useAuth();
  const [club, setClub] = useState<Club | null>(null);

  const fetchClub = async () => {
    if (!clubId) {
      setClub(null);
      return;
    }
    const { data, error } = await supabase
      .from('clubs')
      .select('id, name, logo_url, primary_color, created_at')
      .eq('id', clubId)
      .maybeSingle();
    if (!error && data) {
      setClub({
        id: data.id,
        name: data.name,
        logoUrl: data.logo_url,
        primaryColor: data.primary_color,
        createdAt: data.created_at,
      });
    } else {
      setClub(null);
    }
  };

  useEffect(() => {
    fetchClub();
    // eslint-disable-next-line
  }, [clubId]);

  return (
    <ClubContext.Provider value={{ club, refreshClub: fetchClub }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}
