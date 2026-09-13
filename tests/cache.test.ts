import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_TTL_SECONDS,
  LIVE_FINAL_TTL_SECONDS,
  LIVE_TTL_SECONDS,
  MAX_BASE_AGE_SECONDS,
  cachedDashboard,
  cachedLiveFixture,
  type CacheStore,
} from '../server/feed-cache.ts';
import type { Fixture } from '../shared/domain.ts';
import type { DashboardFeed } from '../shared/feed.ts';

const now = Date.parse('2026-09-08T12:00:00Z');
const feed: DashboardFeed = {
  mode: 'live',
  source: 'Test provider',
  fetchedAt: new Date(now).toISOString(),
  stale: false,
  season: 2026,
  fixtures: [],
  players: [],
  notices: [],
};
const liveFixture: Fixture = {
  id: '5',
  opponent: 'Opponent',
  code: 'OPP',
  home: false,
  competition: 'League',
  kickoff: new Date(now).toISOString(),
  stadium: 'Ground',
  status: 'live',
  score: [1, 0],
  minute: 20,
};

type RecordValue = { value: unknown; expiresAt: number };
class FakeCache implements CacheStore {
  now = 0;
  records = new Map<string, RecordValue>();

  advance(seconds: number) {
    this.now += seconds * 1000;
  }

  async get(key: string) {
    const record = this.records.get(key);
    if (!record) return null;
    if (this.now >= record.expiresAt) {
      this.records.delete(key);
      return null;
    }
    return record.value;
  }

  async set(key: string, value: unknown, options: { ttl: number }) {
    this.records.set(key, {
      value,
      expiresAt: this.now + options.ttl * 1000,
    });
  }
}

void test('base cache reuses fresh data and falls back to saved data on provider failure', async () => {
  const cache = new FakeCache();
  let calls = 0;
  const loader = async () => {
    calls++;
    return feed;
  };
  await cachedDashboard(2026, loader, cache);
  await cachedDashboard(2026, loader, cache);
  assert.equal(calls, 1);

  cache.advance(BASE_TTL_SECONDS + 1);
  const saved = await cachedDashboard(
    2026,
    async () => {
      throw Error('provider offline');
    },
    cache,
  );
  assert.equal(saved.stale, true);
  assert.equal(saved.fetchedAt, feed.fetchedAt);

  cache.advance(MAX_BASE_AGE_SECONDS - BASE_TTL_SECONDS + 1);
  await assert.rejects(
    cachedDashboard(
      2026,
      async () => {
        throw Error('offline');
      },
      cache,
    ),
  );
});

void test('cold provider failure does not replace live mode with demo records', async () => {
  const cache = new FakeCache();
  await assert.rejects(
    cachedDashboard(
      2026,
      async () => {
        throw Error('quota');
      },
      cache,
    ),
  );
});

void test('concurrent base reads share one in-process provider request', async () => {
  const cache = new FakeCache();
  let calls = 0;
  const loader = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return feed;
  };
  const results = await Promise.all([
    cachedDashboard(2026, loader, cache),
    cachedDashboard(2026, loader, cache),
  ]);
  assert.equal(calls, 1);
  assert.equal(results.length, 2);
});

void test('live fixture cache refreshes every three minutes and holds final results', async () => {
  const cache = new FakeCache();
  let calls = 0;
  const loader = async () => {
    calls++;
    return liveFixture;
  };

  await cachedLiveFixture(liveFixture.id, loader, cache);
  cache.advance(LIVE_TTL_SECONDS - 1);
  await cachedLiveFixture(liveFixture.id, loader, cache);
  assert.equal(calls, 1);

  cache.advance(2);
  await cachedLiveFixture(liveFixture.id, loader, cache);
  assert.equal(calls, 2);

  const finalFixture: Fixture = {
    ...liveFixture,
    id: 'final',
    status: 'finished',
    minute: undefined,
  };
  await cachedLiveFixture(
    finalFixture.id,
    async () => {
      calls++;
      return finalFixture;
    },
    cache,
  );
  cache.advance(LIVE_FINAL_TTL_SECONDS - 1);
  await cachedLiveFixture(
    finalFixture.id,
    async () => {
      calls++;
      return finalFixture;
    },
    cache,
  );
  assert.equal(calls, 3);
});
