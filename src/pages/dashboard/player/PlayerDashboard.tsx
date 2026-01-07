import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Error as ErrorState } from '@/components/ui/error'
import { User } from 'lucide-react'


type Player = {
  id: string
  full_name: string
  birth_date: string | null
}

type Team = {
  id: string
  name: string
}

type PlayerUIState = 'loading' | 'active' | 'blocked'

export default function PlayerDashboard() {
  const { user } = useAuth()
  const [player, setPlayer] = useState<Player | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Futuro: eventos del calendario
  // const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      setLoading(true)
      setError(null)
      // 1. Perfil del jugador
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('id, full_name, birth_date')
        .eq('user_id', user.id)
        .single()
      if (playerError) {
        setError('No se pudo cargar el perfil')
        setLoading(false)
        return
      }
      setPlayer(playerData)
      // 2. Equipos del jugador
      const { data: teamsData, error: teamsError } = await supabase
        .from('team_players')
        .select(`team:teams (id, name)`)
        .eq('player_id', playerData.id)
      if (teamsError) {
        setError('No se pudieron cargar los equipos')
        setLoading(false)
        return
      }
      setTeams((teamsData || []).map((t: any) => t.team))

      // 3. (Futuro) Eventos del calendario
      // const teamIds = (teamsData || []).map((t: any) => t.team?.id).filter(Boolean)
      // if (teamIds.length > 0) {
      //   const { data: eventsData } = await supabase
      //     .from('events')
      //     .select('*')
      //     .in('team_id', teamIds)
      //   setEvents(eventsData || [])
      // }

      setLoading(false)
    }
    load()
  }, [user])



  const uiState: PlayerUIState =
    loading ? 'loading' : !player ? 'blocked' : 'active'

  if (uiState === 'loading') return <Spinner />
  if (error) return <ErrorState message={error} />
  if (uiState === 'blocked') {
    return <Empty title="Acceso no disponible para este usuario" />
  }

  const getAge = (birth: string | null) => {
    if (!birth) return '—'
    const diff = Date.now() - new Date(birth).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  }

  return (
    <div className="px-4 pt-8 pb-8 space-y-8 max-w-md mx-auto">
      {/* Avatar grande y nombre */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-12 h-12 text-primary" />
        </div>
        <div className="text-2xl font-bold text-foreground text-center">{player.full_name}</div>
        <div className="text-base text-muted-foreground">Edad: {getAge(player.birth_date)}</div>
      </div>

      {/* Equipos */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-3">Mis equipos</h2>
          {teams.length === 0 ? (
            <Empty title="No perteneces a ningún equipo" />
          ) : (
            <ul className="space-y-3">
              {teams.map(team => (
                <li key={team.id} className="p-4 bg-muted rounded text-lg font-medium">
                  {team.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Calendario (placeholder) */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-3">Calendario</h2>
          <div className="text-muted-foreground text-base">(Próximamente)</div>
        </CardContent>
      </Card>
    </div>
  )
}
