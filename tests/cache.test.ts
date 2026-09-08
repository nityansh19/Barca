import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { cachedDashboard } from '../server/feed-cache.ts';
import type { DashboardFeed } from '../shared/feed.ts';
const hour = 3600000,
  now = Date.parse('2026-09-08T12:00:00Z');
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
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(
      new URL('../drizzle/0000_feed_cache.sql', import.meta.url),
      'utf8',
    ),
  );
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: (string | number | null)[]) {
          return {
            async first<T>() {
              return (
                (sqlite.prepare(sql).get(...values) as T | undefined) ?? null
              );
            },
            async run() {
              sqlite.prepare(sql).run(...values);
              return {};
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { sqlite, db };
}
void test('cache reuses fresh data and keeps original freshness on failed refresh', async () => {
  const { sqlite, db } = setup();
  let calls = 0;
  const loader = async () => {
    calls++;
    return feed;
  };
  try {
    await cachedDashboard(db, 2026, loader, now);
    await cachedDashboard(db, 2026, loader, now + 1000);
    assert.equal(calls, 1);
    const saved = await cachedDashboard(
      db,
      2026,
      async () => {
        throw Error('provider offline');
      },
      now + hour,
    );
    assert.equal(saved.stale, true);
    assert.equal(saved.fetchedAt, feed.fetchedAt);
    await assert.rejects(
      cachedDashboard(
        db,
        2026,
        async () => {
          throw Error('offline');
        },
        now + 25 * hour,
      ),
    );
  } finally {
    sqlite.close();
  }
});
void test('atomic refresh lease prevents duplicate provider calls', async () => {
  const { sqlite, db } = setup();
  let calls = 0;
  try {
    const results = await Promise.allSettled([
      cachedDashboard(
        db,
        2026,
        async () => {
          calls++;
          return feed;
        },
        now,
      ),
      cachedDashboard(
        db,
        2026,
        async () => {
          calls++;
          return feed;
        },
        now,
      ),
    ]);
    assert.equal(calls, 1);
    assert.ok(results.some((r) => r.status === 'fulfilled'));
  } finally {
    sqlite.close();
  }
});
void test('cold failure backs off without replacing real data with demo records', async () => {
  const { sqlite, db } = setup();
  let calls = 0;
  const loader = async () => {
    calls++;
    throw Error('quota');
  };
  try {
    await assert.rejects(cachedDashboard(db, 2026, loader, now));
    await assert.rejects(cachedDashboard(db, 2026, loader, now + 1000));
    assert.equal(calls, 1);
    const data = await cachedDashboard(db, 2026, async () => feed, now + 60000);
    assert.equal(data.mode, 'live');
  } finally {
    sqlite.close();
  }
});
void test('cache reads use the primary-key index', () => {
  const { sqlite } = setup();
  try {
    const plan = sqlite
      .prepare('EXPLAIN QUERY PLAN SELECT payload FROM feed_cache WHERE key=?')
      .all('key');
    assert.match(JSON.stringify(plan), /USING INDEX/);
  } finally {
    sqlite.close();
  }
});
