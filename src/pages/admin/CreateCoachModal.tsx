import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
type Club = {
  id: string;
  name: string;
};

type Team = {
  id: string;
  name: string;
  club_id: string;
};


interface CreateCoachModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateCoachModal({ open, onClose, onCreated }: CreateCoachModalProps) {

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [clubId, setClubId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Cargar clubs y teams
    const fetchData = async () => {
      // Cargar clubs y teams en paralelo
      const [{ data: clubsData }, { data: teamsData }] = await Promise.all([
        supabase.from('clubs').select('id, name').order('name'),
        supabase.from('teams').select('id, name, club_id').order('name'),
      ]);
      setClubs(clubsData ?? []);
      setTeams(teamsData ?? []);

      // Listar coaches del club
      if (clubId) {
        const { data: coachesData } = await supabase
          .from('coaches')
          .select(`id, full_name, birth_date, user_id, club:clubs (id, name), team_coaches:team_coaches (team:teams (id, name))`)
          .eq('club_id', clubId)
          .order('full_name');
        setCoaches(coachesData ?? []);

        // Listar asignaciones coach ↔ team
        const { data: assignmentsData } = await supabase
          .from('team_coaches')
          .select('team_id, coach_id');
        setAssignments(assignmentsData ?? []);
      }
    };
    if (open) fetchData();
  }, [open]);

  const handleCreate = async () => {
    // Validación de campos obligatorios
    if (!fullName) {
      toast({ title: "Falta el nombre", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    if (!clubId) {
      toast({ title: "Falta el club", description: "Debes seleccionar un club", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Insertar coach en la tabla coaches
    const { data, error } = await supabase.from('coaches').insert([
      {
        full_name: fullName,
        birth_date: birthDate || null,
        club_id: clubId,
        // user_id: ... // Si tienes el id del perfil de usuario, inclúyelo aquí
      }
    ]).select('id');

    const coachId = data && data[0]?.id;
    if (error || !coachId) {
      setLoading(false);
      toast({ title: "Error", description: error?.message || "No se pudo crear el coach", variant: "destructive" });
      return;
    }

    // Si se seleccionó un equipo, asignar al coach usando la función SQL
    if (teamId && coachId) {
      const { error: assignError } = await supabase.rpc('admin_assign_coach_to_team', {
        p_coach_id: coachId,
        p_team_id: teamId
      });
      if (assignError) {
        setLoading(false);
        toast({ title: "Error al asignar equipo", description: assignError.message, variant: "destructive" });
        return;
      }
    }

    setLoading(false);
    toast({ title: "Coach creado", description: `Se ha creado el coach ${fullName}` });
    // Limpiar formulario
    setFullName("");
    setBirthDate("");
    setClubId("");
    setTeamId("");
    onClose();
    // Recargar coaches
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Crear coach</DialogTitle>
        <div className="space-y-4 mt-2">
          <select
            className="w-full border rounded-md h-10 px-3"
            value={clubId}
            onChange={e => {
              setClubId(e.target.value);
              setTeamId("");
            }}
            disabled={loading}
          >
            <option value="">Selecciona club</option>
            {clubs.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Input
            placeholder="Nombre completo"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            disabled={loading}
          />
          <Input
            placeholder="Fecha de nacimiento"
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            disabled={loading}
          />
          <select
            className="w-full border rounded-md h-10 px-3"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            disabled={!clubId || loading}
          >
            <option value="">Sin equipo</option>
            {teams.filter(t => t.club_id === clubId).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onClose} variant="secondary" disabled={loading}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading || !fullName || !clubId}>
            {loading ? "Creando..." : "Crear coach"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
