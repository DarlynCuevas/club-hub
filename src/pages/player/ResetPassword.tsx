import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Error as ErrorState } from '@/components/ui/error'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const { error: passError } = await supabase.auth.updateUser({
      password,
    })

    if (passError) {
      setError(passError.message)
      setLoading(false)
      return
    }

    // quitar flag temp_password
    await supabase.auth.updateUser({
      data: { temp_password: false },
    })
    
      // Refrescar sesión para que el contexto se actualice
      await supabase.auth.refreshSession();

    navigate('/player/dashboard', { replace: true })
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold text-center">
            Cambia tu contraseña
          </h1>

          {error && <ErrorState message={error} />}

          <Input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <Input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            Guardar contraseña
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
