
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Club = {
  id: string
  name: string
}

type Center = {
  id: string
  club_id: string
  name: string
  address?: string | null
}

export default function Centers() {
  const { role } = useAuth()
  const navigate = useNavigate()

  const [clubs, setClubs] = useState<Club[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)

  // formulario
  const [openCreate, setOpenCreate] = useState(false)
  const [clubId, setClubId] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [creating, setCreating] = useState(false)

  /* =======================
     GUARD: solo admin
  ======================= */
  useEffect(() => {
    if (role && role !== 'super_admin') {
      navigate('/home', { replace: true })
    }
  }, [role, navigate])

  /* =======================
     LOAD CLUBS + CENTERS
  ======================= */
  useEffect(() => {
    if (role !== 'super_admin') return

    const loadData = async () => {
      setLoading(true)

      const [{ data: clubsData }, { data: centersData }] = await Promise.all([
        supabase.from('clubs').select('id, name').order('name'),
        supabase.from('centers').select('id, club_id, name, address').order('name'),
      ])

      setClubs(clubsData ?? [])
      setCenters(centersData ?? [])
      setLoading(false)
    }

    loadData()
  }, [role])

  /* =======================
     CREATE CENTER
  ======================= */
  const createCenter = async () => {
    if (!clubId || !name) return

    setCreating(true)

    const { error } = await supabase
      .from('centers')
      .insert({
        club_id: clubId,
        name,
        address: address || null,
      })

    setCreating(false)

    if (error) {
      console.error('Error creating center', error)
      return
    }

    // reset form
    setClubId('')
    setName('')
    setAddress('')
    setOpenCreate(false)

    // reload centers
    const { data } = await supabase
      .from('centers')
      .select('id, club_id, name, address')
      .order('name')

    setCenters(data ?? [])
  }

  /* =======================
     UI
  ======================= */
  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto">Cargando centers...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Centers</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las instalaciones de los clubs
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          Crear center
        </Button>
      </div>

      {/* FORMULARIO */}
      {openCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nuevo center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Club</Label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={clubId}
                onChange={e => setClubId(e.target.value)}
              >
                <option value="">Selecciona un club</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nombre del center</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createCenter} disabled={creating}>
                Crear
              </Button>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LISTADO */}
      <div className="grid gap-4">
        {centers.length === 0 && <p className="text-muted-foreground">No hay centers creados.</p>}
        {centers.map(center => {
          const club = clubs.find(c => c.id === center.club_id)
          return (
            <Card key={center.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-base">
                      {center.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Club: {club?.name}
                    </p>
                    {center.address && (
                      <p className="text-sm mt-1">
                        📍 {center.address}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
