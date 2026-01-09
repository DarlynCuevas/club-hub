import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Empty } from '@/components/ui/empty'
import { Error as ErrorState } from '@/components/ui/error'
import { useAuth } from '@/contexts/AuthContext'
import { Users, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import ActivatePlayerModal from '../parent/components/ActivatePlayerModal'
import type { UserRole } from '@/types'

type Player = {
  id: string
  full_name: string
  birth_date: string | null
  user_id: string | null
  parent_user_id: string
}

type TeamWithPlayers = {
  id: string;
  name: string;
  season?: string;
  players: Player[];
}

export default function Teams() {
  // Estados para gestión de coaches (solo super_admin)
  const [teamCoaches, setTeamCoaches] = useState<Record<string, any[]>>({})
  const [availableCoaches, setAvailableCoaches] = useState<any[]>([])
  const [assigningTeamId, setAssigningTeamId] = useState<string | null>(null)
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
    const { role, user } = useAuth() as { role: UserRole; user: any }
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<TeamWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Admin states
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])
  const [openCreate, setOpenCreate] = useState(false)
  const [clubId, setClubId] = useState('')
  const [name, setName] = useState('')
  const [season, setSeason] = useState('')
  const [creating, setCreating] = useState(false)

  // UI
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
      // Cargar coaches disponibles (una vez)
      useEffect(() => {
        if (role !== 'super_admin') return

        const loadCoaches = async () => {
          const { data } = await supabase
            .from('user_roles')
            .select(`
              user_id,
              users_profile (
                full_name
              )
            `)
            .eq('role', 'coach')

          setAvailableCoaches(data ?? [])
        }

        loadCoaches()
      }, [role])

      // Cargar coaches de un equipo (al expandir)
      const loadTeamCoaches = async (teamId: string) => {
        const { data } = await supabase
          .from('team_coaches')
          .select(`
            coach_user_id,
            users_profile (
              full_name
            )
          `)
          .eq('team_id', teamId)

        setTeamCoaches(prev => ({
          ...prev,
          [teamId]: data ?? [],
        }))
      }
    // Función para crear equipo
    const createTeam = async () => {
      if (!clubId || !name || !season) return;
      setCreating(true);
      const { error } = await supabase
        .from('teams')
        .insert({
          club_id: clubId,
          name,
          season,
        });
      setCreating(false);
      if (error) {
        console.error('Error creating team', error);
        return;
      }
      setClubId('');
      setName('');
      setSeason('');
      setOpenCreate(false);
      loadTeams();
    };


  /* =======================
     Redirect player
  ======================= */
  useEffect(() => {
    if (role === 'player') {
      navigate('/player/dashboard', { replace: true })
    }
  }, [role, navigate])

  /* =======================
     Load clubs (admin)
  ======================= */
  useEffect(() => {
    if (role !== 'super_admin') return

    supabase
      .from('clubs')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClubs(data ?? []))
  }, [role])

  /* =======================
     Load teams by role
  ======================= */
  const loadTeams = async () => {
    setLoading(true)
    setError(null)

    // SUPER ADMIN
    if (role === 'super_admin') {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          season,
          team_players:team_players!team_players_team_id_fkey (
            player:players!team_players_player_id_fkey (
              id,
              full_name,
              birth_date,
              user_id,
              parent_user_id
            )
          ),
          team_coaches:team_coaches!team_coaches_team_id_fkey (
            coach_user_id,
            coach:users_profile!team_coaches_coach_user_id_fkey (
              full_name
            )
          )
        `)

      if (error) {
        setError('Error loading teams')
      } else {
        setTeams(
          (data ?? []).map(t => ({
            id: t.id,
            name: t.name,
            season: t.season,
            players: Array.isArray(t.team_players)
              ? t.team_players
                  .map(tp => tp.player)
                  .filter(Boolean)
                  .flat()
              : [],
            coaches: Array.isArray(t.team_coaches)
              ? t.team_coaches.map(tc => ({
                  coach_user_id: tc.coach_user_id,
                  full_name: tc.users_profile?.full_name ?? '—',
                }))
              : [],
          }))
        )
      }

      setLoading(false)
      return
    }

    // COACH
    if (role === 'coach') {
      const { data, error } = await supabase
        .from('team_coaches')
        .select(`teams ( id, name, season )`)
        .eq('coach_user_id', user.id)

      if (error) {
        setError('Error loading teams')
      } else {
        setTeams(
          (data ?? [])
            .map(r => r.teams)
            .flat()
            .filter(Boolean)
            .map((t: any) => ({
              id: t.id,
              name: t.name,
              season: t.season,
              players: [],
            }))
        )
      }

      setLoading(false)
      return
    }

    // PARENT
    if (role === 'parent') {
      const { data, error } = await supabase
        .from('team_players')
        .select(`
          team:teams ( id, name, season ),
          player:players ( id, full_name, birth_date, user_id, parent_user_id )
        `)
        .eq('player.parent_user_id', user.id)

      if (error || !data) {
        setTeams([])
        setLoading(false)
        return
      }

      const map = new Map<string, TeamWithPlayers>()

      data.forEach(row => {
  const team = Array.isArray(row.team) ? row.team[0] : row.team;
  const player = Array.isArray(row.player) ? row.player[0] : row.player;
  if (!team || !team.id || !team.name || !player) return;

  if (!map.has(team.id)) {
    map.set(team.id, {
      id: team.id,
      name: team.name,
      season: team.season,
      players: [],
    });
  }

  map.get(team.id)!.players.push(player);
});

      setTeams(
        Array.from(map.values())
          .filter(team => team && typeof team.id !== 'undefined' && typeof team.name !== 'undefined')
          .map(team => ({
            id: team.id,
            name: team.name,
            season: team.season,
            players: Array.isArray(team.players) ? team.players : [],
          })) as TeamWithPlayers[]
      )
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id && role) loadTeams()
  }, [user?.id, role])

  /* =======================
     UI STATES
  ======================= */
  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} />

  if (teams.length === 0) {
    if (role === 'super_admin') {
      return (
        <div className="px-4 pt-6 pb-6 space-y-6">
          {/* Botones de gestión para super_admin */}
          <div className="mb-6">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => navigate('/centers')}
                className="px-4 py-2 bg-muted text-foreground rounded border border-border"
              >
                {t('teams.manageCenters', 'Gestionar centers')}
              </button>
              <button
                onClick={() => navigate('/admin/players')}
                className="px-4 py-2 bg-muted text-foreground rounded border border-border"
              >
                {t('teams.managePlayers', 'Gestionar jugadores')}
              </button>
              <button
                onClick={() => navigate('/admin/coaches')}
                className="px-4 py-2 bg-muted text-foreground rounded border border-border"
              >
                Gestionar coaches
              </button>
              <button onClick={() => setOpenCreate(true)} className="px-4 py-2 bg-primary text-white rounded">
                {t('teams.createBtn', 'Crear equipo')}
              </button>
            </div>
            {openCreate && (
              <div className="mt-2 border border-gray-200 rounded bg-white p-6">
                <h3 className="font-semibold mb-4">{t('teams.new')}</h3>
                <select
                  value={clubId}
                  onChange={e => setClubId(e.target.value)}
                  className="block mb-2 px-2 py-1 border rounded w-full"
                >
                  <option value="">{t('teams.selectClub')}</option>
                  {clubs.map(club => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={t('teams.namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="block mb-2 px-2 py-1 border rounded w-full"
                />
                <input
                  type="text"
                  placeholder={t('teams.seasonPlaceholder')}
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  className="block mb-2 px-2 py-1 border rounded w-full"
                />
                <div className="mt-4 flex gap-2">
                  <button onClick={createTeam} disabled={creating} className="px-4 py-2 bg-primary text-white rounded">
                    {t('teams.createBtn')}
                  </button>
                  <button onClick={() => setOpenCreate(false)} className="px-4 py-2 bg-muted text-foreground rounded">
                    {t('common.back')}
                  </button>
                </div>
              </div>
            )}
          </div>
          <Empty title={t('teams.emptyAdmin', 'Aún no hay equipos creados. Usa los botones de arriba para crear o gestionar equipos, jugadores o centers.')}/>
        </div>
      )
    }
    if (role === 'parent') {
      return (
        <Empty
          title={t('teams.emptyParent', 'Aún no tienes jugadores')}
          description="Crea a tu hijo para poder asignarlo a un equipo."
          action={
            <button
              onClick={() => navigate('/parent/players')}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              {t('teams.createPlayer', 'Crear jugador')}
            </button>
          }
        />
      )
    }
    return <Empty title={t('teams.empty', 'No hay equipos')} />
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      <h1 className="text-2xl font-semibold">{t('teams.title', 'Equipos')}</h1>

      {/* Botones de gestión para super_admin */}
      {role === 'super_admin' && (
        <div className="mb-6">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => navigate('/centers')}
              className="px-4 py-2 bg-muted text-foreground rounded border border-border"
            >
              {t('teams.manageCenters', 'Gestionar centers')}
            </button>
            <button
              onClick={() => navigate('/admin/players')}
              className="px-4 py-2 bg-muted text-foreground rounded border border-border"
            >
              {t('teams.managePlayers', 'Gestionar jugadores')}
            </button>
            <button
              onClick={() => navigate('/admin/coaches')}
              className="px-4 py-2 bg-muted text-foreground rounded border border-border"
            >
              Gestionar coaches
            </button>
            <button onClick={() => setOpenCreate(true)} className="px-4 py-2 bg-primary text-white rounded">
              {t('teams.createBtn', 'Crear equipo')}
            </button>
          </div>
          {openCreate && (
            <div className="mt-2 border border-gray-200 rounded bg-white p-6">
              <h3 className="font-semibold mb-4">{t('teams.new')}</h3>
              <select
                value={clubId}
                onChange={e => setClubId(e.target.value)}
                className="block mb-2 px-2 py-1 border rounded w-full"
              >
                <option value="">{t('teams.selectClub')}</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t('teams.namePlaceholder')}
                value={name}
                onChange={e => setName(e.target.value)}
                className="block mb-2 px-2 py-1 border rounded w-full"
              />
              <input
                type="text"
                placeholder={t('teams.seasonPlaceholder')}
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="block mb-2 px-2 py-1 border rounded w-full"
              />
              <div className="mt-4 flex gap-2">
                <button onClick={createTeam} disabled={creating} className="px-4 py-2 bg-primary text-white rounded">
                  {t('teams.createBtn')}
                </button>
                <button onClick={() => setOpenCreate(false)} className="px-4 py-2 bg-muted text-foreground rounded">
                  {t('common.back')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teams */}
      {teams.map(team => (
        <Card key={team.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{team.name}</p>
                  {team.season && (
                    <Badge variant="secondary" className="text-xs">
                      {team.season}
                    </Badge>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setExpandedTeamId(prev => (prev === team.id ? null : team.id))
                  if (expandedTeamId !== team.id && role === 'super_admin') {
                    loadTeamCoaches(team.id)
                  }
                }}
              >
                <ChevronRight
                  className={`transition-transform ${
                    expandedTeamId === team.id ? 'rotate-90' : ''
                  }`}
                />
              </button>
            </div>

            {expandedTeamId === team.id && (
              <div className="border-t pt-3 space-y-2">
                {/* Coaches (super_admin) - SIEMPRE ARRIBA */}
                {role === 'super_admin' && (
                  <div className="space-y-2 pb-2 border-b mb-2">
                    <p className="text-sm font-semibold">Coaches</p>

                    {(teamCoaches[team.id] ?? []).map(c => (
                      <div
                        key={c.coach_user_id}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted"
                      >
                        <span className="text-sm">
                          {c.users_profile?.full_name ?? '—'}
                        </span>

                        <button
                          className="text-xs text-destructive"
                          onClick={async () => {
                            await supabase
                              .from('team_coaches')
                              .delete()
                              .eq('team_id', team.id)
                              .eq('coach_user_id', c.coach_user_id)

                            loadTeamCoaches(team.id)
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-2 mt-2">
                      <select
                        value={selectedCoachId}
                        onChange={e => setSelectedCoachId(e.target.value)}
                        className="border rounded px-2 py-1 text-sm flex-1"
                      >
                        <option value="">Seleccionar coach</option>
                        {availableCoaches.map(c => (
                          <option key={c.user_id} value={c.user_id}>
                            {c.users_profile?.full_name || c.coach?.full_name || '—'}
                          </option>
                        ))}
                      </select>

                      <button
                        className="px-3 py-1 bg-primary text-white text-sm rounded"
                        disabled={!selectedCoachId}
                        onClick={async () => {
                          await supabase.from('team_coaches').insert({
                            team_id: team.id,
                            coach_user_id: selectedCoachId,
                          })
                          setSelectedCoachId('')
                          loadTeamCoaches(team.id)
                        }}
                      >
                        Asignar
                      </button>
                    </div>
                  </div>
                )}

                {/* Jugadores */}
                {team.players.map(player => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center p-2 rounded hover:bg-muted"
                  >
                    <div>
                      <p className="text-sm font-medium">{player.full_name}</p>
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
                      <ActivatePlayerModal
                        playerId={player.id}
                        onSuccess={loadTeams}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
