import { getCache } from '@vercel/functions';
import type { Fixture } from '../shared/domain.ts';
import type { DashboardFeed } from '../shared/feed.ts';

export type CacheStore = {
  get(key: string): Promise<unknown>;
  set(
    key: string,
    value: unknown,
    options: { ttl: number },
  ): Promise<unknown>;
};

type MemoryRecord = {
  value: unknown;
  expiresAt: number;
};

const SECOND = 1000;
const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 60 * MINUTE_SECONDS;
export const BASE_TTL_SECONDS = 6 * HOUR_SECONDS;
export const MAX_BASE_AGE_SECONDS = 24 * HOUR_SECONDS;
export const LIVE_TTL_SECONDS = 3 * MINUTE_SECONDS;
export const LIVE_FINAL_TTL_SECONDS = 6 * HOUR_SECONDS;
export const MAX_LIVE_AGE_SECONDS = 15 * MINUTE_SECONDS;

const finalStatuses: Fixture['status'][] = [
  'finished',
  'cancelled',
  'postponed',
];

class LocalMemoryCache implements CacheStore {
  private records = new Map<string, MemoryRecord>();

  async get(key: string) {
    const record = this.records.get(key);
    if (!record) return null;
    if (Date.now() >= record.expiresAt) {
      this.records.delete(key);
      return null;
    }
    return record.value;
  }

  async set(key: string, value: unknown, options: { ttl: number }) {
    this.records.set(key, {
      value,
      expiresAt: Date.now() + options.ttl * SECOND,
    });
  }
}

const localCache = new LocalMemoryCache();
const inflight = new Map<string, Promise<unknown>>();

function runtimeCache(): CacheStore {
  if (process.env.VERCEL) return getCache() as unknown as CacheStore;
  return localCache;
}

function validDashboard(value: unknown): value is DashboardFeed {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<DashboardFeed>;
  return (
    data.mode === 'live' &&
    Array.isArray(data.fixtures) &&
    Array.isArray(data.players) &&
    Array.isArray(data.notices)
  );
}

function validFixture(value: unknown): value is Fixture {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Partial<Fixture>).id === 'string'
  );
}

async function loadOnce<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const pending = loader().finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

export async function cachedDashboard(
  season: number,
  loader: () => Promise<DashboardFeed>,
  store: CacheStore = runtimeCache(),
): Promise<DashboardFeed> {
  const prefix = `barca:api-football:dashboard:v3:${season}`;
  const freshKey = `${prefix}:fresh`;
  const staleKey = `${prefix}:stale`;
  const cached = await store.get(freshKey);
  if (validDashboard(cached)) return cached;

  try {
    const fresh = await loadOnce(freshKey, loader);
    await Promise.all([
      store.set(freshKey, fresh, { ttl: BASE_TTL_SECONDS }),
      store.set(staleKey, fresh, { ttl: MAX_BASE_AGE_SECONDS }),
    ]);
    return fresh;
  } catch (error) {
    const stale = await store.get(staleKey);
    if (validDashboard(stale)) {
      return {
        ...stale,
        stale: true,
        notices: [
          ...stale.notices,
          'The provider is unavailable. Showing the last saved feed.',
        ],
      };
    }
    throw error;
  }
}

export async function cachedLiveFixture(
  fixtureId: string,
  loader: () => Promise<Fixture>,
  store: CacheStore = runtimeCache(),
): Promise<Fixture> {
  const prefix = `barca:api-football:live:v2:${fixtureId}`;
  const freshKey = `${prefix}:fresh`;
  const staleKey = `${prefix}:stale`;
  const cached = await store.get(freshKey);
  if (validFixture(cached)) return cached;

  try {
    const fresh = await loadOnce(freshKey, loader);
    const isFinal = finalStatuses.includes(fresh.status);
    await Promise.all([
      store.set(freshKey, fresh, {
        ttl: isFinal ? LIVE_FINAL_TTL_SECONDS : LIVE_TTL_SECONDS,
      }),
      store.set(staleKey, fresh, {
        ttl: isFinal ? LIVE_FINAL_TTL_SECONDS : MAX_LIVE_AGE_SECONDS,
      }),
    ]);
    return fresh;
  } catch (error) {
    const stale = await store.get(staleKey);
    if (validFixture(stale)) return stale;
    throw error;
  }
}
