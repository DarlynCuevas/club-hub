
import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
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

    // Estados para edición
    const [editTeamId, setEditTeamId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editSeason, setEditSeason] = useState('')
    const [editCenterId, setEditCenterId] = useState<string | null>(null)
    const [availableCenters, setAvailableCenters] = useState<{ id: string; name: string }[]>([])

    // Cargar centers filtrados por club
    const loadCentersForTeam = async (clubId: string) => {
      const { data } = await supabase
        .from('centers')
        .select('id, name')
        .eq('club_id', clubId)
        .order('name')
      setAvailableCenters(data ?? [])
    }

    // Función para abrir edición
    const openEdit = (team: any) => {
      setEditTeamId(team.id)
      setEditName(team.name)
      setEditSeason(team.season || '')
      setEditCenterId(team.center_id || null)
      if (team.club_id) loadCentersForTeam(team.club_id)
    }


    // Función para actualizar equipo (incluye center)
    const updateTeam = async (teamId: string, name: string, season: string, centerId: string | null) => {
      const { error } = await supabase
        .from('teams')
        .update({ name, season, center_id: centerId || null })
        .eq('id', teamId)
      if (error) {
        console.error(error)
        return
      }
      setEditTeamId(null)
      loadTeams()
    }

    // Función para eliminar equipo
    const deleteTeam = async (teamId: string) => {
      const confirmed = window.confirm('¿Eliminar este equipo?')
      if (!confirmed) return
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
      if (error) {
        console.error(error)
        return
      }
      loadTeams()
    }
  const { role, user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<TeamWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Estados para crear equipo (super_admin)
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])
  const [openCreate, setOpenCreate] = useState(false)
  const [clubId, setClubId] = useState<string>('')
  const [name, setName] = useState('')
  const [season, setSeason] = useState('')
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    if (role === 'player') {
      navigate('/dashboard/player', { replace: true })
    }
  }, [role, navigate])

  // Cargar clubs solo para super_admin
  useEffect(() => {
    if (role !== 'super_admin') return

    const loadClubs = async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name')
        .order('name')

      if (error) {
        console.error('Error loading clubs', error)
        return
      }
      setClubs(data ?? [])
    }
    loadClubs()
  }, [role])

  // Hacer loadTeams accesible para recarga tras crear
  const loadTeams = async () => {
    setLoading(true)
    setError(null)

    /* =======================
       ADMIN
    ======================= */
    if (role === 'super_admin') {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, season')

      if (error) {
        setError('Error loading teams')
        setLoading(false)
        return
      }

      setTeams(
        (data ?? []).map(team => ({
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

      const teamsMap = new Map<string, TeamWithPlayers>()

      data.forEach(row => {
        const team = Array.isArray(row.team) ? row.team[0] : row.team
        const player = Array.isArray(row.player) ? row.player[0] : row.player
        if (!team || !player) return

        if (!teamsMap.has(team.id)) {
          teamsMap.set(team.id, {
            id: team.id,
            name: team.name,
            season: team.season,
            players: [],
          })
        }

        teamsMap.get(team.id)!.players.push(player)
      })

      setTeams(Array.from(teamsMap.values()))
      setLoading(false)
      return
    }
  }

  useEffect(() => {
    if (!user?.id || !role) return
    loadTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role])

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

      {/* Acceso a gestión de centers (solo super_admin) */}
      {role === 'super_admin' && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => navigate('/centers')}
            className="mb-2 px-4 py-2 bg-muted text-foreground rounded border border-border"
            style={{ marginRight: 8 }}
          >
            Gestionar centers
          </button>
          <button onClick={() => setOpenCreate(true)} className="mb-2 px-4 py-2 bg-primary text-white rounded">
            Crear equipo
          </button>
          {openCreate && (
            <div style={{ border: '1px solid #ccc', padding: 16, marginBottom: 16, background: '#fff' }}>
              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Crear equipo</h3>
              <select
                value={clubId}
                onChange={e => setClubId(e.target.value)}
                className="block mb-2 px-2 py-1 border rounded"
              >
                <option value="">Selecciona un club</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nombre del equipo"
                value={name}
                onChange={e => setName(e.target.value)}
                className="block mb-2 px-2 py-1 border rounded w-full"
              />
              <input
                type="text"
                placeholder="Temporada (ej. 2025/2026)"
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="block mb-2 px-2 py-1 border rounded w-full"
              />
              <div style={{ marginTop: 12 }}>
                <button onClick={createTeam} disabled={creating} className="mr-2 px-4 py-2 bg-primary text-white rounded">
                  Crear
                </button>
                <button onClick={() => setOpenCreate(false)} className="px-4 py-2 bg-muted text-foreground rounded">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                  {editTeamId === team.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="block mb-1 px-2 py-1 border rounded w-full"
                      />
                      <input
                        type="text"
                        value={editSeason}
                        onChange={e => setEditSeason(e.target.value)}
                        className="block mb-1 px-2 py-1 border rounded w-full"
                      />
                      <div className="mb-1">
                        <Label>Center</Label>
                        <select
                          className="w-full border rounded-md h-10 px-3"
                          value={editCenterId ?? ''}
                          onChange={e => setEditCenterId(e.target.value || null)}
                        >
                          <option value="">Sin center</option>
                          {availableCenters.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={() => updateTeam(team.id, editName, editSeason, editCenterId)} className="mr-2 px-3 py-1 bg-primary text-white rounded text-xs">Guardar</button>
                      <button onClick={() => setEditTeamId(null)} className="px-3 py-1 bg-muted text-foreground rounded text-xs">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">
                        {team.name}
                      </p>
                      {team.season && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {team.season}
                        </Badge>
                      )}
                      {role === 'super_admin' && (
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => openEdit(team)} className="px-3 py-1 bg-muted text-foreground rounded text-xs">Editar</button>
                          <button onClick={() => deleteTeam(team.id)} className="px-3 py-1 bg-destructive text-white rounded text-xs">Eliminar</button>
                        </div>
                      )}
                    </>
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

  // Función para crear equipo
  async function createTeam() {
    if (!clubId || !name || !season) return
    setCreating(true)
    const { error } = await supabase
      .from('teams')
      .insert({
        club_id: clubId,
        name,
        season,
      })
    setCreating(false)
    if (error) {
      console.error('Error creating team', error)
      return
    }
    setClubId('')
    setName('')
    setSeason('')
    setOpenCreate(false)
    loadTeams()
  }
}
