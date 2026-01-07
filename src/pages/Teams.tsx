
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Empty } from '@/components/ui/empty'
import { Error as ErrorState } from '@/components/ui/error'
import { useAuth } from '@/contexts/AuthContext'
import { Users, ChevronRight, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import ActivatePlayerModal from './dashboard/parent/components/ActivatePlayerModal'

type Player = {
  id: string
  full_name: string
  birth_date: string | null
  user_id: string | null
  parent_user_id: string
}

type TeamWithPlayers = {
  id: string
  name: string
  season?: string
  players: Player[]
}

export default function Teams() {
  const { role, user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<TeamWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true)
      setError(null)

      /* =======================
         COACH
      ======================= */
      if (role === 'coach') {
        const { data, error } = await supabase
          .from('team_coaches')
          .select(`
            teams (
              id,
              name,
              season
            )
          `)
          .eq('coach_user_id', user.id)

        if (error) {
          setError('Error loading teams')
          setLoading(false)
          return
        }

        setTeams(
          (data ?? [])
            .map(r => r.teams)
            .flat()
            .filter(Boolean)
            .map((team: any) => ({
              id: team.id,
              name: team.name,
              season: team.season,
              players: [],
            }))
        )
        setLoading(false)
        return
      }

      /* =======================
         PARENT
      ======================= */
      if (role === 'parent') {
        const { data, error } = await supabase
          .from('team_players')
          .select(`
            team:teams!team_players_team_id_fkey (
              id,
              name,
              season
            ),
            player:players!team_players_player_id_fkey (
              id,
              full_name,
              birth_date,
              user_id,
              parent_user_id
            )
          `)
          .eq('player.parent_user_id', user.id)

        if (error || !data) {
          setTeams([])
          setLoading(false)
          return
        }

        // Agrupar por equipo
        const teamsMap = new Map<string, TeamWithPlayers>()

        data.forEach(row => {
          const team = Array.isArray(row.team) ? row.team[0] : row.team;
          const player = Array.isArray(row.player) ? row.player[0] : row.player;
          if (!team || !player) return;

          const teamId = team.id;
          if (!teamsMap.has(teamId)) {
            teamsMap.set(teamId, {
              id: team.id,
              name: team.name,
              season: team.season,
              players: [],
            });
          }
          teamsMap.get(teamId)!.players.push(player);
        });

        setTeams(Array.from(teamsMap.values()))
        setLoading(false)
        return
      }

      setTeams([])
      setLoading(false)
    }

    if (user?.id) loadTeams()
  }, [role, user])

  /* =======================
     UI STATES
  ======================= */
  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} />
  if (teams.length === 0) return <Empty title={t('teams.empty')} />

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t('teams.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === 'coach'
            ? t('teams.coachSubtitle')
            : t('teams.userSubtitle')}
        </p>
      </div>

      {/* Teams list */}
      <div className="space-y-3">
        {teams.map(team => (
          <Card key={team.id}>
            <CardContent className="p-4 space-y-4">
              {/* Team header */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>

                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {team.name}
                  </p>
                  {team.season && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {team.season}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Players */}
              <div className="border-t pt-3 space-y-2">
                {team.players.length > 0 ? (
                  team.players.map(player => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {player.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {player.birth_date
                            ? new Date(player.birth_date).getFullYear()
                            : '—'}
                        </p>
                      </div>

                      {player.user_id ? (
                        <span className="text-green-600 text-xs font-semibold">
                          Acceso activo
                        </span>
                      ) : (
                        <div onClick={e => e.stopPropagation()}>
                          <ActivatePlayerModal
                            playerId={player.id}
                            onSuccess={() => {
                              // recargar equipos tras activación
                              setTeams(prev =>
                                prev.map(t =>
                                  t.id === team.id
                                    ? {
                                        ...t,
                                        players: t.players.map(p =>
                                          p.id === player.id
                                            ? { ...p, user_id: 'activated' }
                                            : p
                                        ),
                                      }
                                    : t
                                )
                              )
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No players assigned
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
