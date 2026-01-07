import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import PlayerRow from './PlayerRow'

type Player = {
    id: string
    full_name: string
    birth_date: string | null
    user_id: string | null
}

export default function TeamDetail({
    team
}: {
    team: { id: string; name: string }
}) {
    const [players, setPlayers] = useState<Player[]>([])
    const [loading, setLoading] = useState(true)

    // Definir loadPlayers en el scope del componente
    const loadPlayers = useCallback(async () => {
        setLoading(true)

        const { data, error } = await supabase
            .from('team_players')
            .select(`
        player:players!team_players_player_id_fkey (
          id,
          full_name,
          birth_date,
          user_id
        )
      `)
            .eq('team_id', team.id)

        if (!error && data) {
            const flatPlayers = data.flatMap(row => row.player ?? [])
            setPlayers(flatPlayers)
        }

        setLoading(false)
    }, [team.id])

    useEffect(() => {
        loadPlayers()
    }, [loadPlayers])
    if (loading) return <p>Cargando jugadores…</p>

    return (
        <section className="flex-1 space-y-4">
            <h2 className="text-xl font-semibold">{team.name}</h2>

            {players.map(player => (
                <PlayerRow
                    key={player.id}
                    player={player}
                    onRefresh={loadPlayers}
                />
            ))}
        </section>
    )
}
