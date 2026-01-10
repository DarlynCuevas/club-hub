import ActivatePlayerModal from '../../../components/shared/ActivatePlayerModal'

type Player = {
  id: string
  full_name: string
  user_id: string | null
}

export default function PlayerRow({ player, onRefresh }: { player: Player, onRefresh: () => void }) {
  const hasAccess = Boolean(player.user_id)

  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded">
      <span>{player.full_name}</span>

      {hasAccess ? (
        <span className="text-green-600 font-medium">Acceso activo</span>
      ) : (
        <ActivatePlayerModal playerId={player.id} onSuccess={onRefresh} />
      )}
    </div>
  )
}
