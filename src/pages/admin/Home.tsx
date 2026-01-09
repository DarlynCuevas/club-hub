import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useClub } from '@/contexts/ClubContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, User, Bell, Users } from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, role, clubId } = useAuth()
  const { club } = useClub()

  const [loading, setLoading] = useState(true)
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])

  //  stats 
  const [teamsCount, setTeamsCount] = useState(0)
  const [playersCount, setPlayersCount] = useState(0)

  // Alertas críticas
  const [alerts, setAlerts] = useState<{
    unassignedPlayers: number
    inactivePlayers: number
    teamsWithoutCoach: number
  }>({
    unassignedPlayers: 0,
    inactivePlayers: 0,
    teamsWithoutCoach: 0,
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      // ================= EVENTS =================
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3)

      if (eventsData) {
        setUpcomingEvents(
          eventsData.map(e => ({
            ...e,
            startTime: e.start_time,
            endTime: e.end_time,
            type: e.event_type,
          }))
        )
      }

      // ================= MESSAGES =================
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          id,
          title,
          body,
          created_at,
          users_profile:created_by (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(2)

      if (messagesData) {
        setRecentMessages(
          messagesData.map(m => ({
            id: m.id,
            title: m.title,
            body: m.body,
            authorName: m.users_profile?.full_name ?? '—',
            createdAt: m.created_at,
          }))
        )
      }

      // ================= PARENT PLAYERS =================
      if (role === 'parent' && user) {
        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('parent_user_id', user.id)

        if (playersData) setPlayers(playersData)
      }


      // ================= ADMIN STATS & ALERTS =================
      if (role === 'super_admin') {
        const { count: tCount } = await supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })

        const { count: pCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })

        setTeamsCount(tCount ?? 0)
        setPlayersCount(pCount ?? 0)

        // 1️⃣ Jugadores sin equipo (workaround: NOT IN)
        // Obtener todos los player_id asignados a algún equipo
        const { data: assignedRows } = await supabase
          .from('team_players')
          .select('player_id')

        const assignedIds = (assignedRows ?? []).map(r => r.player_id).filter(Boolean)

        let unassignedPlayers = 0
        if (assignedIds.length > 0) {
          // Supabase espera string con paréntesis: (id1,id2,...)
          const idsString = `(${assignedIds.join(',')})`
          const { count } = await supabase
            .from('players')
            .select('id', { count: 'exact' })
            .not('id', 'in', idsString)
          unassignedPlayers = count ?? 0
        } else {
          const { count } = await supabase
            .from('players')
            .select('id', { count: 'exact' })
          unassignedPlayers = count ?? 0
        }

        // 2️ Jugadores sin acceso
        const { count: inactivePlayers } = await supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .is('user_id', null)

        // 3️ Equipos sin entrenador
        const { count: teamsWithoutCoach } = await supabase
          .from('teams')
          .select('id, team_coaches!left(team_id)', { count: 'exact', head: true })
          .is('team_coaches.team_id', null)

        console.log('assignedIds:', assignedIds)
        console.log('unassignedPlayers:', unassignedPlayers)
        setAlerts({
          unassignedPlayers: unassignedPlayers ?? 0,
          inactivePlayers: inactivePlayers ?? 0,
          teamsWithoutCoach: teamsWithoutCoach ?? 0,
        })
        console.log('ALERTS:', {
          unassignedPlayers,
          inactivePlayers,
          teamsWithoutCoach,
        })
      }

      setLoading(false)
    }

    load()
  }, [role, user, clubId])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('home.greeting.morning')
    if (hour < 18) return t('home.greeting.afternoon')
    return t('home.greeting.evening')
  }

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-6 pb-20 space-y-8">

      {/* ================= HEADER ================= */}
      <section className="space-y-1">
        <p className="text-sm text-muted-foreground">{getGreeting()}</p>
        <h1 className="text-2xl font-semibold">
          {user?.firstName || t('home.welcome')}
        </h1>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {t(`roles.${role}`)}
          </Badge>
          {club?.name && (
            <span className="text-sm text-muted-foreground">
              {club.name}
            </span>
          )}
        </div>
      </section>

      {/* ===================================================== */}
      {/*  SUPER ADMIN ALERTS */}
      {/* ===================================================== */}
      {role === 'super_admin' && (
        <section className="grid gap-3 mb-4">
          {alerts.unassignedPlayers > 0 && (
            <Card
              className="border-l-4 border-orange-500 cursor-pointer"
              onClick={() => navigate('/admin/players')}
            >
              <CardContent className="p-4">
                <p className="text-sm font-medium">
                  {alerts.unassignedPlayers} jugadores sin equipo asignado
                </p>
              </CardContent>
            </Card>
          )}

          {alerts.inactivePlayers > 0 && (
            <Card
              className="border-l-4 border-yellow-500 cursor-pointer"
              onClick={() => navigate('/admin/players')}
            >
              <CardContent className="p-4">
                <p className="text-sm font-medium">
                  {alerts.inactivePlayers} jugadores sin acceso activado
                </p>
              </CardContent>
            </Card>
          )}

          {alerts.teamsWithoutCoach > 0 && (
            <Card
              className="border-l-4 border-red-500 cursor-pointer"
              onClick={() => navigate('/teams')}
            >
              <CardContent className="p-4">
                <p className="text-sm font-medium">
                  {alerts.teamsWithoutCoach} equipos sin entrenador
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ===================================================== */}
      {/*  SUPER ADMIN DASHBOARD*/}
      {/* ===================================================== */}
      {role === 'super_admin' && (
        <section className="space-y-4">
          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Card onClick={() => navigate('/teams')} className="cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="w-6 h-6" />
                <span>{t('teams.title', 'Equipos')}</span>
              </CardContent>
            </Card>

            <Card onClick={() => navigate('/admin/players')} className="cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <User className="w-6 h-6" />
                <span>{t('teams.managePlayers', 'Jugadores')}</span>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Equipos</p>
                <p className="text-2xl font-semibold">{teamsCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Jugadores</p>
                <p className="text-2xl font-semibold">{playersCount}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ================= UPCOMING EVENTS ================= */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t('home.upcomingEvents')}
        </h2>

        {upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              {t('home.noEvents')}
            </CardContent>
          </Card>
        ) : (
          upcomingEvents.map(event => (
            <Card key={event.id}>
              <CardContent className="p-4 flex gap-4">
                <div className="w-12 text-center">
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(new Date(event.startTime), 'MMM')}
                  </p>
                  <p className="text-xl font-semibold">
                    {format(new Date(event.startTime), 'd')}
                  </p>
                </div>

                <div className="flex-1">
                  <Badge
                    variant={event.type === 'match' ? 'default' : 'secondary'}
                    className="mb-1 capitalize"
                  >
                    {t(`eventTypes.${event.type}`)}
                  </Badge>

                  <p className="font-medium">{event.title}</p>

                  <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(event.startTime), 'h:mm a')}
                    </span>

                    {event.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* ================= ANNOUNCEMENTS ================= */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t('home.announcements')}
        </h2>

        {recentMessages.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              {t('home.noMessages')}
            </CardContent>
          </Card>
        ) : (
          recentMessages.map(message => (
            <Card key={message.id}>
              <CardContent className="p-4 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                </div>

                <div>
                  <p className="font-medium">{message.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {message.authorName} ·{' '}
                    {format(new Date(message.createdAt), 'MMM d')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

    </div>
  )
}