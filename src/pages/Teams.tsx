import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { mockTeams, mockPlayers } from '@/data/mockData';
import { Users, ChevronRight, User } from 'lucide-react';

export default function Teams() {
  const { role } = useAuth();

  // For parents, show only teams their children are in
  // For coaches, show teams they coach
  // For demo, we show all teams
  const teams = mockTeams;

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Teams</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === 'coach' ? 'Teams you coach' : 'Your children\'s teams'}
        </p>
      </div>

      {/* Teams List */}
      <div className="space-y-3">
        {teams.map((team) => (
          <Card key={team.id} className="shadow-card cursor-pointer hover:bg-muted/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{team.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {team.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      12 players
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roster Preview (Coach view) */}
      {role === 'coach' && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Quick Roster - U12 Blue
          </h2>
          <Card className="shadow-card">
            <CardContent className="p-0 divide-y divide-border">
              {mockPlayers.map((player) => (
                <div key={player.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {player.firstName} {player.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Born {player.birthDate ? new Date(player.birthDate).getFullYear() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
