import { env } from 'cloudflare:workers';
import { demoFixtures, demoPlayers } from '../shared/demo';
import { seasonFor, type DashboardFeed } from '../shared/feed';
import { fetchLiveDashboard, FeedError } from './api-football';
import { cachedDashboard } from './feed-cache';

type Runtime = {
  DB?: D1Database;
  API_FOOTBALL_KEY?: string;
  FOOTBALL_DATA_MODE?: string;
  FOOTBALL_SEASON?: string;
};
export async function getDashboard(): Promise<DashboardFeed> {
  const runtime = env as Runtime;
  if (
    runtime.FOOTBALL_DATA_MODE &&
    !['live', 'demo'].includes(runtime.FOOTBALL_DATA_MODE)
  )
    throw new FeedError('Unknown football data mode.');
  if (runtime.FOOTBALL_DATA_MODE !== 'live')
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
  if (!runtime.API_FOOTBALL_KEY)
    throw new FeedError(
      'Live data is selected, but the football API key has not been configured.',
    );
  const db = runtime.DB;
  if (!db) throw new FeedError('The football cache is not configured.');
  const season = runtime.FOOTBALL_SEASON
    ? Number(runtime.FOOTBALL_SEASON)
    : seasonFor(new Date());
  if (!Number.isInteger(season) || season < 2000 || season > 2100)
    throw new FeedError('The football season configuration is invalid.');
  return cachedDashboard(db, season, () =>
    fetchLiveDashboard(runtime.API_FOOTBALL_KEY!, season),
  );
}
export async function dashboardResponse(
  select: (feed: DashboardFeed) => unknown = (f) => f,
) {
  try {
    return Response.json(select(await getDashboard()), {
      headers: { 'Cache-Control': 'no-store' },
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
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
      },
    );
  }
}
