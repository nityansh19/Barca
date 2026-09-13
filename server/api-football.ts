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
function providerStatus(short: string): Fixture['status'] {
  if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(short)) return 'finished';
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(short))
    return 'live';
  if (short === 'PST') return 'postponed';
  if (short === 'CANC') return 'cancelled';
  if (['SUSP', 'INT', 'ABD'].includes(short)) return 'interrupted';
  if (['NS', 'TBD'].includes(short)) return 'scheduled';
  return 'unknown';
}
function providerKickoff(fixture: Row, short: string) {
  const date = str(fixture.date);
  return short !== 'TBD' && date && Number.isFinite(Date.parse(date))
    ? new Date(date).toISOString()
    : null;
}
function providerScore(
  status: Fixture['status'],
  goals: Row,
  isHome: boolean,
): [number, number] | undefined {
  const homeGoals = num(goals.home),
    awayGoals = num(goals.away);
  if (
    !['finished', 'live', 'interrupted'].includes(status) ||
    homeGoals === null ||
    awayGoals === null
  )
    return undefined;
  return isHome ? [homeGoals, awayGoals] : [awayGoals, homeGoals];
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
      opponent = isHome ? away : home,
      statusRow = row(fixture.status),
      short = str(statusRow.short),
      status = providerStatus(short),
      kickoff = providerKickoff(fixture, short),
      score = providerScore(status, row(r.goals), isHome),
      minute = num(statusRow.elapsed);
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
      ...(status === 'live' && minute !== null ? { minute } : {}),
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
export async function fetchFixtureUpdate(
  key: string,
  base: Fixture,
  fetcher: typeof fetch = fetch,
): Promise<Fixture> {
  const response = await apiRequest(key, 'fixtures', { id: base.id }, fetcher);
  const match = response
    .map(row)
    .find((r) => String(num(row(r.fixture).id)) === base.id);
  if (!match)
    throw new FeedError('The provider did not return the current fixture.');
  const fixture = row(match.fixture),
    statusRow = row(fixture.status),
    short = str(statusRow.short),
    status = providerStatus(short),
    score = providerScore(status, row(match.goals), base.home),
    minute = num(statusRow.elapsed),
    { score: _oldScore, minute: _oldMinute, ...rest } = base;
  return {
    ...rest,
    kickoff: providerKickoff(fixture, short),
    stadium: str(row(fixture.venue).name, base.stadium),
    competition: str(row(match.league).name, base.competition),
    status,
    ...(score ? { score } : {}),
    ...(status === 'live' && minute !== null ? { minute } : {}),
  };
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
      'Schedule and squad are synced every six hours to protect the provider quota.',
      'Around kickoff, the current Barça fixture score and status refresh about every two minutes. Detailed events, confirmed lineups, injuries and player statistics are not connected yet.',
    ],
  };
}
