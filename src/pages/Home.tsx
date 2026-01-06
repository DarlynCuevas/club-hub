import { Spinner } from '@/components/ui/spinner';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const { user, role, clubId } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [players, setPlayers] = useState([]);
  const [club, setClub] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Fetch upcoming events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);
      if (!eventsError && eventsData) {
        setUpcomingEvents(
          eventsData.map(e => ({
            ...e,
            startTime: e.start_time,
            endTime: e.end_time,
            type: e.event_type,
          }))
        );
      }

      // Fetch recent messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          title,
          body,
          created_at,
          users_profile (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(2);
      if (!messagesError) {
        setRecentMessages(
          (messagesData || []).map(m => ({
            id: m.id,
            title: m.title,
            body: m.body,
            authorName: m.users_profile?.full_name ?? '—',
            createdAt: m.created_at,
          }))
        )
      }

      // Fetch players (for parent role)
      if (role === 'parent' && user) {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('parent_id', user.id);
        if (!playersError) setPlayers(playersData || []);
      }

      // Fetch club info
      if (clubId) {
        const { data: clubData, error: clubError } = await supabase
          .from('clubs')
          .select('*')
          .eq('id', clubId)
          .maybeSingle();
        if (!clubError) setClub(clubData);
      }
      setLoading(false);
    };
    load();
  }, [role, user, clubId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting.morning');
    if (hour < 18) return t('home.greeting.afternoon');
    return t('home.greeting.evening');
  };

  if (loading) return <Spinner />;
  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">{getGreeting()}</p>
        <h1 className="text-2xl font-semibold text-foreground">
          {user?.firstName || t('home.welcome')}
        </h1>
      </div>

      {/* Role indicator */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {t(`roles.${role}`)}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {club?.name || ''}
        </span>
      </div>

      {/* Children (Parent view) */}
      {role === 'parent' && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('home.children')}
          </h2>
          <div className="grid gap-3">
            {players.map((player) => (
              <Card key={player.id} className="shadow-card">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {player.firstName} {player.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{player.teamName || ''}</p>
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
          {t('home.upcomingEvents')}
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
                        {t(`eventTypes.${event.type}`)}
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
          {t('home.announcements')}
        </h2>
        <div className="space-y-3">
          {recentMessages.map((message) => (
            <Card key={message.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.priority === 'important'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-secondary text-muted-foreground'
                      }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <p className="font-medium text-foreground leading-snug">
                      {message.title}
                    </p>

                    {/* Meta */}
                    <p className="text-xs text-muted-foreground mt-1">
                      {message.authorName}
                      {message.authorRole && (
                        <> · {t(`roles.${message.authorRole}`)}</>
                      )}
                      {' · '}
                      {message.createdAt && !isNaN(new Date(message.createdAt).getTime())
                        ? format(new Date(message.createdAt), 'MMM d')
                        : t('home.invalidDate')}
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
