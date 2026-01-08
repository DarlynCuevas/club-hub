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
  season?: string
}

export default function PlayerDashboard() {
  const { user } = useAuth()

  const [player, setPlayer] = useState<Player | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      /* =======================
         1️ PERFIL DEL PLAYER
      ======================= */
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('id, full_name, birth_date')
        .eq('user_id', user.id)
        .single()

      if (playerError || !playerData) {
        setError('Acceso bloqueado')
        setLoading(false)
        return
      }

      setPlayer(playerData)

      /* =======================
         2️ EQUIPOS DEL PLAYER
      ======================= */
      const { data: teamsData, error: teamsError } = await supabase
        .from('team_players')
        .select(`
          team:teams!team_players_team_id_fkey (
            id,
            name,
            season
          )
        `)

      if (teamsError) {
        setError('No se pudieron cargar los equipos')
        setLoading(false)
        return
      }

      // Deduplicar equipos por ID
      const seen = new Set<string>()
      const uniqueTeams: Team[] = []

      ;(teamsData ?? []).forEach((row: any) => {
        if (row.team && !seen.has(row.team.id)) {
          seen.add(row.team.id)
          uniqueTeams.push(row.team)
        }
      })

      setTeams(uniqueTeams)
      setLoading(false)
    }

    load()
  }, [user])

  /* =======================
     UI STATES
  ======================= */
  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} />
  if (!player) return <Empty title="Acceso bloqueado" />

  /* =======================
     HELPERS
  ======================= */
  const getAge = (birth: string | null) => {
    if (!birth) return '—'
    const today = new Date()
    const birthDate = new Date(birth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="px-4 pt-8 pb-8 space-y-8 max-w-md mx-auto">
      {/* Avatar + nombre */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-12 h-12 text-primary" />
        </div>
        <div className="text-2xl font-bold text-foreground text-center">
          {player.full_name}
        </div>
        <div className="text-base text-muted-foreground">
          Edad: {getAge(player.birth_date)}
        </div>
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
                <li
                  key={team.id}
                  className="p-4 bg-muted rounded text-lg font-medium"
                >
                  {team.name}
                  {team.season && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {team.season}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Calendario */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-3">Calendario</h2>
          <div className="text-muted-foreground text-base">
            (Próximamente)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
