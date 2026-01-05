import { NavLink } from 'react-router-dom';
import { Home, Calendar, MessageSquare, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/teams', icon: Users, label: 'Teams' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-nav border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isActive
                  ? 'text-nav-active'
                  : 'text-nav-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all',
                    isActive && 'scale-110'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  'text-xs font-medium',
                  isActive && 'font-semibold'
                )}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
