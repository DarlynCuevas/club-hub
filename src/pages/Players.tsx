import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

export default function Players() {
  const { role, user } = useAuth()
  const { t } = useTranslation()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBirth, setNewBirth] = useState('')
  const [newClub, setNewClub] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (role !== 'parent') return
    const load = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, birth_date, club_id, user_id')
        .order('created_at', { ascending: true })
      if (error) setError('Failed to load players')
      setPlayers(data || [])
      setLoading(false)
    }
    load()
  }, [role])

  const createPlayer = async () => {
    if (!newName || !newClub) return
    setCreating(true)
    const { error } = await supabase
      .from('players')
      .insert({
        full_name: newName,
        birth_date: newBirth || null,
        club_id: newClub,
        // parent_user_id is set by RLS
      })
    if (error) {
      setError('Failed to create player')
      setCreating(false)
      return
    }
    setNewName('')
    setNewBirth('')
    setShowAdd(false)
    setCreating(false)
    // Reload
    const { data } = await supabase
      .from('players')
      .select('id, full_name, birth_date, club_id, user_id')
      .order('created_at', { ascending: true })
    setPlayers(data || [])
  }

  if (role !== 'parent') return null
  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-6 pb-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">My Children</h1>
        <button
          className="text-sm text-primary underline"
          onClick={() => setShowAdd(v => !v)}
        >
          + Add player
        </button>
      </div>

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
          <input
            type="text"
            placeholder="Club ID"
            value={newClub}
            onChange={e => setNewClub(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            required
            disabled={creating}
          />
          <button
            type="submit"
            className="bg-primary text-white rounded px-3 py-1 text-sm mt-1 disabled:opacity-50"
            disabled={creating || !newName || !newClub}
          >
            {creating ? 'Creating…' : 'Create player'}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {players.length === 0 ? (
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-2">You have not created any players yet</p>
          <button
            className="text-sm text-primary underline"
            onClick={() => setShowAdd(true)}
          >
            Create first player
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map(player => (
            <Card key={player.id}>
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="font-medium">{player.full_name} {player.birth_date && `(${new Date(player.birth_date).getFullYear()})`}</span>
                <span className="text-xs text-muted-foreground">Club: {player.club_id}</span>
                <span className="text-xs">
                  Status: {player.user_id ? 'Access active' : 'No access'}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
