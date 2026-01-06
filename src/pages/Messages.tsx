import { Spinner } from '@/components/ui/spinner'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
export default function Messages() {
  const { role, clubId } = useAuth()
  const { t } = useTranslation()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [creating, setCreating] = useState(false)

// 🔹 Load messages
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('messages')
        .select('id, title, body, created_at')
        .order('created_at', { ascending: false })

      if (error) setError('messages.failedLoad')
      setMessages(data || [])
      setLoading(false)
    }

    load()
  }, [])

  // 🔹 Create message (coach / admin)
  const handleCreateMessage = async () => {
    if (!clubId) return
    if (role !== 'coach' && role !== 'club_admin') return
    if (!title || !body) return

    setCreating(true)

    const { error } = await supabase.from('messages').insert({
      club_id: clubId,
      team_id: null,
      title,
      body,
    })

    setCreating(false)

    if (!error) {
      setTitle('')
      setBody('')
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
      {(role === 'coach' || role === 'club_admin') && (
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
      {messages.map((m) => (
        <article key={m.id} className="border-b pb-4">
          <h3 className="font-semibold">{m.title}</h3>
          <p className="text-muted-foreground">{m.body}</p>
          <span className="text-xs text-muted-foreground">
            {new Date(m.created_at).toLocaleString()}
          </span>
        </article>
      ))}
    </div>
  )
}
