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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const loadStats = async () => {
      setLoading(true)
      setError(null)

      // 1️ Hijos del parent
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('parent_user_id', user.id)

      if (playersError) {
        setError('No se pudieron cargar los datos')
        setLoading(false)
        return
      }

      const playerIds = players?.map(p => p.id) ?? []

      // 2️ Equipos únicos (vía team_players)
      let teamsCount = 0
      if (playerIds.length > 0) {
        const { data: teamPlayers } = await supabase
          .from('team_players')
          .select('team_id')
          .in('player_id', playerIds)

        teamsCount = new Set(
          (teamPlayers ?? []).map(tp => tp.team_id)
        ).size
      }

      // 3️ Accesos pendientes
      const { data: pendingPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_user_id', user.id)
        .is('user_id', null)

      setStats({
        playersCount: players?.length ?? 0,
        teamsCount,
        pendingAccessCount: pendingPlayers?.length ?? 0,
      })

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

      {/* CTA */}
      <div className="pt-4">
        <Button onClick={() => navigate('/teams')}>
          Ver equipos
        </Button>
      </div>
    </div>
  )
}
