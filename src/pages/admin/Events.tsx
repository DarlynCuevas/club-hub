import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function AdminEvents() {
    const { role } = useAuth();
    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<'training' | 'match' | 'meeting' | 'other'>('training');
    const [teamId, setTeamId] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [teams, setTeams] = useState<any[]>([]);
    const { clubId } = useAuth();
    const { t } = useTranslation();
    const [events, setEvents] = useState<any[]>([])

    const [creating, setCreating] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canManageEvents = role === 'super_admin' || role === 'coach';

    if (!canManageEvents) {
        return (
            <div className="p-6 text-muted-foreground">
                {t('adminEvents.noAccess')}
            </div>
        );
    }

    useEffect(() => {
        const loadTeams = async () => {
            const { data } = await supabase
                .from('teams')
                .select('id, name')
                .eq('club_id', clubId);
            setTeams(data || []);
        };
        if (clubId) loadTeams();
    }, [clubId]);

    const createEvent = async () => {
        if (!title || !teamId || !date || !startTime || !endTime) {
            setError(t('auth.pleaseFill'));
            return;
        }
        setCreating(true);
        setError(null);
        setSuccess(false);
        const start = new Date(`${date}T${startTime}`).toISOString();
        const end = new Date(`${date}T${endTime}`).toISOString();
        const { error } = await supabase.from('events').insert({
            club_id: clubId,
            team_id: teamId,
            title,
            event_type: eventType,
            start_time: start,
            end_time: end,
        });
        setCreating(false);
        if (error) {
            setError(t('adminEvents.createFailed', 'Failed to create event'));
            return;
        }
        toast.success("Event created", {
            description: "The event is now visible in the calendar",
        })
        setSuccess(true);
        // reset
        setTitle('');
        setTeamId('');
        setDate('');
        setStartTime('');
        setEndTime('');
    };



    return (
        <div className="px-4 pt-6 pb-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">
                    {t('adminEvents.title')}
                </h1>
            </div>

            <Card className="shadow-card">
                <CardContent className="p-6 space-y-4">
                    <input
                        className="w-full border rounded px-3 py-2"
                        placeholder={t('adminEvents.new')}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />

                    <select
                        className="w-full border rounded px-3 py-2"
                        value={teamId}
                        onChange={e => setTeamId(e.target.value)}
                    >
                        <option value="">{t('teams.title')}</option>
                        {teams.map(ti => (
                            <option key={ti.id} value={ti.id}>
                                {ti.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="w-full border rounded px-3 py-2"
                        value={eventType}
                        onChange={e => setEventType(e.target.value as any)}
                    >
                        <option value="training">{t('eventTypes.training', 'Training')}</option>
                        <option value="match">{t('eventTypes.match', 'Match')}</option>
                        <option value="meeting">{t('adminEvents.meeting', 'Meeting')}</option>
                        <option value="other">{t('adminEvents.other', 'Other')}</option>
                    </select>

                    <input
                        type="date"
                        className="w-full border rounded px-3 py-2"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />

                    <div className="flex gap-2">
                        <input
                            type="time"
                            className="w-full border rounded px-3 py-2"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                        />
                        <input
                            type="time"
                            className="w-full border rounded px-3 py-2"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                        />
                    </div>
                    

                    <Button onClick={createEvent} disabled={creating}>
                        {creating ? t('adminEvents.creating', 'Creating…') : t('adminEvents.create', 'Create event')}
                    </Button>

                    {creating && (
                        <p className="text-sm text-muted-foreground">
                            {t('adminEvents.creating', 'Creating event…')}
                        </p>
                    )}

                    {success && (
                        <p className="text-sm text-green-600">
                            {t('adminEvents.created', 'Event created successfully')}
                        </p>
                    )}

                    {error && (
                        <p className="text-sm text-red-600">
                            {error}
                        </p>
                    )}

                </CardContent>
            </Card>
            {events.length === 0 && (
                <Card className="shadow-card">
                    <CardContent className="p-8 text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                            No events yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Create your first event to get started
                        </p>
                    </CardContent>
                </Card>
            )}


        </div>
    );
}
