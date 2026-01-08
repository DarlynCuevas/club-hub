
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  const { forcePasswordReset, role } = useAuth();
  const location = useLocation();

  // Guard: block player from accessing anything except /reset-password
  if (role === 'player' && forcePasswordReset && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
