'use client';
import { useCallback, useEffect, useState } from 'react';
import type { DashboardFeed } from '../shared/feed';
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
