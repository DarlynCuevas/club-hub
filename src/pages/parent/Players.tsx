import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import ActivatePlayerModal from './components/ActivatePlayerModal'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useClub } from '@/contexts/ClubContext'
import { useTranslation } from 'react-i18next'

export default function Players() {
  const { role, user, clubId } = useAuth()
  const { club } = useClub()
  const { t } = useTranslation()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBirth, setNewBirth] = useState('')
  // Eliminado: selección de equipo
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (role !== 'parent') return;
    // Cargar jugadores
    const loadPlayers = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, birth_date, club_id, user_id')
        .order('created_at', { ascending: true });
      if (error) setError('Failed to load players');
      setPlayers(data || []);
      setLoading(false);
    };
    loadPlayers();
  }, [role]);

  const createPlayer = async () => {
    if (!newName || !user?.id || !club?.id) {
      setError('Faltan datos requeridos.');
      console.error('Faltan datos requeridos', { newName, user, club });
      alert('Faltan datos requeridos. Revisa la consola para ver el valor de club.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('players')
        .insert({
          full_name: newName,
          birth_date: newBirth || null,
          parent_user_id: user.id,
          club_id: club.id,
        });
      if (error) {
        setError('Error al crear jugador: ' + (error.message || 'Desconocido'));
        console.error('Supabase error:', error);
        setCreating(false);
        return;
      }
      setNewName('');
      setNewBirth('');
      setShowAdd(false);
      setError('Jugador creado correctamente.');
      // Reload
      const { data } = await supabase
        .from('players')
        .select('id, full_name, birth_date, club_id, user_id')
        .order('created_at', { ascending: true });
      setPlayers(data || []);
    } catch (e) {
      setError('Error inesperado: ' + (e instanceof Error ? e.message : String(e)));
      console.error('Unexpected error:', e);
    } finally {
      setCreating(false);
    }
  };

  if (role !== 'parent') return null
  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-6 pb-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold">{t('parentPlayers.title')}</h1>
        <Button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm"
        >
          {t('parentPlayers.createBtn')}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t('parentPlayers.subtitle')}</p>

      {showAdd && (
        <form
          className="mb-6 flex flex-col gap-2"
          onSubmit={e => {
            e.preventDefault()
            createPlayer()
          }}
        >
          <input
            type="text"
            placeholder="Full name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            required
            disabled={creating}
          />
          <input
            type="date"
            placeholder="Birth date"
            value={newBirth}
            onChange={e => setNewBirth(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            disabled={creating}
          />
          {/* Eliminado: select de equipo */}
          <Button
            type="submit"
            disabled={creating || !newName}
            className="mt-1"
          >
            {creating ? t('common.loading', 'Creando…') : t('parentPlayers.createBtn')}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {players.length === 0 ? (
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-2">{t('parentPlayers.empty', 'You have not created any players yet')}</p>
          <Button
            onClick={() => setShowAdd(true)}
            className="text-sm"
          >
            {t('parentPlayers.createBtn')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {players.map(player => {
            // parent no tiene club ni equipo anidados, solo ids
            // Si quieres mostrar el nombre del club, deberías cargarlo aparte
            // Aquí solo mostramos el id como en el código actual
            return (
              <Card key={player.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="font-medium">{player.full_name}</div>
                  <div className="text-sm text-muted-foreground">{t('players.clubLabel')}: {club?.name ?? '—'}</div>
                  <div className="text-sm text-muted-foreground">{t('players.teamLabel')}: {t('players.noTeam')}</div>
                  <div className="text-xs mt-1">
                    {player.user_id ? (
                      <span className="text-green-600">{t('players.activeAccess')}</span>
                    ) : (
                      <ActivatePlayerModal playerId={player.id} onSuccess={() => window.location.reload()} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  )
}
