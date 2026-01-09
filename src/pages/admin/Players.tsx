import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ActivatePlayerModal from '../parent/components/ActivatePlayerModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'



type Club = {
  id: string
  name: string
}

type Team = {
  id: string
  name: string
  club_id: string
}

type Player = {
  id: string
  full_name: string
  birth_date: string
  user_id: string | null
  club: {
    id: string
    name: string
  } | null
  team_players: {
    team: {
      id: string
      name: string
    } | null
  }[]
}


export default function PlayersAdmin() {
  // Estado global para asignar equipo
const [assigningPlayerId, setAssigningPlayerId] = useState<string | null>(null);
const [assigningTeamId, setAssigningTeamId] = useState<string>('');
const [assigning, setAssigning] = useState(false);
  const { role } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()


  const [clubs, setClubs] = useState<Club[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  // form
  const [openCreate, setOpenCreate] = useState(false)
  const [clubId, setClubId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [creating, setCreating] = useState(false)

 
  // Handler para asignar/cambiar equipo
  const handleAssignTeam = async (playerId: string, teamId: string) => {
    if (!playerId) return;
    const teamIdToSend = !teamId || teamId === '' ? null : teamId;
    setAssigningPlayerId(playerId);
    setAssigningTeamId(teamId);
    setAssigning(true);
    await supabase.rpc('admin_assign_player_to_team', {
      p_player_id: playerId,
      p_team_id: teamIdToSend,
    });
    setAssigning(false);
    setAssigningPlayerId(null);
    setAssigningTeamId('');
    // Recargar lista
    const { data } = await supabase
      .from('players')
      .select(`
            id,
            full_name,
            birth_date,
            user_id,
            club:clubs (
              id,
              name
            ),
            team_players:team_players!team_players_player_id_fkey (
              team:teams!team_players_team_id_fkey (
                id,
                name
              )
            )
          `)
      .order('full_name');
    const mappedPlayers = (data ?? []).map((p: any) => {
      let clubObj = p.club;
      if (Array.isArray(p.club)) {
        clubObj = p.club.length > 0 ? p.club[0] : null;
      }
      const teamPlayers = Array.isArray(p.team_players)
        ? p.team_players.map(tp => {
            let teamObj = tp.team;
            if (Array.isArray(tp.team)) {
              teamObj = tp.team.length > 0 ? tp.team[0] : null;
            }
            return { ...tp, team: teamObj };
          })
        : [];
      return {
        ...p,
        club: clubObj,
        team_players: teamPlayers,
      };
    });
    setPlayers(mappedPlayers as Player[]);
  };


  /* =======================
     GUARD
  ======================= */
  useEffect(() => {
    if (role && role !== 'super_admin') {
      navigate('/home', { replace: true })
    }
  }, [role, navigate])

  /* =======================
     LOAD DATA
  ======================= */
  useEffect(() => {
    
    if (role !== 'super_admin') return

    const loadData = async () => {
      setLoading(true)

      // Cargar clubs y teams para el formulario
      const [{ data: clubsData }, { data: teamsData }, { data: playersData, error: playersError }] = await Promise.all([
        supabase.from('clubs').select('id, name').order('name'),
        supabase.from('teams').select('id, name, club_id').order('name'),
        supabase
          .from('players')
          .select(`
            id,
            full_name,
            birth_date,
            user_id,
            club:clubs (
              id,
              name
            ),
            team_players:team_players!team_players_player_id_fkey (
              team:teams!team_players_team_id_fkey (
                id,
                name
              )
            )
          `)
          .order('full_name'),
      ])

      setClubs(clubsData ?? [])
      setTeams(teamsData ?? [])

      console.log('playersData', playersData)
      if (playersError) {
        console.error('Error al cargar jugadores:', playersError)
      }
      // Mapear club y team para asegurar que sean objetos, no arrays
      const mappedPlayers = (playersData ?? []).map((p: any) => {
        let clubObj = p.club;
        if (Array.isArray(p.club)) {
          clubObj = p.club.length > 0 ? p.club[0] : null;
        }
        const teamPlayers = Array.isArray(p.team_players)
          ? p.team_players.map(tp => {
              let teamObj = tp.team;
              if (Array.isArray(tp.team)) {
                teamObj = tp.team.length > 0 ? tp.team[0] : null;
              }
              return { ...tp, team: teamObj };
            })
          : [];
        return {
          ...p,
          club: clubObj,
          team_players: teamPlayers,
        };
      });
      setPlayers(mappedPlayers as Player[]);
      setLoading(false)
    }

    loadData()
  }, [role])

  /* =======================
     CREATE PLAYER
  ======================= */
  const createPlayer = async () => {
    console.log('createPlayer ejecutado', { clubId, fullName, birthDate })
    if (!clubId || !fullName || !birthDate) return

    setCreating(true)

    // Usar RPC para crear jugador con RLS
    const { data: player, error } = await supabase.rpc('admin_create_player', {
      p_full_name: fullName,
      p_birth_date: birthDate,
      p_club_id: clubId,
    })

    if (error || !player) {
      console.error(error)
      setCreating(false)
      return
    }



      // asignar a team (opcional)
      if (teamId) {
        // Validar que ambos IDs existen y no son undefined
        const teamIdUUID = String(teamId)
        if (!player || !teamIdUUID || player === 'undefined' || teamIdUUID === 'undefined') {
        } else {
          const { error: assignError } = await supabase.rpc(
            'admin_assign_player_to_team',
            {
              p_player_id: player,
              p_team_id: teamIdUUID,
            }
          )
          if (assignError) {
            console.error(assignError)
          }
        }
      }




    // reset campos
    setClubId('')
    setTeamId('')
    setFullName('')
    setBirthDate('')
    setCreating(false)

      // reload players
    const { data } = await supabase
      .from('players')
      .select(`
        id,
        full_name,
        birth_date,
        user_id,
        club:clubs (
          id,
          name
        ),
        team_players:team_players!team_players_player_id_fkey (
          team:teams!team_players_team_id_fkey (
            id,
            name
          )
        )
      `)
      .order('full_name')

    // Mapear club y team para asegurar que sean objetos, no arrays
    const mappedPlayers = (data ?? []).map((p: any) => {
      let clubObj = p.club;
      if (Array.isArray(p.club)) {
        clubObj = p.club.length > 0 ? p.club[0] : null;
      }
      const teamPlayers = Array.isArray(p.team_players)
        ? p.team_players.map(tp => {
            let teamObj = tp.team;
            if (Array.isArray(tp.team)) {
              teamObj = tp.team.length > 0 ? tp.team[0] : null;
            }
            return { ...tp, team: teamObj };
          })
        : [];
      return {
        ...p,
        club: clubObj,
        team_players: teamPlayers,
      };
    });
    setPlayers(mappedPlayers as Player[]);
  }

  /* =======================
     UI
  ======================= */
  if (loading) return <Spinner />




  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('players.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('players.subtitle')}
          </p>
        </div>

        <Button onClick={() => setOpenCreate(true)}>
          {t('players.createBtn')}
        </Button>
      </div>

      {/* CREATE FORM */}
      {openCreate && (
        <Card>
          <CardHeader>
            <CardTitle>{t('players.new')}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <Label>{t('players.club')}</Label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={clubId}
                onChange={e => {
                  setClubId(e.target.value)
                  setTeamId('')
                }}
              >
                <option value="">{t('players.selectClub')}</option>
                {clubs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>{t('players.namePlaceholder')}</Label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>

            <div>
              <Label>{t('players.birthDate')}</Label>
              <Input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
              />
            </div>

            <div>
              <Label>{t('players.teamOptional')}</Label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                disabled={!clubId}
              >
                <option value="">{t('players.noTeam')}</option>
                {teams
                  .filter(t => t.club_id === clubId)
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={createPlayer} disabled={creating}>
                {t('players.createBtn')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpenCreate(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LISTA DE JUGADORES */}
      <div className="grid gap-3">
        {players.map(p => {
          const teamIdActual = p.team_players?.[0]?.team?.id || '';
          const teamNameActual = p.team_players?.[0]?.team?.name || t('players.noTeam');
          const isEditing = assigningPlayerId === p.id;
          return (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-1">
                <div className="font-medium">{p.full_name}</div>
                <div className="text-sm text-muted-foreground">{t('players.clubLabel')}: {p.club?.name ?? '—'}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {t('players.teamLabel')}: 
                  {!isEditing ? (
                    <>
                      <span>{teamNameActual}</span>
                      <Button size="sm" variant="outline" onClick={() => {
                        setAssigningPlayerId(p.id);
                        setAssigningTeamId(teamIdActual);
                      }}>
                        {t('players.changeTeam', 'Cambiar equipo')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <select
                        className="border rounded px-2 py-1 text-sm mr-2"
                        value={assigningTeamId}
                        onChange={e => setAssigningTeamId(e.target.value)}
                        disabled={assigning}
                      >
                        <option value="">{t('players.noTeam', 'Sin asignar')}</option>
                        {teams
                          .filter(t => t.club_id === p.club?.id)
                          .map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={assigning || assigningTeamId === teamIdActual}
                        onClick={() => handleAssignTeam(p.id, assigningTeamId)}
                      >
                        {assigning ? t('common.loading', 'Asignando…') : t('common.save', 'Guardar')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setAssigningPlayerId(null); setAssigningTeamId(''); }}
                        disabled={assigning}
                      >
                        {t('common.cancel', 'Cancelar')}
                      </Button>
                    </>
                  )}
                </div>
                <div className="text-xs mt-1">
                  {p.user_id ? (
                    <span className="text-green-600">{t('players.activeAccess')}</span>
                  ) : (
                    <ActivatePlayerModal playerId={p.id} onSuccess={() => window.location.reload()} />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  )
}
