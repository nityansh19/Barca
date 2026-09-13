import { demoFixtures, demoPlayers } from '../shared/demo';
import {
  liveFixtureCandidate,
  seasonFor,
  type DashboardFeed,
} from '../shared/feed';
import {
  fetchFixtureUpdate,
  fetchLiveDashboard,
  FeedError,
} from './api-football';
import { cachedDashboard, cachedLiveFixture } from './feed-cache';

function configuredMode() {
  const mode = (process.env.FOOTBALL_DATA_MODE ?? 'demo').trim().toLowerCase();
  if (!['live', 'demo'].includes(mode))
    throw new FeedError('Unknown football data mode.');
  return mode as 'live' | 'demo';
}

function configuredSeason() {
  const raw = process.env.FOOTBALL_SEASON?.trim();
  const season = raw ? Number(raw) : seasonFor(new Date());
  if (!Number.isInteger(season) || season < 2000 || season > 2100)
    throw new FeedError('The football season configuration is invalid.');
  return season;
}

export async function getDashboard(): Promise<DashboardFeed> {
  const mode = configuredMode();

  if (mode !== 'live') {
    return {
      mode: 'demo',
      source: 'Illustrative sample data',
      fetchedAt: new Date().toISOString(),
      stale: false,
      season: 2026,
      fixtures: demoFixtures,
      players: demoPlayers,
      notices: [
        'Demo fixtures and statistics are illustrative. Player availability is unverified.',
      ],
    };
  }

  const key = process.env.API_FOOTBALL_KEY?.trim();
  if (!key)
    throw new FeedError(
      'Live data is selected, but the football API key has not been configured.',
    );

  const season = configuredSeason();
  const dashboard = await cachedDashboard(season, () =>
    fetchLiveDashboard(key, season),
  );
  const candidate = liveFixtureCandidate(dashboard.fixtures);
  if (!candidate) return dashboard;

  try {
    const liveFixture = await cachedLiveFixture(candidate.id, () =>
      fetchFixtureUpdate(key, candidate),
    );
    return {
      ...dashboard,
      fixtures: dashboard.fixtures.map((fixture) =>
        fixture.id === liveFixture.id ? liveFixture : fixture,
      ),
      notices: [
        ...dashboard.notices,
        'Match-window score refresh is active. The free-tier profile checks the current fixture about every three minutes.',
      ],
    };
  } catch {
    return {
      ...dashboard,
      notices: [
        ...dashboard.notices,
        'The live score refresh is temporarily unavailable; schedule and squad data remain available.',
      ],
    };
  }
}

export async function dashboardResponse(
  select: (feed: DashboardFeed) => unknown = (f) => f,
) {
  try {
    return Response.json(select(await getDashboard()), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof FeedError
            ? error.message
            : 'The football feed could not be loaded. Please try again.',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'private, no-store',
          'Retry-After': '60',
        },
      },
    );
  }
}
