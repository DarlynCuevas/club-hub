import { Spinner } from '@/components/ui/spinner'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { useTranslation } from 'react-i18next'
import { EventDB } from '@/types'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

type HijoPadre = { id: string; full_name: string; team_ids: string[] }

interface CalendarPageProps {
  hijosDelPadre: HijoPadre[]
}

// 1. Definir el tipo para la view
interface ParentEventRow {
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type: string;
  cancelled: boolean;
  team_id: string;
  team_name: string;
  player_id: string;
  player_name: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [hijosDelPadre, setHijosDelPadre] = useState<any[]>([]);
  // Función para obtener hijos asociados a un evento
  function getHijosAsociados(event: EventDB) {
    if (!event.team_id) return [];
    return hijosDelPadre.filter(hijo =>
      Array.isArray(hijo.team_players) &&
      hijo.team_players.some(tp => tp.team_id === event.team_id)
    );
  }
  const [hijosLoading, setHijosLoading] = useState(true);

  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [events, setEvents] = useState<EventDB[]>([])
  const [parentEvents, setParentEvents] = useState<ParentEventRow[]>([]);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 🔹 Load events (RLS handles filtering)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('parent_events_view')
        .select(`
        event_id,
        title,
        start_time,
        end_time,
        event_type,
        cancelled,
        team_id,
        team_name,
        player_id,
        player_name
      `)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      if (error) {
        setError('Failed to load events');
      } else {
        setParentEvents(data || []);
      }
      setLoading(false);
    };
    load();
  }, [location.key])

  useEffect(() => {
    const loadHijos = async () => {
      if (!user?.id) return;
      setHijosLoading(true);

      const { data: hijos } = await supabase
        .from('players')
        .select(`
  id,
  full_name,
  team_players!team_players_player_fk ( team_id )
`)
        .eq('parent_user_id', user.id);

      setHijosDelPadre(hijos ?? []);
      setHijosLoading(false);
    };

    loadHijos();
  }, [user]);


  // Agrupar por evento
  function groupEventsById(rows: ParentEventRow[]) {
    type TeamGroup = { team_name: string; players: { player_id: string; player_name: string }[] };
    const map = new Map<string, any>();
    for (const row of rows) {
      if (!map.has(row.event_id)) {
        map.set(row.event_id, {
          ...row,
          teams: {} as Record<string, TeamGroup>,
        });
      }
      const event = map.get(row.event_id);
      if (!event.teams[row.team_id]) {
        event.teams[row.team_id] = {
          team_name: row.team_name,
          players: [],
        };
      }
      event.teams[row.team_id].players.push({
        player_id: row.player_id,
        player_name: row.player_name,
      });
    }
    return Array.from(map.values());
  }

  // Events for selected date
  const selectedEvents: EventDB[] = selectedDate
    ? events.filter(e =>
      isSameDay(new Date(e.start_time), selectedDate)
    )
    : []

  // Days that have events
  const hasEvent = (date: Date) =>
    events.some(e => isSameDay(new Date(e.start_time), date))

  if (loading) return <Spinner />
  if (error) return <div className="text-center text-muted-foreground">{error}</div>

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('calendar.title')}
        </h1>
      </div>

      {/* Calendar */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <h2 className="text-lg font-medium">
              {t(`calendar.months.${currentMonth.getMonth()}`)}{' '}
              {currentMonth.getFullYear()}
            </h2>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date())
                setSelectedDate(new Date())
              }}
              className="ml-2"
            >
              Hoy
            </Button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {(t('calendar.days', {
              returnObjects: true,
            }) as string[]).map((day: string, i: number) => (
              <div
                key={i}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map(day => {
              const isSelected =
                selectedDate && isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square rounded-full flex flex-col items-center justify-center relative
                    text-sm transition-colors
                    ${isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                        ? 'bg-secondary font-medium'
                        : 'hover:bg-muted'
                    }
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {hasEvent(day) && !isSelected && (
                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>


      {/* Selected date events */}
      {selectedDate && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t(`calendar.weekdays.${selectedDate.getDay()}`)},{" "}
            {t(`calendar.months.${selectedDate.getMonth()}`)}{" "}
            {selectedDate.getDate()}
          </h2>

          {selectedEvents.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {t('calendar.noEvents')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {groupEventsById(parentEvents)
                .filter(event => isSameDay(new Date(event.start_time), selectedDate))
                .map(event => (
                  <Card key={event.event_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {t(`eventTypes.${event.event_type}`)}
                        </Badge>
                        {event.cancelled && (
                          <Badge variant="destructive" className="text-xs">
                            Cancelado
                          </Badge>
                        )}
                      </div>

                      <p className="font-medium text-foreground">
                        {event.title}
                      </p>

                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(event.start_time), 'HH:mm')} –{" "}
                          {format(new Date(event.end_time), 'HH:mm')}
                        </span>
                      </div>

                      {/* Equipos e hijos */}
                      {Object.entries(event.teams as Record<string, { team_name: string; players: { player_id: string; player_name: string }[] }> ).map(([teamId, team]) => (
                        <div key={teamId} className="mt-2">
                          <p className="text-sm text-muted-foreground font-semibold">Equipo: {team.team_name}</p>
                          <p className="text-xs text-primary font-semibold mt-1">
                            {team.players.length === 1
                              ? `Hijo: ${team.players[0].player_name}`
                              : `Hijos: ${team.players.map(p => p.player_name).join(', ')}`}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
            </div>

          )}
        </section>
      )}
    </div>
  )
}
