'use client';
import { useCallback, useEffect, useState } from 'react';
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
export function useDashboard() {
  const [feed, setFeed] = useState<DashboardFeed | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/dashboard', {
        signal,
        cache: 'no-store',
      });
      const raw = await response.json();
      const body =
        raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      if (!response.ok)
        throw new Error(
          typeof body.error === 'string'
            ? body.error
            : 'The feed could not be loaded.',
        );
      if (
        !Array.isArray(body.fixtures) ||
        !Array.isArray(body.players) ||
        !['demo', 'live'].includes(String(body.mode))
      )
        throw new Error('The feed returned an invalid response.');
      setFeed(body as DashboardFeed);
      setError('');
    } catch (e) {
      if (!signal?.aborted)
        setError(
          e instanceof Error ? e.message : 'The feed could not be loaded.',
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    // Start the external fetch; every state update in refresh follows its awaited response.
    // eslint-disable-next-line react/react-compiler
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    const delay = pollDelay(feed);
    if (delay === null) return;
    const interval = setInterval(() => {
      void refresh();
    }, delay);
    return () => clearInterval(interval);
  }, [feed, refresh]);
  return {
    feed,
    error,
    loading,
    refresh: () => {
      setLoading(true);
      setError('');
      return refresh();
    },
  };
}
