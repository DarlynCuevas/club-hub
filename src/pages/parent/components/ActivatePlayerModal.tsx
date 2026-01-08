import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { supabaseFunctions } from '@/lib/supabase-functions'

export default function ActivatePlayerModal({ playerId, onSuccess }: { playerId: string, onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activate = async () => {
    setLoading(true)
    setError(null)

    // Debug: log current session and token before invoking Edge Function
    const sessionResult = await supabase.auth.getSession();
    const res = await supabaseFunctions.functions.invoke(
      'activate-player',
      {
        body: {
          playerId,
          email,
          password,
        },
      }
    )
    console.log('EDGE RESPONSE:', res)

    const { data, error } = res
    if (error) {
      console.error(error)
      alert(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    onSuccess()
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Activar acceso
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activar acceso del jugador</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Email del jugador"
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
