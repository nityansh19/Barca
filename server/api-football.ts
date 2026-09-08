import type { Fixture, Player } from '../shared/domain.ts';
import type { DashboardFeed } from '../shared/feed.ts';
import { sortedFixtures } from '../shared/feed.ts';

type Row = Record<string, unknown>;
function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Row)
    : {};
}
function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}
function num(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function rows(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
export class FeedError extends Error {}

export function normalizeFixtures(input: unknown[], teamId: number): Fixture[] {
  const unique = new Map<string, Fixture>();
  for (const item of input) {
    const r = row(item),
      fixture = row(r.fixture),
      teams = row(r.teams),
      home = row(teams.home),
      away = row(teams.away);
    if (num(home.id) !== teamId && num(away.id) !== teamId) continue;
    const id = num(fixture.id);
    if (id === null) continue;
    const isHome = num(home.id) === teamId,
      opponent = isHome ? away : home;
    const short = str(row(fixture.status).short);
    const status: Fixture['status'] = [
      'FT',
      'AET',
      'PEN',
      'AWD',
      'WO',
    ].includes(short)
      ? 'finished'
      : ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(short)
        ? 'live'
        : short === 'PST'
          ? 'postponed'
          : short === 'CANC'
            ? 'cancelled'
            : ['SUSP', 'INT', 'ABD'].includes(short)
              ? 'interrupted'
              : ['NS', 'TBD'].includes(short)
                ? 'scheduled'
                : 'unknown';
    const date = str(fixture.date);
    const kickoff =
      short !== 'TBD' && date && Number.isFinite(Date.parse(date))
        ? new Date(date).toISOString()
        : null;
    const goals = row(r.goals),
      homeGoals = num(goals.home),
      awayGoals = num(goals.away);
    const score: [number, number] | undefined =
      ['finished', 'live', 'interrupted'].includes(status) &&
      homeGoals !== null &&
      awayGoals !== null
        ? isHome
          ? [homeGoals, awayGoals]
          : [awayGoals, homeGoals]
        : undefined;
    unique.set(String(id), {
      id: String(id),
      opponent: str(opponent.name, 'Opponent TBC'),
      code: str(
        opponent.code,
        str(opponent.name, 'TBC').slice(0, 3).toUpperCase(),
      ),
      home: isHome,
      competition: str(row(r.league).name, 'Competition TBC'),
      kickoff,
      stadium: str(row(fixture.venue).name, 'Venue TBC'),
      status,
      ...(score ? { score } : {}),
    });
  }
  return sortedFixtures([...unique.values()]);
}
export function normalizeSquad(input: unknown[], teamId: number): Player[] {
  const squad = input.map(row).find((r) => num(row(r.team).id) === teamId);
  if (!squad)
    throw new FeedError('The provider did not return the Barcelona squad.');
  const unique = new Map<string, Player>();
  for (const p of rows(squad.players).map(row)) {
    const id = num(p.id);
    if (id === null || !str(p.name)) continue;
    const position = str(p.position);
    if (
      !['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Forward'].includes(
        position,
      )
    )
      continue;
    unique.set(String(id), {
      id: String(id),
      name: str(p.name),
      number: num(p.number),
      position:
        position === 'Attacker' ? 'Forward' : (position as Player['position']),
      nationality: str(p.nationality, 'Not supplied'),
      availability: 'Unknown',
      appearances: null,
      goals: null,
      assists: null,
      minutes: null,
    });
  }
  return [...unique.values()];
}
export async function apiRequest(
  key: string,
  endpoint: string,
  params: Record<string, string>,
  fetcher: typeof fetch = fetch,
): Promise<unknown[]> {
  const url = new URL('https://v3.football.api-sports.io/' + endpoint);
  url.search = new URLSearchParams(params).toString();
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { 'x-apisports-key': key },
      signal: AbortSignal.timeout(12000),
      redirect: 'error',
    });
  } catch {
    throw new FeedError('The football provider could not be reached.');
  }
  if (!response.ok)
    throw new FeedError(
      'The football provider is unavailable or its quota has been reached.',
    );
  let data: Row;
  try {
    data = row(await response.json());
  } catch {
    throw new FeedError('The football provider returned an invalid response.');
  }
  if (
    !Array.isArray(data.response) ||
    Object.keys(row(data.errors)).length ||
    (Array.isArray(data.errors) && data.errors.length)
  )
    throw new FeedError(
      'The football provider rejected the request. Check the API plan and season coverage.',
    );
  return data.response;
}
export async function fetchLiveDashboard(
  key: string,
  season: number,
  fetcher: typeof fetch = fetch,
): Promise<DashboardFeed> {
  // Resolve the ID from the provider rather than assuming a hard-coded identifier.
  const teams = await apiRequest(
    key,
    'teams',
    { search: 'Barcelona' },
    fetcher,
  );
  const matches = teams
    .map(row)
    .map((r) => row(r.team))
    .filter(
      (t) =>
        str(t.name) === 'Barcelona' &&
        str(t.country) === 'Spain' &&
        t.national === false,
    );
  if (matches.length !== 1 || num(matches[0].id) === null)
    throw new FeedError(
      'Could not uniquely identify FC Barcelona in the provider.',
    );
  const teamId = num(matches[0].id)!;
  const fixtures = await apiRequest(
    key,
    'fixtures',
    { team: String(teamId), season: String(season) },
    fetcher,
  );
  const squad = await apiRequest(
    key,
    'players/squads',
    { team: String(teamId) },
    fetcher,
  );
  return {
    mode: 'live',
    source: 'API-Football',
    fetchedAt: new Date().toISOString(),
    stale: false,
    season,
    fixtures: normalizeFixtures(fixtures, teamId),
    players: normalizeSquad(squad, teamId),
    notices: [
      'Fixtures and squad are synced hourly. Live minute-by-minute scores are not enabled.',
      'Player statistics, injuries and confirmed lineups are not connected yet. Missing information stays unknown.',
    ],
  };
}
