import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthContext'

type Team = {
  id: string
  name: string
  category: string | null
}

type Coach = {
  id: string
  full_name: string
}

type Player = {
  id: string
  full_name: string
}

export default function TeamDetailAdmin() {
  const { teamId } = useParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
    const { user, role } = useAuth()
  useEffect(() => {
    const load = async () => {
      // Team
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, category')
        .eq('id', teamId)
        .single()

      setTeam(teamData)

      // Coaches
      const { data: coachesData } = await supabase
        .from('team_coaches')
        .select(`
          users_profile (
            id,
            full_name
          )
        `)
        .eq('team_id', teamId)

      setCoaches(
        (coachesData || []).map((c: any) => c.users_profile)
      )

      // Players
      const { data: playersData, error: playersError } = await supabase
        .from('team_players')
        .select(`
          players (
            id,
            full_name,
            birth_date
          )
        `)
        .eq('team_id', teamId)

      setPlayers(
        (playersData || []).map((p: any) => p.players)
      )

      setLoading(false)
    }

    load()
  }, [teamId])

  if (loading) return <Spinner />
  if (!team) return <div className="p-4">Team not found</div>

  return (
    <div className="px-4 pt-6 pb-6 space-y-4">
      {/* Team header */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <h1 className="text-xl font-semibold">{team.name}</h1>
          {team.category && (
            <p className="text-sm text-muted-foreground">
              {team.category}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Coaches */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium uppercase text-muted-foreground">
              Coaches
            </h2>
            <Button size="sm" variant="outline">
              Add coach
            </Button>
          </div>

          {coaches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coaches assigned</p>
          ) : (
            coaches.map(c => (
              <p key={c.id} className="text-sm">
                {c.full_name}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      {/* Players */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium uppercase text-muted-foreground">
              Players
            </h2>
            <Button size="sm" variant="outline">
              Add player
            </Button>
          </div>

          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground">No players assigned</p>
          ) : (
            players.map(p => (
              <p key={p.id} className="text-sm">
                {p.full_name}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}