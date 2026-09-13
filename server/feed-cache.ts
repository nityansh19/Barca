import type { Fixture } from '../shared/domain.ts';
import type { DashboardFeed } from '../shared/feed.ts';
import { FeedError } from './api-football.ts';
type Cached = {
  payload: string | null;
  updated_at: number;
  retry_after: number;
};
const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const BASE_TTL = 6 * HOUR;
const MAX_BASE_AGE = 24 * HOUR;
const LIVE_TTL = 2 * MINUTE;
const LIVE_FINAL_TTL = 6 * HOUR;
const MAX_LIVE_AGE = 15 * MINUTE;
const finalStatuses: Fixture['status'][] = [
  'finished',
  'cancelled',
  'postponed',
];
function stored(record: Cached | null, now: number): DashboardFeed | null {
  if (!record?.payload || now - record.updated_at > MAX_BASE_AGE) return null;
  try {
    const data = JSON.parse(record.payload) as DashboardFeed;
    return data.mode === 'live' &&
      Array.isArray(data.fixtures) &&
      Array.isArray(data.players)
      ? { ...data, stale: now - record.updated_at >= BASE_TTL }
      : null;
  } catch {
    return null;
  }
}
function storedFixture(
  record: Cached | null,
  now: number,
): { fixture: Fixture; age: number } | null {
  if (!record?.payload) return null;
  try {
    const fixture = JSON.parse(record.payload) as Fixture;
    if (!fixture || typeof fixture.id !== 'string') return null;
    return { fixture, age: now - record.updated_at };
  } catch {
    return null;
  }
}
export async function cachedDashboard(
  db: D1Database,
  season: number,
  loader: () => Promise<DashboardFeed>,
  now = Date.now(),
): Promise<DashboardFeed> {
  const key = 'api-football:v2:' + season;
  const record = await db
    .prepare(
      'SELECT payload, updated_at, retry_after FROM feed_cache WHERE key = ?',
    )
    .bind(key)
    .first<Cached>();
  const cached = stored(record, now);
  if (cached && !cached.stale) return cached;
  // Atomically claim an expired refresh lease. Concurrent requests cannot drain the provider quota.
  const claim = await db
    .prepare(
      'INSERT INTO feed_cache (key,payload,updated_at,retry_after) VALUES (?,NULL,0,?) ON CONFLICT(key) DO UPDATE SET retry_after=excluded.retry_after WHERE feed_cache.retry_after <= ? RETURNING key',
    )
    .bind(key, now + MINUTE, now)
    .first();
  if (!claim) {
    if (cached)
      return {
        ...cached,
        stale: true,
        notices: [
          ...cached.notices,
          'Showing the last saved feed while the provider refreshes.',
        ],
      };
    throw new FeedError(
      'The football feed is refreshing. Please try again in a minute.',
    );
  }
  try {
    const fresh = await loader();
    await db
      .prepare(
        'UPDATE feed_cache SET payload=?, updated_at=?, retry_after=0 WHERE key=?',
      )
      .bind(JSON.stringify(fresh), now, key)
      .run();
    return fresh;
  } catch (error) {
    if (cached)
      return {
        ...cached,
        stale: true,
        notices: [
          ...cached.notices,
          'The provider is unavailable. Showing the last saved feed.',
        ],
      };
    throw error;
  }
}
export async function cachedLiveFixture(
  db: D1Database,
  fixtureId: string,
  loader: () => Promise<Fixture>,
  now = Date.now(),
): Promise<Fixture> {
  const key = 'api-football:live:v1:' + fixtureId;
  const record = await db
    .prepare(
      'SELECT payload, updated_at, retry_after FROM feed_cache WHERE key = ?',
    )
    .bind(key)
    .first<Cached>();
  const cached = storedFixture(record, now);
  if (cached) {
    const ttl = finalStatuses.includes(cached.fixture.status)
      ? LIVE_FINAL_TTL
      : LIVE_TTL;
    if (cached.age < ttl) return cached.fixture;
  }
  const claim = await db
    .prepare(
      'INSERT INTO feed_cache (key,payload,updated_at,retry_after) VALUES (?,NULL,0,?) ON CONFLICT(key) DO UPDATE SET retry_after=excluded.retry_after WHERE feed_cache.retry_after <= ? RETURNING key',
    )
    .bind(key, now + 15000, now)
    .first();
  if (!claim) {
    if (cached) return cached.fixture;
    throw new FeedError('The live fixture is refreshing.');
  }
  try {
    const fresh = await loader();
    await db
      .prepare(
        'UPDATE feed_cache SET payload=?, updated_at=?, retry_after=0 WHERE key=?',
      )
      .bind(JSON.stringify(fresh), now, key)
      .run();
    return fresh;
  } catch (error) {
    if (cached && cached.age < MAX_LIVE_AGE) return cached.fixture;
    throw error;
  }
}
