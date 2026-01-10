import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Error as ErrorState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'
import { Users, UserCheck, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type DashboardStats = {
  playersCount: number
  teamsCount: number
  pendingAccessCount: number
}

export default function ParentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [children, setChildren] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const loadStats = async () => {
      setLoading(true)
      setError(null)

      // 1️ Hijos del parent (optimizado)
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, user_id')
        .eq('parent_user_id', user.id)

      if (playersError) {
        setError('No se pudieron cargar los datos')
        setLoading(false)
        return
      }

      const playerIds = players?.map(p => p.id) ?? []
      const pendingAccessCount = players?.filter(p => p.user_id === null).length ?? 0

      // 2️ Equipos únicos (vía team_players)
      let teamIds: string[] = [];
      let teamsCount = 0;
      if (playerIds.length > 0) {
        const { data: teamPlayers } = await supabase
          .from('team_players')
          .select('team_id')
          .in('player_id', playerIds);
        teamIds = Array.from(new Set((teamPlayers ?? []).map(tp => tp.team_id)));
        teamsCount = teamIds.length;
      }

      setStats({
        playersCount: players?.length ?? 0,
        teamsCount,
        pendingAccessCount,
      })

      // 3️ Preview "Mis hijos"
      const { data: childrenPreview } = await supabase
        .from('players')
        .select(`
          id,
          full_name,
          user_id,
          team_players!team_players_player_fk (
            teams!team_players_team_fk (
              id,
              name
            )
          )
        `)
        .eq('parent_user_id', user.id)
        .limit(3)

      setChildren(childrenPreview ?? [])
      // 4️ Próximos eventos
      // Obtener los team_id de los hijos
     
      if (playerIds.length > 0) {
        const { data: teamPlayers } = await supabase
          .from('team_players')
          .select('team_id')
          .in('player_id', playerIds)
        teamIds = Array.from(new Set((teamPlayers ?? []).map(tp => tp.team_id)));
      }

      // Obtener los eventos futuros de esos equipos
      let eventsData = [];
      if (teamIds.length > 0) {
        const { data: eventsRaw } = await supabase
          .from('events')
          .select('id, team_id, event_type, title, start_time, end_time, teams!events_team_id_fkey (name)')
          .in('team_id', teamIds)
          .gt('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(3);
        eventsData = eventsRaw ?? [];
      }
      setEvents(eventsData);
      setLoading(false)
    }

    loadStats()
  }, [user])

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} />
  if (!stats) return null

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Panel del padre
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumen de tus hijos y equipos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <Users className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Hijos</p>
              <p className="text-xl font-semibold">
                {stats.playersCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <UserCheck className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Equipos</p>
              <p className="text-xl font-semibold">
                {stats.teamsCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">
                Accesos pendientes
              </p>
              <p className="text-xl font-semibold">
                {stats.pendingAccessCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview: Mis hijos */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mis hijos</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/parent/players')}
            >
              Ver todos
            </Button>
          </div>

          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no tienes hijos registrados
            </p>
          ) : (
            <div className="space-y-3">
              {children.map(child => {
                const teamName =
                  child.team_players?.[0]?.teams?.name ?? 'Sin equipo'

                return (
                  <div
                    key={child.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {child.full_name.charAt(0)}
                      </div>

                      <div>
                        <p className="font-medium">{child.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {teamName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {child.user_id ? (
                        <span className="text-xs text-green-600">
                          Activo
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-600">
                          Acceso pendiente
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos eventos */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Próximos eventos</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/calendar')}
            >
              Ver calendario
            </Button>
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay eventos próximos
            </p>
          ) : (
            <div className="space-y-3">
              {events.map(event => {
                const dateObj = new Date(event.start_time);
                const dateStr = dateObj.toLocaleDateString('es-ES', {
                  weekday: 'short', day: '2-digit', month: 'short'
                });
                const timeStr = dateObj.toLocaleTimeString('es-ES', {
                  hour: '2-digit', minute: '2-digit'
                });
                let typeIcon = null;
                if (event.event_type === 'training') typeIcon = '🏋️';
                if (event.event_type === 'match') typeIcon = '⚽';
                if (event.event_type === 'meeting') typeIcon = '📋';
                return (
                  <div key={event.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">
                        <span className="mr-2">{typeIcon}</span>
                        {event.title || event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateStr} · {timeStr}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.teams?.name || 'Sin equipo'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.location}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="pt-4">
        <Button onClick={() => navigate('/teams')}>
          Ver equipos
        </Button>
      </div>
    </div>
  )
}
