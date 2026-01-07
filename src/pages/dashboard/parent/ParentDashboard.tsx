import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { Error as ErrorState } from '@/components/ui/error';
import TeamList from './components/TeamList';
import TeamDetail from './components/TeamDetail';

type Team = {
	id: string;
	name: string;
};

export default function ParentDashboard() {
	const { user } = useAuth();
	const [teams, setTeams] = useState<Team[]>([]);
	const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!user?.id) return;

		const loadTeams = async () => {
			setLoading(true);
			setError(null);

			const { data, error } = await supabase
				.from('teams')
				.select('id, name')
				.eq('parent_user_id', user.id);

			if (error) {
				setError('No se pudieron cargar los equipos');
				setLoading(false);
				return;
			}

			setTeams(data || []);
			setSelectedTeam(data?.[0] ?? null);
			setLoading(false);
		};

		loadTeams();
	}, [user]);

	if (loading) return <Spinner />;
	if (error) return <ErrorState message={error} />;

	return (
		<div className="flex gap-6 p-6">
			<TeamList
				teams={teams}
				selectedTeam={selectedTeam}
				onSelect={setSelectedTeam}
			/>

			{selectedTeam && (
				<TeamDetail team={selectedTeam} />
			)}
		</div>
	);
}
