import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { t } from 'i18next'
import { toast } from 'sonner'

type EventDetail = {
  id: string
  title: string
  club_id: string
  start_time: string
  end_time: string
  event_type: string
  cancelled?: boolean
  teams: { name: string }[]
}

export type AttendanceRow = {
  id: string
  status: 'present' | 'absent' | 'unknown'
  players: {
    id: string
    full_name: string
  }[]
}

export default function EventDetail() {
  /* -------------------- HOOKS (SIEMPRE ARRIBA) -------------------- */
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)

  const [savingId, setSavingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState<'training' | 'match' | 'meeting' | 'other'>('training')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')

  const canEditAttendance = role === 'coach' || role === 'super_admin'
  const canEditEvent = role === 'coach' || role === 'super_admin'

  /* -------------------- EFFECTS -------------------- */

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_time,
          end_time,
          event_type,
          cancelled,
          club_id,
          teams ( name )
        `)
        .eq('id', eventId)
        .single()

      if (!error) setEvent(data)
      setLoading(false)

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          id,
          status,
          players (
            id,
            full_name
          )
        `)
        .eq('event_id', eventId)

      setAttendance(
        (attendanceData || []).map((row: any) => ({
          ...row,
          players: Array.isArray(row.players)
            ? row.players
            : row.players
            ? [row.players]
            : [],
        }))
      )
    }

    load()
  }, [eventId])

  useEffect(() => {
    if (!isEditing || !event) return

    const start = new Date(event.start_time)
    const end = new Date(event.end_time)

    setEditTitle(event.title)
    setEditType(event.event_type as any)
    setEditDate(start.toISOString().slice(0, 10))
    setEditStartTime(start.toISOString().slice(11, 16))
    setEditEndTime(end.toISOString().slice(11, 16))
  }, [isEditing, event])

  /* -------------------- ACTIONS -------------------- */

  const updateStatus = async (attendanceId: string, status: 'present' | 'absent') => {
    setSavingId(attendanceId)
    setErrorId(null)

    const { error } = await supabase
      .from('attendance')
      .update({ status })
      .eq('id', attendanceId)

    if (error) {
      setErrorId(attendanceId)
      setSavingId(null)
      toast.error('Failed to update attendance')
      return
    }

    setAttendance(prev =>
      prev.map(a => (a.id === attendanceId ? { ...a, status } : a))
    )

    setSavingId(null)
    toast.success('Attendance updated')
  }

  const saveEventChanges = async () => {
    if (!editTitle || !editDate || !editStartTime || !editEndTime) return

    setSavingEvent(true)

    const start = new Date(`${editDate}T${editStartTime}`).toISOString()
    const end = new Date(`${editDate}T${editEndTime}`).toISOString()

    const { error } = await supabase
      .from('events')
      .update({
        title: editTitle,
        event_type: editType,
        start_time: start,
        end_time: end,
      })
      .eq('id', event?.id)

    setSavingEvent(false)

    if (error) {
      toast.error('Failed to update event')
      return
    }

    setEvent(prev =>
      prev ? { ...prev, title: editTitle, event_type: editType, start_time: start, end_time: end } : prev
    )

    setIsEditing(false)
    toast.success('Event updated')
  }

  const deleteEvent = async () => {
    if (!event) return

    setDeleting(true)

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id)

    setDeleting(false)

    if (error) {
      toast.error('Failed to delete event')
      return
    }

    toast.success('Event deleted')
    navigate(-1)
  }

  const cancelEvent = async () => {
    if (!event) return
    const { error } = await supabase
      .from('events')
      .update({ cancelled: true })
      .eq('id', event.id)

    if (error) {
      toast.error('Failed to cancel event')
      return
    }

    setEvent(prev => prev ? { ...prev, cancelled: true } : prev)
    toast.success('Event cancelled')

    // Notificación automática
    await supabase.from('messages').insert({
      club_id: event.club_id,
      title: 'Event cancelled',
      body: `${event.title} has been cancelled.`,
    })
  }

  /* -------------------- RENDER GUARDS -------------------- */

  if (loading) return <Spinner />
  if (!event) return <div className="p-4">Event not found</div>

  /* -------------------- JSX -------------------- */
  return (
    
    <div className="px-4 pt-6 pb-6 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-muted-foreground underline"
      >
        ← Back to calendar
      </button>
      {/* === EVENT CARD === */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          {isEditing ? (
            <>
              <input
                className="w-full border rounded px-3 py-2"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Event title"
              />

              <select
                className="w-full border rounded px-3 py-2"
                value={editType}
                onChange={e => setEditType(e.target.value as any)}
              >
                <option value="training">Training</option>
                <option value="match">Match</option>
                <option value="meeting">Meeting</option>
                <option value="other">Other</option>
              </select>

              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
              />

              <div className="flex gap-2">
                <input
                  type="time"
                  className="w-full border rounded px-3 py-2"
                  value={editStartTime}
                  onChange={e => setEditStartTime(e.target.value)}
                />
                <input
                  type="time"
                  className="w-full border rounded px-3 py-2"
                  value={editEndTime}
                  onChange={e => setEditEndTime(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveEventChanges}
                  disabled={savingEvent}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded"
                >
                  {savingEvent ? 'Saving…' : 'Save'}
                </button>

                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-muted rounded"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <Badge className="capitalize">{event.event_type}</Badge>
              {event.cancelled && (
                <Badge variant="destructive">Cancelled</Badge>
              )}

              <h1 className="text-xl font-semibold">{event.title}</h1>

              {canEditEvent && (
                <div className="flex gap-4">
                  <button onClick={() => setIsEditing(true)} className="text-sm text-primary underline">
                    Edit event
                  </button>
                  <button onClick={() => setConfirmDelete(true)} className="text-sm text-destructive underline">
                    Delete event
                  </button>
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="text-sm text-destructive underline"
                  >
                    Cancel event
                  </button>
                </div>
              )}

              {confirmDelete && (
                <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm mb-2">Are you sure you want to delete this event?</p>
                  <div className="flex gap-2">
                    <button
                      disabled={deleting}
                      onClick={deleteEvent}
                      className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 bg-muted rounded">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {confirmCancel && (
                <div className="mt-3 rounded-md border border-muted/30 bg-muted/5 p-3">
                  <p className="text-sm mb-2">Are you sure you want to cancel this event?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEvent}
                      className="px-3 py-1.5 bg-muted text-muted-foreground rounded"
                    >
                      Yes, cancel
                    </button>
                    <button onClick={() => setConfirmCancel(false)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded">
                      Keep event
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {format(new Date(event.start_time), 'EEEE, MMM d · HH:mm')} –{' '}
                {format(new Date(event.end_time), 'HH:mm')}
              </div>

              {event.teams.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('eventDetail.teams', 'Team: {{teams}}', {
                    teams: event.teams.map(t => t.name).join(', ')
                  })}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase">
            {t('eventDetail.attendance')}
          </h2>
          {attendance.map(a => (
            <div key={a.id} className="flex items-center justify-between">
              <span>{a.players[0]?.full_name}</span>
              <div className="flex items-center gap-2">
                {canEditAttendance ? (
                  <>
                    <button
                      disabled={savingId === a.id}
                      onClick={() => updateStatus(a.id, 'present')}
                      className={`px-2 py-1 text-xs rounded transition
                  ${a.status === 'present'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'}
                  ${savingId === a.id ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                    >
                      Present
                    </button>
                    <button
                      disabled={savingId === a.id}
                      onClick={() => updateStatus(a.id, 'absent')}
                      className={`px-2 py-1 text-xs rounded transition
                  ${a.status === 'absent'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-muted'}
                  ${savingId === a.id ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                    >
                      Absent
                    </button>
                    {savingId === a.id && (
                      <span className="text-xs text-muted-foreground ml-1">
                        Saving…
                      </span>
                    )}
                    {errorId === a.id && (
                      <span className="text-xs text-red-600 ml-1">
                        Error
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground capitalize">
                    {a.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
