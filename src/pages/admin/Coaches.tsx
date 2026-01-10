import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import CreateCoachModal from './CreateCoachModal';
import ActivatePlayerModal from '@/components/shared/ActivatePlayerModal';


type Club = { id: string; name: string };
type Team = { id: string; name: string; club_id: string };
type TeamCoach = { team?: Team };
type Coach = {
  id: string;
  full_name: string;
  birth_date?: string;
  user_id?: string;
  club?: Club;
  team_coaches?: TeamCoach[];
};

export default function Coaches() {
  const { user, role } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [assigningCoachId, setAssigningCoachId] = useState<string | null>(null);
  const [assigningTeamId, setAssigningTeamId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Centralized data loading
  const loadCoachesAndTeams = useCallback(async (clubId: string) => {
    setLoading(true);
    const [{ data: coachesData }, { data: teamsData }] = await Promise.all([
      supabase
        .from('coaches')
        .select('id, full_name, birth_date, user_id, club:clubs (id, name), team_coaches:team_coaches (team:teams (id, name))')
        .eq('club_id', clubId)
        .order('full_name'),
      supabase
        .from('teams')
        .select('id, name, club_id')
        .eq('club_id', clubId)
    ]);
    // Corrige club y team para que sean objetos, no arrays
    const mappedCoaches: Coach[] = (coachesData ?? []).map((coach: any) => ({
      ...coach,
      club: Array.isArray(coach.club) ? coach.club[0] : coach.club,
      team_coaches: Array.isArray(coach.team_coaches)
        ? coach.team_coaches.map((tc: any) => ({
            ...tc,
            team: Array.isArray(tc.team) ? tc.team[0] : tc.team
          }))
        : coach.team_coaches
    }));
    setCoaches(mappedCoaches);
    setTeams(teamsData ?? []);
    setLoading(false);
  }, []);

  // Get clubId for super_admin
  useEffect(() => {
    if (!user?.id || role !== 'super_admin') return;
    supabase
      .from('user_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single()
      .then(({ data }) => {
        if (data?.club_id) setClubId(data.club_id);
      });
  }, [user?.id, role]);

  useEffect(() => {
    if (!clubId) return;
    loadCoachesAndTeams(clubId);
  }, [clubId, loadCoachesAndTeams]);

  // Assign coach to team
  const handleAssignTeam = async (coachId: string, teamId: string) => {
    if (!coachId) return;
    setAssigningCoachId(coachId);
    setAssigningTeamId(teamId);
    setAssigning(true);
    let error = null;
    if (teamId) {
      // Asignar coach a equipo
      const res = await supabase.rpc('admin_assign_coach_to_team', {
        p_coach_id: coachId,
        p_team_id: teamId
      });
      error = res.error;
    } else {
      // Desasignar coach de todos los equipos
      const res = await supabase.from('team_coaches').delete().eq('coach_id', coachId);
      error = res.error;
    }
    setAssigning(false);
    setAssigningCoachId(null);
    setAssigningTeamId('');
    if (clubId) loadCoachesAndTeams(clubId);
    if (error) {
      // Puedes mostrar un toast de error aquí si tienes sistema de notificaciones
      console.error('Error asignando coach a equipo:', error.message);
    }
  };

  // Refresh coaches after create or activation
  const refreshCoaches = useCallback(() => {
    if (clubId) loadCoachesAndTeams(clubId);
  }, [clubId, loadCoachesAndTeams]);

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Coaches</h1>
          <p className="text-sm text-muted-foreground">Gestiona los entrenadores del club</p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          + Crear coach
        </Button>
      </div>

      {/* LISTA DE COACHES */}
      <div className="grid gap-3">
        {coaches.length === 0 ? (
          <div className="text-center py-10">
            <p className="mb-2">No hay entrenadores creados todavía</p>
          </div>
        ) : (
          coaches.map(coach => {
            const teamIdActual = coach.team_coaches?.[0]?.team?.id || '';
            const teamNameActual = coach.team_coaches?.[0]?.team?.name || 'Sin asignar';
            const isEditing = assigningCoachId === coach.id;
            return (
              <Card key={coach.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="font-medium">{coach.full_name}</div>
                  <div className="text-sm text-muted-foreground">Club: {coach.club?.name ?? '—'}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    Equipo:
                    {!isEditing ? (
                      <>
                        <span>{teamNameActual}</span>
                        <Button size="sm" variant="outline" onClick={() => {
                          setAssigningCoachId(coach.id);
                          setAssigningTeamId(teamIdActual);
                        }}>
                          Cambiar equipo
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
                          <option value="">Sin asignar</option>
                          {(coach.club?.id
                            ? teams.filter(t => t.club_id === coach.club.id)
                            : teams
                          ).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          disabled={assigning || assigningTeamId === teamIdActual}
                          onClick={() => handleAssignTeam(coach.id, assigningTeamId)}
                        >
                          {assigning ? 'Asignando…' : 'Guardar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setAssigningCoachId(null); setAssigningTeamId(''); }}
                          disabled={assigning}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="text-xs mt-1">
                    {coach.user_id ? (
                      <span className="text-green-600">Acceso activo</span>
                    ) : (
                      <ActivatePlayerModal playerId={coach.id} role="coach" onSuccess={refreshCoaches} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <CreateCoachModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={refreshCoaches} />
    </div>
  );
}
