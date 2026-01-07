type Team = {
  id: string
  name: string
}

export default function TeamList({
  teams,
  selectedTeam,
  onSelect
}: {
  teams: Team[]
  selectedTeam: Team | null
  onSelect: (team: Team) => void
}) {
  return (
    <aside className="w-64 space-y-2">
      {teams.map(team => (
        <button
          key={team.id}
          onClick={() => onSelect(team)}
          className={`w-full text-left p-3 rounded
            ${selectedTeam?.id === team.id
              ? 'bg-primary text-white'
              : 'bg-muted'}`}
        >
          {team.name}
        </button>
      ))}
    </aside>
  )
}

