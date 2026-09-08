import type { DashboardFeed } from '../shared/feed.ts';
import { FeedError } from './api-football.ts';
type Cached = {
  payload: string | null;
  updated_at: number;
  retry_after: number;
};
const HOUR = 3600000;
function stored(record: Cached | null, now: number): DashboardFeed | null {
  if (!record?.payload || now - record.updated_at > 24 * HOUR) return null;
  try {
    const data = JSON.parse(record.payload) as DashboardFeed;
    return data.mode === 'live' &&
      Array.isArray(data.fixtures) &&
      Array.isArray(data.players)
      ? { ...data, stale: now - record.updated_at >= HOUR }
      : null;
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
  const key = 'api-football:v1:' + season;
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
    .bind(key, now + 60000, now)
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
