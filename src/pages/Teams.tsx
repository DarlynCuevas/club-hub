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

export default function Teams() {
  const { role, user } = useAuth()
  const { t } = useTranslation()
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [playersByTeam, setTeamPlayers] = useState<Record<string, any[]>>({})
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [loadingTeamId, setLoadingTeamId] = useState<string | null>(null)
  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true)
      setError(null)

      if (role === 'coach') {
        // Coach: equipos por team_coaches
        const { data: teamsData } = await supabase
          .from('team_coaches')
          .select(`
            teams (
              id,
              name,
              season
            )
          `)
          .eq('coach_user_id', user.id)
        setTeams(teamsData?.map(r => r.teams) || [])
        setLoading(false)
        return
      }

      // Otros roles: mostrar mensaje o lógica alternativa
      setTeams([])
      setLoading(false)
    }

    loadTeams()
  }, [role, user])

  const loadTeamPlayers = async (teamId: string) => {
    setLoadingTeamId(teamId)
    const { data, error } = await supabase
      .from('team_players')
      .select(`
        player:players!team_players_player_id_fkey (
          id,
          full_name,
          birth_date
        )
      `)
      .eq('team_id', teamId)

    if (!error && data) {
      setTeamPlayers(prev => ({
        ...prev,
        [teamId]: data.flatMap(row => row.player) ?? [],
      }))
    }

    setLoadingTeamId(null)
  }
  // --- UI states ---
  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} />
  if (teams.length === 0) return <Empty title={t('teams.empty')} />

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
        {teams.map(team => {
          const isExpanded = expandedTeamId === team.id
          const teamPlayers = playersByTeam[team.id] || []

          return (
            <Card
              key={team.id}
              onClick={() => {
                const isOpen = expandedTeamId === team.id
                setExpandedTeamId(isOpen ? null : team.id)

                if (!isOpen) {
                  loadTeamPlayers(team.id)
                }
              }}
            >
              <CardContent className="p-4 space-y-3">
                {/* Team row */}
                <div className="flex items-center gap-4">
                  {/* Main click → team detail */}
                  <div
                    className="flex-1 flex items-center gap-4 cursor-pointer"
                    onClick={() => navigate(`/admin/teams/${team.id}`)}
                  >
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

                  {/* Expand roster */}
                  {role === 'coach' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const isOpen = expandedTeamId === team.id
                        setExpandedTeamId(isOpen ? null : team.id)
                        if (!isOpen && !playersByTeam[team.id]) {
                          loadTeamPlayers(team.id)
                        }
                      }}
                      className="p-2 rounded hover:bg-muted"
                    >
                      <ChevronRight
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                  )}
                </div>

                {/* Roster (expanded) */}
                {expandedTeamId === team.id && (
                  <div className="mt-4 border-t pt-3 space-y-2">
                    {loadingTeamId === team.id ? (
                      <p className="text-sm text-muted-foreground">
                        Loading players…
                      </p>
                    ) : teamPlayers.length > 0 ? (
                      teamPlayers.map(player => (
                        <div key={player.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>

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
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No players assigned
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}