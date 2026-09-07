import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueReminders } from '../server/notifications.ts';
import {
  defaultPreferences,
  parsePreferences,
  type Fixture,
} from '../shared/domain.ts';
const fixture: Fixture = {
  id: '1',
  opponent: 'Athletic Club',
  code: 'ATH',
  home: true,
  competition: 'La Liga',
  kickoff: '2026-09-12T19:00:00Z',
  stadium: 'Test stadium',
  status: 'scheduled',
};
const sub = {
  id: 'fan-1',
  timeZone: 'Asia/Kolkata',
  preferences: { ...defaultPreferences },
};
const run = (date: string, fixtures = [fixture], sent = new Set<string>()) =>
  dueReminders(fixtures, sub, new Date(date), sent);
void test('pre-match reminder is due in its retry window and deduplicates', () => {
  const reminders = run('2026-09-12T18:00:00Z');
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].kind, 'pre-match');
  assert.equal(
    run('2026-09-12T18:01:00Z', [fixture], new Set([reminders[0].id])).length,
    0,
  );
});
void test('match-day uses the fan’s date, including matches after local midnight', () => {
  assert.equal(run('2026-09-12T04:00:00Z').length, 0); // Match is September 13 in India.
  const earlyFixture = { ...fixture, kickoff: '2026-09-12T16:00:00Z' };
  assert.equal(
    run('2026-09-12T04:00:00Z', [earlyFixture])[0].kind,
    'match-day',
  );
});
void test('postponed, cancelled, finished, unknown and invalid kickoff never alert', () => {
  const cases = [
    { ...fixture, status: 'postponed' as const },
    { ...fixture, status: 'cancelled' as const },
    { ...fixture, status: 'finished' as const },
    { ...fixture, kickoff: null },
    { ...fixture, kickoff: 'invalid' },
  ];
  assert.equal(run('2026-09-12T18:00:00Z', cases).length, 0);
  assert.equal(run('2026-09-12T19:00:00Z').length, 0);
});
void test('rescheduling invalidates the old due time and gets a new reminder identity', () => {
  const old = run('2026-09-12T18:00:00Z')[0];
  const changed = { ...fixture, kickoff: '2026-09-12T20:00:00Z' };
  assert.equal(run('2026-09-12T18:00:00Z', [changed]).length, 0);
  assert.notEqual(
    run('2026-09-12T19:00:00Z', [changed], new Set([old.id]))[0].id,
    old.id,
  );
});
void test('a delayed worker does not send an obsolete pre-match reminder', () => {
  assert.equal(run('2026-09-12T18:20:00Z').length, 0);
});
void test('duplicate provider rows do not duplicate reminders', () => {
  assert.equal(run('2026-09-12T18:00:00Z', [fixture, fixture]).length, 1);
});
void test('disabled notifications and invalid timezones are respected', () => {
  assert.equal(
    dueReminders(
      [fixture],
      {
        ...sub,
        preferences: {
          ...defaultPreferences,
          beforeMatch: false,
          matchDay: false,
        },
      },
      new Date('2026-09-12T18:00:00Z'),
      new Set(),
    ).length,
    0,
  );
  assert.throws(
    () =>
      dueReminders(
        [fixture],
        { ...sub, timeZone: 'not-a-zone' },
        new Date(),
        new Set(),
      ),
    RangeError,
  );
});
void test('persisted settings reject unsupported values', () => {
  assert.deepEqual(
    parsePreferences({
      minutesBefore: -100,
      matchDay: 'true',
      spoilerFree: true,
    }),
    { ...defaultPreferences, spoilerFree: true },
  );
});
