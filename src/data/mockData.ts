import { Club, Team, Player, Event, Message } from '@/types';

export const mockClub: Club = {
  id: 'club-1',
  name: 'FC Barcelona Academy',
  primaryColor: '#004D98',
  createdAt: '2024-01-01',
};

export const mockTeams: Team[] = [
  {
    id: 'team-1',
    centerId: 'center-1',
    clubId: 'club-1',
    name: 'U12 Blue',
    category: 'U12',
    createdAt: '2024-01-01',
  },
  {
    id: 'team-2',
    centerId: 'center-1',
    clubId: 'club-1',
    name: 'U14 Red',
    category: 'U14',
    createdAt: '2024-01-01',
  },
  {
    id: 'team-3',
    centerId: 'center-1',
    clubId: 'club-1',
    name: 'U16 Elite',
    category: 'U16',
    createdAt: '2024-01-01',
  },
];

export const mockPlayers: Player[] = [
  {
    id: 'player-1',
    firstName: 'Emma',
    lastName: 'Johnson',
    birthDate: '2014-03-15',
    createdAt: '2024-01-01',
  },
  {
    id: 'player-2',
    firstName: 'Lucas',
    lastName: 'Johnson',
    birthDate: '2012-07-22',
    createdAt: '2024-01-01',
  },
];

export const mockEvents: Event[] = [
  {
    id: 'event-1',
    teamId: 'team-1',
    title: 'Weekly Training',
    type: 'training',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    endTime: new Date(Date.now() + 86400000 + 5400000).toISOString(),
    location: 'Main Field',
    createdAt: '2024-01-01',
  },
  {
    id: 'event-2',
    teamId: 'team-1',
    title: 'League Match vs Real Madrid',
    type: 'match',
    startTime: new Date(Date.now() + 172800000).toISOString(),
    endTime: new Date(Date.now() + 172800000 + 7200000).toISOString(),
    location: 'City Stadium',
    createdAt: '2024-01-01',
  },
  {
    id: 'event-3',
    teamId: 'team-2',
    title: 'Morning Practice',
    type: 'training',
    startTime: new Date(Date.now() + 259200000).toISOString(),
    endTime: new Date(Date.now() + 259200000 + 5400000).toISOString(),
    location: 'Training Ground B',
    createdAt: '2024-01-01',
  },
  {
    id: 'event-4',
    teamId: 'team-1',
    title: 'Parent Meeting',
    type: 'meeting',
    description: 'End of season review and next season planning',
    startTime: new Date(Date.now() + 345600000).toISOString(),
    endTime: new Date(Date.now() + 345600000 + 3600000).toISOString(),
    location: 'Club House',
    createdAt: '2024-01-01',
  },
];

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    clubId: 'club-1',
    title: 'Season Update',
    content: 'Dear families, we are excited to announce the start of the new season. Training schedules will be shared next week.',
    authorId: 'admin-1',
    authorName: 'Club Administration',
    priority: 'important',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'msg-2',
    teamId: 'team-1',
    title: 'Training Time Change',
    content: 'Please note that this week\'s training has been moved from 5pm to 6pm due to field maintenance.',
    authorId: 'coach-1',
    authorName: 'Coach Martinez',
    priority: 'normal',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'msg-3',
    clubId: 'club-1',
    title: 'Equipment Collection',
    content: 'New uniforms are ready for collection at the club office. Please bring your membership card.',
    authorId: 'admin-1',
    authorName: 'Club Administration',
    priority: 'normal',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

// Helper to get upcoming events
export const getUpcomingEvents = (limit?: number) => {
  const now = new Date();
  const upcoming = mockEvents
    .filter(event => new Date(event.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  return limit ? upcoming.slice(0, limit) : upcoming;
};

// Helper to get recent messages
export const getRecentMessages = (limit?: number) => {
  const sorted = [...mockMessages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  return limit ? sorted.slice(0, limit) : sorted;
};
