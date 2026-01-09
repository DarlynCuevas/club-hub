import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import CreateCoachModal from './CreateCoachModal'; // Se implementará después
// import AssignCoachTeamSelect from './AssignCoachTeamSelect'; // Se implementará después

export default function Coaches() {

  const { user, role } = useAuth();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  // Obtener clubId del super_admin desde user_roles
  useEffect(() => {
    if (!user?.id || role !== 'super_admin') return;
    supabase
      .from('user_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single()
      .then(({ data }) => setClubId(data?.club_id ?? null));
  }, [user?.id, role]);

  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    // 1️⃣ Listar coaches del club
    supabase
      .from('user_roles')
      .select(`user_id, users_profile ( full_name, email )`)
      .eq('role', 'coach')
      .eq('club_id', clubId)
      .then(({ data }) => setCoaches(data ?? []));
    // 2️⃣ Listar equipos
    supabase
      .from('teams')
      .select('id, name')
      .eq('club_id', clubId)
      .then(({ data }) => setTeams(data ?? []));
    // 3️⃣ Listar asignaciones coach ↔ team
    supabase
      .from('team_coaches')
      .select('team_id, coach_user_id')
      .then(({ data }) => setAssignments(data ?? []));
    setLoading(false);
  }, [clubId]);

  if (loading) return <Spinner />;

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      <h1 className="text-2xl font-semibold">Coaches</h1>
      <p className="text-muted-foreground mb-4">Gestiona los entrenadores del club</p>
      <Button onClick={() => setOpenCreate(true)} className="mb-4">+ Crear coach</Button>
      <div className="space-y-4">
        {coaches.length === 0 ? (
          <div className="text-center py-10">
            <p className="mb-2">No hay entrenadores creados todavía</p>
            <Button disabled>Crear coach (próximamente)</Button>
          </div>
        ) : (
          coaches.map((coach) => (
            <Card key={coach.user_id}>
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {/* Avatar/Icono */}
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-lg">
                    {coach.users_profile?.full_name?.[0] || 'C'}
                  </div>
                  <div>
                    <div className="font-semibold">{coach.users_profile?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{coach.users_profile?.email}</div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Badge variant="secondary">Coach</Badge>
                    {/* Estado de acceso y equipos asignados se implementarán */}
                  </div>
                </div>
                {/* Acciones y equipos asignados se implementarán */}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <CreateCoachModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={() => {
        // Refrescar coaches después de crear uno nuevo
        if (clubId) {
          supabase
            .from('user_roles')
            .select(`user_id, users_profile ( full_name, email )`)
            .eq('role', 'coach')
            .eq('club_id', clubId)
            .then(({ data }) => setCoaches(data ?? []));
        }
      }} />
    </div>
  );
}
