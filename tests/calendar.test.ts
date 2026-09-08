import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCalendar } from '../shared/calendar.ts';
import { planReminders } from '../shared/reminder-plan.ts';
import { defaultPreferences, type Fixture } from '../shared/domain.ts';
const f: Fixture = {
  id: '1',
  opponent: 'Athletic Club',
  code: 'ATH',
  home: true,
  competition: 'La Liga',
  kickoff: '2026-09-12T19:00:00Z',
  stadium: 'Camp Nou',
  status: 'scheduled',
};
const now = new Date('2026-09-08T12:00:00Z');
void test('demo exports carry a clear label and never include alarms', () => {
  const text = createCalendar([f], { demo: true, minutes: 60, now });
  assert.match(text, /\[DEMO\]/);
  assert.doesNotMatch(text, /VALARM/);
  assert.match(text, /DTSTART:20260912T190000Z/);
});
void test('live export includes selected reminder; invalid schedules do not become events', () => {
  const text = createCalendar(
    [
      f,
      { ...f, id: '2', status: 'postponed' },
      { ...f, id: '3', kickoff: null },
    ],
    { demo: false, minutes: 30, now },
  );
  assert.match(text, /TRIGGER:-PT30M/);
  assert.equal(text.match(/BEGIN:VEVENT/g)?.length, 1);
});
void test('calendar text cannot inject properties and Unicode lines obey folding limits', () => {
  const text = createCalendar(
    [{ ...f, opponent: 'Barcelona\r\nBEGIN:VEVENT;evil,' + 'é'.repeat(100) }],
    { demo: true, minutes: 15, now },
  );
  assert.equal(text.match(/BEGIN:VEVENT\r\n/g)?.length, 1);
  for (const line of text.split('\r\n'))
    assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.match(text, /\\nBEGIN:VEVENT\\;evil\\,/);
});
void test('early local kickoff only has the pre-match reminder', () => {
  const plan = planReminders([f], defaultPreferences, 'Asia/Kolkata', now);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].at, '2026-09-12T18:00:00.000Z');
});
void test('morning plans respect daylight saving time', () => {
  const plan = planReminders(
    [{ ...f, kickoff: '2026-10-25T20:00:00Z' }],
    defaultPreferences,
    'Europe/Madrid',
    now,
  );
  assert.equal(plan[0].at, '2026-10-25T08:00:00.000Z');
  assert.equal(plan[0].kind, 'match-day');
});
void test('disabled and past reminders do not appear', () => {
  assert.equal(
    planReminders(
      [f],
      { ...defaultPreferences, matchDay: false, beforeMatch: false },
      'UTC',
      now,
    ).length,
    0,
  );
  assert.equal(
    planReminders([f], defaultPreferences, 'UTC', new Date('2026-10-01'))
      .length,
    0,
  );
});
