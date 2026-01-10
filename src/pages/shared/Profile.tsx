import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import {
  User,
  LogOut,
  Settings,
  HelpCircle,
  Shield,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { UserRole } from '@/types'
import LanguageSwitcher from '@/components/ui/language'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState as useReactState } from 'react'

export default function Profile() {
  const { t } = useTranslation()
  const { user, role, setRole, logout, clubId } = useAuth()
  const navigate = useNavigate()
  const [club, setClub] = useState<{ name: string, logo_url?: string, primary_color?: string } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editLogo, setEditLogo] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchClub() {
      if (!clubId) return

        const { data, error } = await supabase
          .from('clubs')
          .select('name, logo_url, primary_color')
          .eq('id', clubId)
          .maybeSingle()
        if (!error && data) setClub(data)
        if (data) {
          setEditName(data.name || '')
          setEditLogo(data.logo_url || '')
          setEditColor(data.primary_color || '')
        }
    }

    fetchClub()
  }, [clubId])

    const handleEditClub = async () => {
      setSaving(true)
      const { error } = await supabase
        .from('clubs')
        .update({ name: editName, logo_url: editLogo, primary_color: editColor })
        .eq('id', clubId)
      setSaving(false)
      if (!error) {
        setClub({ ...club, name: editName, logo_url: editLogo, primary_color: editColor })
        setEditOpen(false)
      }
    }
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Role switcher for demo purposes
  const roles: UserRole[] = ['parent', 'coach', 'player']
  const canManageEvents =
    role === 'super_admin' || role === 'coach'

  const [accountOpen, setAccountOpen] = useReactState(false)
  const [manageOpen, setManageOpen] = useReactState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [teams, setTeams] = useState<any[]>([])

  // Load events for CreateEventModal
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const loadEvents = async () => {
    setLoadingEvents(true);
    setEventsError(null);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true });
    if (error) setEventsError('Error al cargar eventos');
    setEvents(data || []);
    setLoadingEvents(false);
  };
  const menuItems = [
    ...(canManageEvents
      ? [
        {
          icon: Calendar,
          label: 'Gestionar eventos',
          action: () => setManageOpen(true),
        },
      ]
      : []),
    {
      icon: Settings,
      label: 'Account Settings',
      action: () => setAccountOpen((v) => !v),
    },
    { icon: Shield, label: 'Privacy', action: () => { } },
    { icon: HelpCircle, label: 'Help & Support', action: () => { } },
  ];

  useEffect(() => {
    async function fetchTeams() {
      if (!clubId) return;
      const { data } = await supabase.from('teams').select('id, name').eq('club_id', clubId);
      setTeams(data || []);
    }
    if (role === 'super_admin' || role === 'coach') fetchTeams();
  }, [clubId, role]);

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Profile Header */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {club?.logo_url ? (
                  <img src={club.logo_url} alt="Club logo" className="w-12 h-12 object-contain" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {club?.name || ''}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Modal Editar Club */}
        {role === 'super_admin' && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar club</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre del club</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logo (imagen)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full border rounded px-3 py-2"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file || !clubId) return;
                      const filePath = `logos/${clubId}.png`;
                      const { error } = await supabase.storage.from('club-bears').upload(filePath, file, { upsert: true, contentType: file.type });
                      if (!error) {
                        const { data } = supabase.storage.from('club-bears').getPublicUrl(filePath);
                        setEditLogo(`${data.publicUrl}?t=${Date.now()}`);
                      }
                    }}
                  />
                  {editLogo && (
                    <img src={editLogo} alt="Preview" className="mt-2 w-16 h-16 object-contain" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Color principal</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    placeholder="#123456"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleEditClub} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      {/* Role Switcher (Demo) */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t('profile.demoSwitchRole')}
        </h2>
        <Card className="shadow-card">
          <CardContent className="p-2">
            <div className="flex gap-2">
              {roles.map((r) => (
                <Button
                  key={r}
                  variant={role === r ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRole(r)}
                  className="flex-1 capitalize"
                >
                  {t(`roles.${r}`)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Language */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('profile.language')}
          </h2>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card className="shadow-card">
        <CardContent className="p-0 divide-y divide-border">
          {menuItems.map((item) => (
            <div key={item.label}>
              <button
                onClick={item.action}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 font-medium text-foreground">
                  {item.label}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              {/* Account Settings dropdown */}
              {item.label === 'Account Settings' && accountOpen && role === 'super_admin' && (
                <div className="bg-muted/10 p-4">
                  <Button variant="outline" onClick={() => setEditOpen(true)}>
                    Editar club
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5 mr-2" />
        {t('profile.signOut')}
      </Button>

      {/* App Version */}
      <p className="text-center text-xs text-muted-foreground">
        {t('profile.version', { version: '1.0.0' })}
      </p>

      {/* NUEVO: Modal para crear evento */}
      <CreateEventModal open={createOpen} onOpenChange={setCreateOpen} teams={teams} onEventCreated={loadEvents} />
      {/* NUEVO: Gestión de eventos (modal y listado) */}
      <ManageEventsModal open={manageOpen} onOpenChange={setManageOpen} teams={teams} />
    </div>
  )
}

// NUEVO: Modal para crear evento
function CreateEventModal({ open, onOpenChange, teams, onEventCreated }) {
  const [scope, setScope] = useState<'global' | 'team'>('global');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [eventType, setEventType] = useState('training');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clubId } = useAuth();

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    if (!clubId) {
      setError('No se ha encontrado el club. Reintenta o contacta con soporte.');
      setSaving(false);
      return;
    }
    if (scope === 'team' && selectedTeams.length === 0) {
      setError('Debes seleccionar al menos un equipo');
      setSaving(false);
      return;
    }
    try {
      // Obtener el access_token de la sesión actual
      const { data: sessionData } = await supabase.auth.getSession();
      const access_token = sessionData?.session?.access_token;
      if (!access_token) {
        setError('No hay sesión activa. Por favor, vuelve a iniciar sesión.');
        setSaving(false);
        return;
      }
      const response = await fetch('https://jezehgemafbbplfajjoo.supabase.co/functions/v1/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          title,
          start_time: start,
          end_time: end,
          event_type: eventType,
          scope,
          club_id: clubId,
          team_ids: scope === 'team' ? selectedTeams : undefined,
        }),
      });
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { raw: text };
      }
      if (!response.ok || result.error) {
        setError(result.error || 'Error al crear el evento');
      } else {
        onEventCreated?.();
        onOpenChange(false);
      }
    } catch (e) {
      setError('Error inesperado al crear el evento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Paso 1: Selector de alcance */}
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de evento</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" checked={scope === 'global'} onChange={() => setScope('global')} />
                Evento del club
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={scope === 'team'} onChange={() => setScope('team')} />
                Evento de equipo
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {scope === 'global'
                ? 'Visible para todos los jugadores y padres'
                : 'Visible solo para los equipos seleccionados'}
            </p>
          </div>
          {/* Paso 2: Formulario dinámico */}
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input className="w-full border rounded px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Fecha y hora inicio</label>
              <input type="datetime-local" className="w-full border rounded px-3 py-2" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Fecha y hora fin</label>
              <input type="datetime-local" className="w-full border rounded px-3 py-2" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select className="w-full border rounded px-3 py-2" value={eventType} onChange={e => setEventType(e.target.value)}>
              <option value="training">Entrenamiento</option>
              <option value="match">Partido</option>
              <option value="meeting">Reunión</option>
              <option value="other">Otro</option>
            </select>
          </div>
          {scope === 'team' && (
            <div>
              <label className="block text-sm font-medium mb-1">Equipos</label>
              <select
                multiple
                className="w-full border rounded px-3 py-2"
                value={selectedTeams}
                onChange={e => setSelectedTeams(Array.from(e.target.selectedOptions, o => o.value))}
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Selecciona uno o más equipos</p>
            </div>
          )}
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear evento'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// NUEVO: Gestión de eventos (modal y listado)
function ManageEventsModal({ open, onOpenChange, teams }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true });
    if (error) setError('Error al cargar eventos');
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadEvents();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestión de eventos</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end mb-2">
          <Button onClick={() => setCreateOpen(true)}>+ Crear evento</Button>
        </div>
        {loading ? (
          <p>Cargando eventos...</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <div className="space-y-2">
            {events.map(ev => (
              <div key={ev.id} className="border rounded p-2 flex items-center gap-2">
                <span className="font-medium">{ev.title}</span>
                <Badge variant="secondary" className="ml-2">
                  {ev.scope === 'global' ? 'Club' : 'Equipo'}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(ev.start_time).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
        <CreateEventModal open={createOpen} onOpenChange={setCreateOpen} teams={teams} onEventCreated={loadEvents} />
      </DialogContent>
    </Dialog>
  );
}
