import { useCallback, useEffect, useState } from 'react';
import { demoFixtures, demoPlayers } from '../shared/demo';
import type { DashboardFeed } from '../shared/feed';
const MINUTE = 60000;
function pollDelay(feed: DashboardFeed | null) {
  if (!feed || feed.mode !== 'live') return null;
  const now = Date.now();
  const matchWindow = feed.fixtures.some((fixture) => {
    if (fixture.status === 'live' || fixture.status === 'interrupted')
      return true;
    if (
      !fixture.kickoff ||
      ['finished', 'cancelled', 'postponed'].includes(fixture.status)
    )
      return false;
    const kickoff = Date.parse(fixture.kickoff);
    return (
      Number.isFinite(kickoff) &&
      now >= kickoff - 10 * MINUTE &&
      now <= kickoff + 4 * 60 * MINUTE
    );
  });
  return matchWindow ? 2 * MINUTE : 15 * MINUTE;
}
export function useMobileFeed() {
  const [feed, setFeed] = useState<DashboardFeed | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(
    async (signal?: AbortSignal, background = false) => {
      if (!background) setLoading(true);
      setError('');
      const origin = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
      try {
        if (!origin) {
          setFeed({
            mode: 'demo',
            source: 'Built-in sample data',
            fetchedAt: new Date().toISOString(),
            stale: false,
            season: 2026,
            fixtures: demoFixtures,
            players: demoPlayers,
            notices: [
              'Sample data. Set a reachable API origin to connect the backend.',
            ],
          });
          return;
        }
        const url = new URL(origin);
        if (!['http:', 'https:'].includes(url.protocol))
          throw new Error('The API origin must use HTTP or HTTPS.');
        const response = await fetch(origin + '/api/dashboard', { signal });
        const raw: unknown = await response.json();
        const data =
          raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
        if (!response.ok)
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'The feed is unavailable.',
          );
        if (
          !Array.isArray(data.fixtures) ||
          !Array.isArray(data.players) ||
          !['demo', 'live'].includes(String(data.mode))
        )
          throw new Error('The API returned an invalid feed.');
        setFeed(data as DashboardFeed);
      } catch (e) {
        if (!signal?.aborted)
          setError(
            e instanceof Error ? e.message : 'The feed could not be loaded.',
          );
      } finally {
        if (!signal?.aborted && !background) setLoading(false);
      }
    },
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    const delay = pollDelay(feed);
    if (delay === null) return;
    const interval = setInterval(() => {
      void refresh(undefined, true);
    }, delay);
    return () => clearInterval(interval);
  }, [feed, refresh]);
  return { feed, error, loading, refresh };
}
