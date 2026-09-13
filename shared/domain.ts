export type Fixture = {
  id: string;
  opponent: string;
  code: string;
  home: boolean;
  competition: string;
  kickoff: string | null;
  stadium: string;
  status:
    | 'scheduled'
    | 'postponed'
    | 'cancelled'
    | 'finished'
    | 'live'
    | 'interrupted'
    | 'unknown';
  score?: [number, number];
  minute?: number;
};
export type Player = {
  id: string;
  name: string;
  number: number | null;
  position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  availability: 'Available' | 'Injured' | 'Doubtful' | 'Suspended' | 'Unknown';
  nationality: string;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
};
export type Preferences = {
  matchDay: boolean;
  beforeMatch: boolean;
  minutesBefore: 15 | 30 | 60;
  lineup: boolean;
  spoilerFree: boolean;
};
export const defaultPreferences: Preferences = {
  matchDay: true,
  beforeMatch: true,
  minutesBefore: 60,
  lineup: false,
  spoilerFree: false,
};
export function parsePreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object') return { ...defaultPreferences };
  const p = value as Record<string, unknown>;
  return {
    matchDay: typeof p.matchDay === 'boolean' ? p.matchDay : true,
    beforeMatch: typeof p.beforeMatch === 'boolean' ? p.beforeMatch : true,
    lineup: typeof p.lineup === 'boolean' ? p.lineup : false,
    spoilerFree: typeof p.spoilerFree === 'boolean' ? p.spoilerFree : false,
    minutesBefore:
      p.minutesBefore === 15 || p.minutesBefore === 30 || p.minutesBefore === 60
        ? p.minutesBefore
        : 60,
  };
}
