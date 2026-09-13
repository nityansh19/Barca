import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeFixtures,
  normalizeSquad,
  apiRequest,
  fetchFixtureUpdate,
  fetchLiveDashboard,
} from '../server/api-football.ts';
import {
  filterFixtures,
  liveFixtureCandidate,
  seasonFor,
} from '../shared/feed.ts';
const record = (
  status = 'NS',
  date: string | null = '2026-09-12T19:00:00Z',
) => ({
  fixture: {
    id: 5,
    date,
    status: { short: status },
    venue: { name: 'Ground' },
  },
  league: { name: 'Super Cup' },
  teams: {
    home: { id: 1, name: 'Opponent' },
    away: { id: 9, name: 'Barcelona' },
  },
  goals: { home: 1, away: 3 },
});
void test('normalization preserves Barcelona score orientation and competition', () => {
  const [f] = normalizeFixtures([record('FT')], 9);
  assert.deepEqual(f.score, [3, 1]);
  assert.equal(f.home, false);
  assert.equal(f.competition, 'Super Cup');
});
void test('TBD dates, interruptions, duplicates and unrelated teams are handled', () => {
  assert.equal(normalizeFixtures([record('TBD')], 9)[0].kickoff, null);
  assert.equal(normalizeFixtures([record('INT')], 9)[0].status, 'interrupted');
  assert.equal(normalizeFixtures([record('2H')], 9)[0].status, 'live');
  assert.equal(normalizeFixtures([record(), record()], 9).length, 1);
  assert.equal(normalizeFixtures([record()], 99).length, 0);
  assert.equal(
    normalizeFixtures([record('NS', 'invalid')], 9)[0].kickoff,
    null,
  );
  assert.equal(normalizeFixtures([record()], 9)[0].score, undefined);
});
void test('unknown player stats are not invented zeroes; only current squad is accepted', () => {
  const [p] = normalizeSquad(
    [
      {
        team: { id: 9 },
        players: [
          { id: 2, name: 'Player', position: 'Attacker', number: null },
        ],
      },
    ],
    9,
  );
  assert.equal(p.goals, null);
  assert.equal(p.appearances, null);
  assert.equal(p.availability, 'Unknown');
  assert.equal(p.position, 'Forward');
  assert.throws(() => normalizeSquad([{ team: { id: 10 }, players: [] }], 9));
});
void test('HTTP-200 provider quota errors and invalid payloads fail safely', async () => {
  await assert.rejects(
    apiRequest('private-key', 'fixtures', {}, async () =>
      Response.json({ errors: { requests: 'quota' }, response: [] }),
    ),
  );
  await assert.rejects(
    apiRequest('private-key', 'fixtures', {}, async () =>
      Response.json({ response: 'bad' }),
    ),
  );
  await assert.rejects(
    apiRequest(
      'private-key',
      'fixtures',
      {},
      async () => new Response('error', { status: 429 }),
    ),
    (e) => e instanceof Error && !e.message.includes('private-key'),
  );
});
void test('full adapter resolves club identity and normalizes provider fixtures and squad', async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    calls.push(url.pathname);
    assert.equal(new Headers(init?.headers).get('x-apisports-key'), 'test-key');
    const response =
      url.pathname === '/teams'
        ? [
            {
              team: {
                id: 9,
                name: 'Barcelona',
                country: 'Spain',
                national: false,
              },
            },
          ]
        : url.pathname === '/fixtures'
          ? [record()]
          : [
              {
                team: { id: 9 },
                players: [
                  { id: 8, name: 'Pedri', position: 'Midfielder', number: 8 },
                ],
              },
            ];
    return Response.json({ errors: [], response });
  };
  const result = await fetchLiveDashboard('test-key', 2026, fetcher);
  assert.equal(result.mode, 'live');
  assert.equal(result.fixtures.length, 1);
  assert.equal(result.players.length, 1);
  assert.deepEqual(calls, ['/teams', '/fixtures', '/players/squads']);
});
void test('single-fixture refresh updates live score and elapsed minute', async () => {
  const base = normalizeFixtures([record()], 9)[0];
  const live = {
    ...record('2H'),
    fixture: {
      ...record('2H').fixture,
      status: { short: '2H', elapsed: 73 },
    },
    goals: { home: 2, away: 3 },
  };
  const updated = await fetchFixtureUpdate('test-key', base, async () =>
    Response.json({ errors: [], response: [live] }),
  );
  assert.equal(updated.status, 'live');
  assert.equal(updated.minute, 73);
  assert.deepEqual(updated.score, [3, 2]);
});
void test('match-window detection activates shortly before kickoff and ignores old finals', () => {
  const base = normalizeFixtures([record()], 9)[0];
  assert.equal(
    liveFixtureCandidate([base], Date.parse('2026-09-12T18:55:00Z'))?.id,
    base.id,
  );
  assert.equal(
    liveFixtureCandidate(
      [{ ...base, status: 'finished' }],
      Date.parse('2026-09-12T19:30:00Z'),
    ),
    undefined,
  );
});
void test('search is accent insensitive and results are reverse chronological', () => {
  const f = normalizeFixtures([record('FT')], 9)[0];
  const result = filterFixtures(
    [
      { ...f, id: 'old', kickoff: '2026-08-01T19:00:00Z', opponent: 'Alavés' },
      { ...f, id: 'new', opponent: 'Alavés' },
    ],
    { tab: 'Results', competition: 'All competitions', query: 'alaves' },
  );
  assert.deepEqual(
    result.map((x) => x.id),
    ['new', 'old'],
  );
  assert.equal(seasonFor(new Date('2027-01-01')), 2026);
});
