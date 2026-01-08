import { Spinner } from '@/components/ui/spinner'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'

export default function Messages() {
  const { role, clubId, user } = useAuth()
  const { t } = useTranslation()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [creating, setCreating] = useState(false)
  const [teamId, setTeamId] = useState<string>('')
  const [teams, setTeams] = useState<any[]>([])
  const [userTeamIds, setUserTeamIds] = useState<string[]>([])

  // Cargar equipos para el selector
  useEffect(() => {
    const loadTeams = async () => {
      if (!clubId) return;
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .eq('club_id', clubId)
      const teamsWithGlobal = [{ id: null, name: 'Global (todo el club)' }, ...(data || [])]
      setTeams(teamsWithGlobal)
      setLoading(false)
    }
    if (role === 'coach' || role === 'super_admin') loadTeams()
    else setLoading(false)
  }, [clubId, role])

  // Cargar equipos del usuario (userTeamIds)
  useEffect(() => {
    const fetchUserTeams = async () => {
      if (!user) return setUserTeamIds([])
      if (role === 'coach' || role === 'super_admin') {
        // Coach y admin pueden ver todos los equipos
        const { data } = await supabase
          .from('teams')
          .select('id')
          .eq('club_id', clubId)
        setUserTeamIds((data || []).map((tm: any) => tm.id))
      } else {
        // Otros roles: no hay relación directa
        setUserTeamIds([])
      }
    }
    fetchUserTeams()
  }, [user, role, clubId])

  // Cargar mensajes filtrados según el rol y equipos
  useEffect(() => {
    const loadMessages = async () => {
      if (!user) return;
      let query = supabase
        .from('messages')
        .select(`
          id,
          title,
          body,
          created_at,
          users_profile (
            full_name,
            role:user_roles(role)
          )
        `)
        .order('created_at', { ascending: false })
      if (role === 'super_admin') {
        // Admin ve todo
      } else {
        query = query.or(`team_id.is.null,team_id.in.(${userTeamIds.join(',')})`)
      }
      const { data } = await query
      setMessages(data || [])
      setLoading(false)
    }
    loadMessages()
  }, [user, role, userTeamIds])

  // 🔹 Create message (coach / admin)
  const handleCreateMessage = async () => {
    if (!clubId) return
    if (role !== 'coach' && role !== 'super_admin') return
    if (!title || !body) return

    setCreating(true)

    const { error } = await supabase.from('messages').insert({
      club_id: clubId,
      team_id: teamId || null,
      title,
      body,
      created_by: user.id,
    })

    setCreating(false)

    if (!error) {
      setTitle('')
      setBody('')
      setTeamId('')
      // reload messages
      const { data } = await supabase
        .from('messages')
        .select('id, title, body, created_at')
        .order('created_at', { ascending: false })
      setMessages(data || [])
    }
  }

  if (loading) return <Spinner />
  if (error) return <div>{t(error)}</div>

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('messages.title')}</h1>
      </div>

      {/* 🔹 Create message */}
      {(role === 'coach' || role === 'super_admin') && (
        <div className="space-y-2 border rounded-lg p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('messages.form.title')}
            className="w-full border px-3 py-2 rounded-md"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('messages.form.body')}
            className="w-full border px-3 py-2 rounded-md"
          />
          <select
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            className="w-full border px-3 py-2 rounded-md"
          >
            {teams.map(team => (
              <option key={team.id ?? 'global'} value={team.id ?? ''}>{team.name}</option>
            ))}
          </select>
          <button
            onClick={handleCreateMessage}
            disabled={creating}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
          >
            {creating ? t('messages.form.publishing') : t('messages.form.publish')}
          </button>
        </div>
      )}

      {/* 🔹 Empty state */}
      {messages.length === 0 && (
        <div className="text-center text-muted-foreground py-10">
          {t('messages.empty')}
        </div>
      )}

      {/* 🔹 Messages list */}
      {messages.map((m) => {
        const roleName = Array.isArray(m.users_profile?.role)
          ? m.users_profile.role[0]?.role || ''
          : typeof m.users_profile?.role === 'string'
            ? m.users_profile.role
            : '';
        return (
          <article key={m.id} className="border-b pb-4">
            <h3 className="font-semibold">{m.title}</h3>
            <p className="text-xs text-muted-foreground mb-2">
              {m.users_profile?.full_name}
              {roleName && (
                <> ({t(`roles.${roleName}`)})</>
              )}
              {' · '}
              {format(new Date(m.created_at), 'dd/MM HH:mm')}
            </p>
            <p className="text-muted-foreground">{m.body}</p>
          </article>
        )
      })}
    </div>
  )
}
