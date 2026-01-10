import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { supabaseFunctions } from '@/lib/supabase-functions'

export default function ActivatePlayerModal({ playerId, onSuccess, role = 'player' }: { playerId: string, onSuccess: () => void, role?: 'player' | 'coach' }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  // Obtener el nombre del coach/jugador según el role
  useEffect(() => {
    if (!playerId) return;
    const table = role === 'coach' ? 'coaches' : 'players';
    supabase
      .from(table)
      .select('full_name')
      .eq('id', playerId)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [playerId, role]);

  const activate = async () => {
    setLoading(true)
    setError(null)

    // Obtener el access_token de la sesión actual
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const access_token = sessionData?.session?.access_token;

    console.log('Access token:', access_token);

    if (!access_token) {
      setError('No hay sesión activa. Por favor, vuelve a iniciar sesión.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://jezehgemafbbplfajjoo.supabase.co/functions/v1/activate-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          playerId,
          email,
          password,
          full_name: fullName,
          role,
        }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { raw: text };
      }
      console.log('Edge Function response:', response.status, result);
      if (!response.ok) {
        setError(result.error || 'Error desconocido');
        setLoading(false);
        return;
      }

      setLoading(false);
      setOpen(false);
      onSuccess();
    } catch (err) {
      setError('Error de red o inesperado');
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Activar acceso
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activar acceso {role === 'coach' ? 'del coach' : 'del jugador'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder={role === 'coach' ? 'Email del coach' : 'Email del jugador'}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Contraseña inicial"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button
              onClick={activate}
              disabled={loading || !email || !password}
              className="w-full"
            >
              {loading ? 'Activando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
