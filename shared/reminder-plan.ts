import type { Fixture, Preferences } from './domain.ts';
export type PlannedReminder = {
  fixtureId: string;
  opponent: string;
  kind: 'match-day' | 'pre-match';
  at: string;
};
function morning(kickoff: Date, timeZone: string): Date | null {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = (d: Date) => {
    const p = formatter.formatToParts(d);
    const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
    return {
      y: get('year'),
      m: get('month'),
      d: get('day'),
      h: get('hour'),
      min: get('minute'),
      s: get('second'),
    };
  };
  const k = parts(kickoff),
    target = Date.UTC(k.y, k.m - 1, k.d, 9);
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const p = parts(new Date(guess));
    guess += target - Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  }
  const actual = parts(new Date(guess));
  return actual.y === k.y &&
    actual.m === k.m &&
    actual.d === k.d &&
    actual.h === 9 &&
    actual.min === 0
    ? new Date(guess)
    : null;
}
export function planReminders(
  fixtures: Fixture[],
  preferences: Preferences,
  timeZone: string,
  now: Date,
): PlannedReminder[] {
  new Intl.DateTimeFormat('en', { timeZone });
  const result: PlannedReminder[] = [];
  const seen = new Set<string>();
  for (const f of fixtures) {
    if (
      f.status !== 'scheduled' ||
      !f.kickoff ||
      !Number.isFinite(Date.parse(f.kickoff))
    )
      continue;
    const kickoff = new Date(f.kickoff);
    const add = (kind: PlannedReminder['kind'], at: Date) => {
      const key = f.id + kind;
      if (at.getTime() > now.getTime() && !seen.has(key)) {
        seen.add(key);
        result.push({
          fixtureId: f.id,
          opponent: f.opponent,
          kind,
          at: at.toISOString(),
        });
      }
    };
    if (preferences.matchDay) {
      const at = morning(kickoff, timeZone);
      if (at && kickoff.getTime() - at.getTime() > 3600000)
        add('match-day', at);
    }
    if (preferences.beforeMatch)
      add(
        'pre-match',
        new Date(kickoff.getTime() - preferences.minutesBefore * 60000),
      );
  }
  return result.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
