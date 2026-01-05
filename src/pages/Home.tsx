import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUpcomingEvents, getRecentMessages, mockPlayers, mockClub } from '@/data/mockData';
import { Calendar, MapPin, User, Bell } from 'lucide-react';
import { format } from 'date-fns';

export default function Home() {
  const { user, role } = useAuth();
  const upcomingEvents = getUpcomingEvents(3);
  const recentMessages = getRecentMessages(2);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">{getGreeting()}</p>
        <h1 className="text-2xl font-semibold text-foreground">
          {user?.firstName || 'Welcome'}
        </h1>
      </div>

      {/* Role indicator for demo */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {role}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {mockClub.name}
        </span>
      </div>

      {/* Children (Parent view) */}
      {role === 'parent' && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Your Children
          </h2>
          <div className="grid gap-3">
            {mockPlayers.map((player) => (
              <Card key={player.id} className="shadow-card">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {player.firstName} {player.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">U12 Blue</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Upcoming Events
        </h2>
        <div className="space-y-3">
          {upcomingEvents.map((event) => (
            <Card key={event.id} className="shadow-card overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 text-center">
                    <p className="text-xs text-muted-foreground uppercase">
                      {format(new Date(event.startTime), 'MMM')}
                    </p>
                    <p className="text-xl font-semibold text-foreground">
                      {format(new Date(event.startTime), 'd')}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={event.type === 'match' ? 'default' : 'secondary'}
                        className="text-xs capitalize"
                      >
                        {event.type}
                      </Badge>
                    </div>
                    <p className="font-medium text-foreground truncate">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(event.startTime), 'h:mm a')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Announcements */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Announcements
        </h2>
        <div className="space-y-3">
          {recentMessages.map((message) => (
            <Card key={message.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.priority === 'important' 
                      ? 'bg-destructive/10 text-destructive' 
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{message.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {message.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {message.authorName} • {format(new Date(message.createdAt), 'MMM d')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
