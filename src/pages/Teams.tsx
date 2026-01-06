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

export default function Teams() {
  const { role } = useAuth()
  const { t } = useTranslation()
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true)
      setError(null)

      // 🔹 Teams (RLS filtra por rol)
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, season')

      if (teamsError) {
        setError('Failed to load teams')
        setLoading(false)
        return
      }

      setTeams(teamsData || [])

      // 🔹 Roster preview solo para coach
      if (role === 'coach' && teamsData && teamsData.length > 0) {
        const firstTeamId = teamsData[0].id

        const { data: rosterData, error: rosterError } = await supabase
          .from('team_players')
          .select(`
            players (
              id,
              full_name,
              birth_date
            )
          `)
          .eq('team_id', firstTeamId)

        if (!rosterError) {
          setPlayers(rosterData?.map(r => r.players) || [])
        }
      }

      setLoading(false)
    }

    loadTeams()
  }, [role])

  // --- UI states ---
  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} />
  if (teams.length === 0) return <Empty title={t('teams.empty')} />

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('teams.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === 'coach' ? t('teams.coachSubtitle') : t('teams.userSubtitle')}
        </p>
      </div>

      {/* Teams list */}
      <div className="space-y-3">
        {teams.map(team => (
          <Card
            key={team.id}
            className="shadow-card cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{team.name}</p>
                  {team.season && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {team.season}
                    </Badge>
                  )}
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roster preview (coach only) */}
      {role === 'coach' && players.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('teams.quickRoster')}
          </h2>

          <Card className="shadow-card">
            <CardContent className="p-0 divide-y divide-border">
              {players.map(player => (
                <div key={player.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {player.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('teams.born', { year: player.birth_date ? new Date(player.birth_date).getFullYear() : t('teams.na') })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
