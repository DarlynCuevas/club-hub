import { Spinner } from '@/components/ui/spinner'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocation } from 'react-router-dom'

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { useTranslation } from 'react-i18next'
import { EventDB } from '@/types'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export default function CalendarPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [events, setEvents] = useState<EventDB[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 🔹 Load events (RLS handles filtering)
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

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
            .returns<EventDB[]>()


      if (error) {
        setError('Failed to load events')
      } else {
        setEvents(data || [])
      }

      setLoading(false)
    }

    load()
  }, [location.key])

  // Events for selected date
  const selectedEvents: EventDB[] = selectedDate
    ? events.filter(e =>
        isSameDay(new Date(e.start_time), selectedDate)
      )
    : []

  // Days that have events
  const hasEvent = (date: Date) =>
    events.some(e => isSameDay(new Date(e.start_time), date))

  if (loading) return <Spinner />
  if (error) return <div className="text-center text-muted-foreground">{error}</div>

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('calendar.title')}
        </h1>
      </div>

      {/* Calendar */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <h2 className="text-lg font-medium">
              {t(`calendar.months.${currentMonth.getMonth()}`)}{' '}
              {currentMonth.getFullYear()}
            </h2>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {(t('calendar.days', {
              returnObjects: true,
            }) as string[]).map((day: string, i: number) => (
              <div
                key={i}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map(day => {
              const isSelected =
                selectedDate && isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square rounded-full flex flex-col items-center justify-center relative
                    text-sm transition-colors
                    ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                      : isToday
                        ? 'bg-secondary font-medium'
                        : 'hover:bg-muted'
                    }
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {hasEvent(day) && !isSelected && (
                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>


      {/* Selected date events */}
      {selectedDate && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t(`calendar.weekdays.${selectedDate.getDay()}`)},{" "}
            {t(`calendar.months.${selectedDate.getMonth()}`)}{" "}
            {selectedDate.getDate()}
          </h2>

          {selectedEvents.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {t('calendar.noEvents')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map(event => {
                const isPast =
                  new Date(event.end_time) < new Date()

                const isToday =
                  isSameDay(new Date(event.start_time), new Date())

                return (
                  <Card
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}`)}
                    className={cn(
                      'shadow-card cursor-pointer transition',
                      isPast && 'opacity-60',
                      isToday && 'ring-1 ring-primary/40',
                      'hover:bg-muted/40'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {t(`eventTypes.${event.event_type}`)}
                        </Badge>
                      </div>

                      <p className="font-medium text-foreground">
                        {event.title}
                      </p>

                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(event.start_time), 'HH:mm')} –{" "}
                          {format(new Date(event.end_time), 'HH:mm')}
                        </span>
                      </div>

                      {event.teams && event.teams.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {event.teams.map(t => t.name).join(', ')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

          )}
        </section>
 )}
    </div>
  )
}
      