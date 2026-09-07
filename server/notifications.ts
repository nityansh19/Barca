import type { Fixture, Preferences } from '../shared/domain';

export type Reminder = {
  id: string;
  fixtureId: string;
  kind: 'match-day' | 'pre-match';
  kickoff: string;
  title: string;
  body: string;
};
export type Subscription = {
  id: string;
  timeZone: string;
  preferences: Preferences;
};

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return {
    day: `${part('year')}-${part('month')}-${part('day')}`,
    hour: Number(part('hour')),
  };
}

/** Pure worker core. Caller supplies a durable sent-ID store and calls this every minute.
 * No timers or notifications are run by importing this module. Never use demo fixtures in a live worker.
 */
export function dueReminders(
  fixtures: Fixture[],
  subscriber: Subscription,
  now: Date,
  sentIds: ReadonlySet<string>,
): Reminder[] {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid current time');
  const localNow = localParts(now, subscriber.timeZone); // Reject invalid IANA zones.
  const output: Reminder[] = [];
  const emitted = new Set(sentIds);
  for (const fixture of fixtures) {
    if (fixture.status !== 'scheduled' || !fixture.kickoff) continue;
    const kickoff = new Date(fixture.kickoff);
    const until = kickoff.getTime() - now.getTime();
    if (!Number.isFinite(until) || until <= 0) continue;
    const time = new Intl.DateTimeFormat('en', {
      timeZone: subscriber.timeZone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(kickoff);
    const add = (kind: Reminder['kind']) => {
      // Version by kickoff so rescheduled fixtures have fresh reminder identities.
      const id = `${subscriber.id}:${fixture.id}:${kickoff.toISOString()}:${kind}`;
      if (emitted.has(id)) return;
      emitted.add(id);
      output.push({
        id,
        fixtureId: fixture.id,
        kind,
        kickoff: kickoff.toISOString(),
        title:
          kind === 'match-day' ? 'It’s Barça match day' : 'Barça kick off soon',
        body: `Barcelona ${fixture.home ? 'vs' : 'at'} ${fixture.opponent} · ${time}`,
      });
    };
    const lead = subscriber.preferences.minutesBefore * 60000;
    if (
      subscriber.preferences.beforeMatch &&
      until <= lead &&
      until > lead - 5 * 60000
    ) {
      add('pre-match');
      continue; // Do not send both reminder types in the same polling pass.
    }
    if (
      subscriber.preferences.matchDay &&
      localNow.day === localParts(kickoff, subscriber.timeZone).day &&
      localNow.hour >= 9 &&
      until > 60 * 60000
    )
      add('match-day');
  }
  return output;
}
