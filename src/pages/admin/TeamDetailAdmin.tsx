import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Error as ErrorState } from '@/components/ui/error'
import { Badge } from '@/components/ui/badge'
import { User, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Team = {
	id: string
	name: string
	season: string | null
	club_id: string
}

type Player = {
	id: string
	full_name: string
	birth_date: string | null
	user_id?: string | null
}

export default function TeamDetailAdmin() {

	const { teamId } = useParams<{ teamId: string }>()
	const { t } = useTranslation()
	const navigate = useNavigate()

	// --- HOOKS: todos juntos y al principio ---
	const [team, setTeam] = useState<Team | null>(null)
	const [players, setPlayers] = useState<Player[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showAddPlayer, setShowAddPlayer] = useState(false)
	const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
	const [loadingPlayers, setLoadingPlayers] = useState(false)
	const [newPlayerName, setNewPlayerName] = useState('')
	const [newBirthDate, setNewBirthDate] = useState('')
	const [creatingPlayer, setCreatingPlayer] = useState(false)
        	// Estado para activar acceso
	const [showActivateModal, setShowActivateModal] = useState(false)
	const [activateEmail, setActivateEmail] = useState('')
	const [activatePassword, setActivatePassword] = useState('')
	const [activating, setActivating] = useState(false)
	const [activatingPlayerId, setActivatingPlayerId] = useState<string | null>(null)


	// Puedes mejorar esto según tu AuthContext
	const userRole = (window as any).userRole || 'super_admin' // temporal, reemplaza por tu lógica real
	const canEditTeam = userRole === 'super_admin' || userRole === 'coach'
	const canCreatePlayer = canEditTeam

	useEffect(() => {
		if (!teamId) return

		const load = async () => {
			setLoading(true)
			setError(null)

			// 1️ Load team
			const { data: teamData, error: teamError } = await supabase
				.from('teams')
				.select('id, name, season, club_id')
				.eq('id', teamId)
				.single()

			if (teamError) {
				setError('Failed to load team')
				setLoading(false)
				return
			}

			setTeam(teamData)

			// 2️ Load players
			const { data: playersData, error: playersError } = await supabase
				.from('team_players')
				.select(`
					player:players!team_players_player_fk (
						id,
						full_name,
						birth_date
					)
				`)
				.eq('team_id', teamId)

			console.log('playersData', playersData)
			if (!playersError) {
				const players = (playersData || []).flatMap((item: any) => item.player)
				setPlayers(players)
			}

			setLoading(false)
		}

		load()
	}, [teamId])

	// --- FUNCIONES ---
	// Cargar jugadores disponibles del club (no asignados al team)
	const loadAvailablePlayers = async () => {
		if (!team) return

		setLoadingPlayers(true)

		// 1️ IDs de jugadores YA en el team
		const { data: teamPlayers } = await supabase
			.from('team_players')
			.select('player_id')
			.eq('team_id', team.id)

		const assignedIds = (teamPlayers || []).map(p => p.player_id)

		// 2️ Jugadores del club EXCLUYENDO los ya asignados
		const { data, error } = await supabase
			.from('players')
			.select('id, full_name, birth_date')
			.eq('club_id', team.club_id)
			.not('id', 'in', `(${assignedIds.join(',') || '00000000-0000-0000-0000-000000000000'})`)

		if (!error) {
			setAvailablePlayers(data || [])
		}

		setLoadingPlayers(false)
	}

	// Refrescar roster tras asignar
	const loadTeamPlayers = async (teamId: string) => {
		const { data: playersData, error: playersError } = await supabase
			.from('team_players')
			.select(`
				player:players!team_players_player_fk (
					id,
					full_name,
					birth_date
				)
			`)
			.eq('team_id', teamId)

		console.log('playersData', playersData)
		if (!playersError) {
			const players = (playersData || []).flatMap((item: any) => item.player)
			setPlayers(players)
		}
	}

	// Asignar jugador al equipo
	const assignPlayerToTeam = async (playerId: string) => {
		if (!team) return

		const { error } = await supabase
			.from('team_players')
			.insert({
				team_id: team.id,
				player_id: playerId,
			})

		if (error) {
			toast.error('Failed to assign player')
			return
		}

		toast.success('Player added to team')

		// 1️ refrescar roster del team
		loadTeamPlayers(team.id)

		// 2️ quitar de la lista disponible
		setAvailablePlayers(prev => prev.filter(p => p.id !== playerId))
	}

	// Eliminar jugador del equipo
	const removePlayerFromTeam = async (playerId: string) => {
		if (!team) return

		const { error } = await supabase
			.from('team_players')
			.delete()
			.eq('team_id', team.id)
			.eq('player_id', playerId)

		if (error) {
			toast.error('Failed to remove player')
			return
		}

		toast.success('Player removed from team')

		// refrescar roster
		loadTeamPlayers(team.id)
	}
    	if (loading) return <Spinner />
		if (error || !team) return <ErrorState message={error ?? 'Team not found'} />

	// Crear jugador y asignar al team
	const createPlayer = async () => {
		if (!team?.club_id || !newPlayerName) return
		setCreatingPlayer(true)
		const { data, error } = await supabase
			.from('players')
			.insert({
				full_name: newPlayerName,
				birth_date: newBirthDate || null,
				club_id: team.club_id,
			})
			.select()
			.single()

		if (error) {
			toast.error('Failed to create player')
			setCreatingPlayer(false)
			return
		}

		toast.success('Player created')

		// Asignar al team actual
		await supabase.from('team_players').insert({
			team_id: team.id,
			player_id: data.id,
		})

		setNewPlayerName('')
		setNewBirthDate('')
		setShowAddPlayer(false)
		setCreatingPlayer(false)
		loadTeamPlayers(team.id)
	}


	// Permiso para activar acceso
	const canActivateAccess = userRole === 'super_admin' || userRole === 'parent'

	// Llamada a Edge Function para crear usuario y enlazarlo al jugador
	const activatePlayerAccess = async (playerId: string) => {
		setActivating(true)
		try {
			const res = await fetch('/functions/v1/create-player-user', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: activateEmail,
					password: activatePassword,
					player_id: playerId,
                    
				}),
			})
			const result = await res.json()
			if (!res.ok || result.error) {
				toast.error(result.error || 'Failed to activate access')
				setActivating(false)
				return
			}
			toast.success('Access activated')
			setShowActivateModal(false)
			setActivateEmail('')
			setActivatePassword('')
			setActivating(false)
			loadTeamPlayers(team!.id)
		} catch (err) {
			toast.error('Failed to activate access')
			setActivating(false)
		}
	}


	return (
		<div className="px-4 pt-6 pb-6 space-y-6">
			{/* Back */}
			<button
				onClick={() => navigate(-1)}
				className="flex items-center gap-2 text-sm text-muted-foreground"
			>
				<ArrowLeft className="w-4 h-4" />
				{t('common.back')}
			</button>

			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold text-foreground">
					{team.name}
				</h1>
				{team.season && (
					<Badge variant="secondary" className="mt-2">
						{team.season}
					</Badge>
				)}
				{canEditTeam && (
					<button
						onClick={() => {
							const next = !showAddPlayer
							setShowAddPlayer(next)
							if (next) {
								loadAvailablePlayers()
							}
						}}
						className="text-sm text-primary underline mt-2"
					>
						Add player
					</button>
				)}
			</div>

			{/* Panel de selección de jugador y creación */}
			{showAddPlayer && (
				<Card className="shadow-card">
					<CardContent className="p-4 space-y-3">
						<h3 className="text-sm font-medium">
							Select player from club
						</h3>

						{canCreatePlayer && (
							<form
								className="flex flex-col gap-2 mb-4"
								onSubmit={e => {
									e.preventDefault()
									createPlayer()
								}}
							>
								<input
									type="text"
									placeholder="Full name"
									value={newPlayerName}
									onChange={e => setNewPlayerName(e.target.value)}
									className="border rounded px-2 py-1 text-sm"
									required
									disabled={creatingPlayer}
								/>
								<input
									type="date"
									placeholder="Birth date"
									value={newBirthDate}
									onChange={e => setNewBirthDate(e.target.value)}
									className="border rounded px-2 py-1 text-sm"
									disabled={creatingPlayer}
								/>
								<button
									type="submit"
									className="bg-primary text-white rounded px-3 py-1 text-sm mt-1 disabled:opacity-50"
									disabled={creatingPlayer || !newPlayerName}
								>
									{creatingPlayer ? 'Creating…' : 'Create player'}
								</button>
							</form>
						)}

						{loadingPlayers ? (
							<p className="text-sm text-muted-foreground">
								Loading players…
							</p>
						) : availablePlayers.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No available players
							</p>
						) : (
							<div className="space-y-2">
								{availablePlayers.map(player => (
									<button
										key={player.id}
										onClick={() => assignPlayerToTeam(player.id)}
										className="w-full flex items-center justify-between p-2 rounded hover:bg-muted"
									>
										<span className="text-sm font-medium">
											{player.full_name}
										</span>
										<span className="text-xs text-muted-foreground">
											{player.birth_date
												? new Date(player.birth_date).getFullYear()
												: '—'}
										</span>
									</button>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Players */}
			<section className="space-y-3">
				<h2 className="text-sm font-medium text-muted-foreground uppercase">
					{t('teams.players')}
				</h2>

				{players.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{t('teams.noPlayers')}
					</p>
				) : (
					<Card className="shadow-card">
						<CardContent className="p-0 divide-y divide-border">
							{players.map(player => (
								<div
									key={player.id}
									className="p-4 flex items-center gap-3"
								>
									<div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
										<User className="w-5 h-5 text-muted-foreground" />
									</div>

									<div className="flex-1">
										<p className="font-medium text-foreground">
											{player.full_name}
										</p>
										<p className="text-sm text-muted-foreground">
											{player.birth_date
												? t('teams.born', {
														year: new Date(player.birth_date).getFullYear(),
													})
												: t('teams.na')}
										</p>
									</div>
									{canEditTeam && (
										<button
											onClick={() => removePlayerFromTeam(player.id)}
											className="text-xs text-destructive hover:underline"
										>
											Remove
										</button>
									)}
									{/* Botón Activate access */}
									{!player.user_id && canActivateAccess && (
										<button
											onClick={() => {
												setShowActivateModal(true)
												setActivatingPlayerId(player.id)
											}}
											className="text-xs text-primary hover:underline ml-2"
										>
											Activate access
										</button>
									)}
								</div>
							))}
									{/* Modal Activate access */}
									{showActivateModal && (
										<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
											<div className="bg-white rounded shadow-lg p-6 w-full max-w-sm">
												<h3 className="text-lg font-semibold mb-4">Activate access</h3>
												<form
													className="flex flex-col gap-3"
													onSubmit={e => {
														e.preventDefault()
														if (activatingPlayerId) activatePlayerAccess(activatingPlayerId)
													}}
												>
													<input
														type="email"
														placeholder="Email"
														value={activateEmail}
														onChange={e => setActivateEmail(e.target.value)}
														className="border rounded px-2 py-1 text-sm"
														required
														disabled={activating}
													/>
													<input
														type="password"
														placeholder="Password"
														value={activatePassword}
														onChange={e => setActivatePassword(e.target.value)}
														className="border rounded px-2 py-1 text-sm"
														required
														disabled={activating}
													/>
													<div className="flex gap-2 mt-2">
														<button
															type="submit"
															className="bg-primary text-white rounded px-3 py-1 text-sm disabled:opacity-50"
															disabled={activating || !activateEmail || !activatePassword}
														>
															{activating ? 'Activating…' : 'Activate'}
														</button>
														<button
															type="button"
															className="text-sm text-muted-foreground underline"
															onClick={() => setShowActivateModal(false)}
															disabled={activating}
														>
															Cancel
														</button>
													</div>
												</form>
											</div>
										</div>
									)}
						</CardContent>
					</Card>
				)}
			</section>
		</div>
	)
}
