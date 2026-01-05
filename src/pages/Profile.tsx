import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { mockClub } from '@/data/mockData';
import { User, LogOut, Settings, HelpCircle, Shield, ChevronRight } from 'lucide-react';
import { UserRole } from '@/types';

export default function Profile() {
  const { user, role, setRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Role switcher for demo purposes
  const roles: UserRole[] = ['parent', 'coach', 'player'];

  const menuItems = [
    { icon: Settings, label: 'Account Settings', action: () => {} },
    { icon: Shield, label: 'Privacy', action: () => {} },
    { icon: HelpCircle, label: 'Help & Support', action: () => {} },
  ];

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Profile Header */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {mockClub.name}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Switcher (Demo) */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Demo: Switch Role
        </h2>
        <Card className="shadow-card">
          <CardContent className="p-2">
            <div className="flex gap-2">
              {roles.map((r) => (
                <Button
                  key={r}
                  variant={role === r ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRole(r)}
                  className="flex-1 capitalize"
                >
                  {r}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Menu Items */}
      <Card className="shadow-card">
        <CardContent className="p-0 divide-y divide-border">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 font-medium text-foreground">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5 mr-2" />
        Sign Out
      </Button>

      {/* App Version */}
      <p className="text-center text-xs text-muted-foreground">
        ClubKit v1.0.0
      </p>
    </div>
  );
}
