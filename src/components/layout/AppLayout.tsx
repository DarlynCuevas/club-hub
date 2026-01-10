
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from './BottomNav';
import { useClub } from '@/contexts/ClubContext';

export function AppLayout() {
  const { forcePasswordReset, role } = useAuth();
  const location = useLocation();
  const { club } = useClub();

  // Guard: block player from accessing anything except /reset-password
  // if (role === 'player' && forcePasswordReset && location.pathname !== '/reset-password') {
  //   return <Navigate to="/reset-password" replace />;
  // }

  return (
    <div className="min-h-screen bg-background">
      {/* Club Branding Header */}
      {club && (
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
            {club.logoUrl ? (
              <img src={`${club.logoUrl}?t=${Date.now()}`} alt="Club logo" className="w-8 h-8 object-contain" />
            ) : null}
          </div>
          <span className="font-semibold text-lg text-foreground">{club.name}</span>
        </header>
      )}
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
