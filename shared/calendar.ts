import type { Fixture } from './domain.ts';
function escapeText(value: string) {
  return (
    value
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      // Calendar text must not contain raw control characters.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  );
}
function date(value: string | Date) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}
function fold(line: string) {
  const encoder = new TextEncoder();
  let current = '',
    size = 0;
  const lines: string[] = [];
  for (const c of line) {
    const bytes = encoder.encode(c).length;
    if (size + bytes > 75) {
      lines.push(current);
      current = ' ';
      size = 1;
    }
    current += c;
    size += bytes;
  }
  lines.push(current);
  return lines.join('\r\n');
}
export function createCalendar(
  fixtures: Fixture[],
  options: { demo: boolean; minutes: 15 | 30 | 60; now: Date },
) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barca Fan Companion//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const f of fixtures) {
    if (
      f.status !== 'scheduled' ||
      !f.kickoff ||
      !Number.isFinite(Date.parse(f.kickoff)) ||
      Date.parse(f.kickoff) <= options.now.getTime()
    )
      continue;
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + encodeURIComponent(f.id) + '@barca-fan-companion',
      'DTSTAMP:' + date(options.now),
      'DTSTART:' + date(f.kickoff),
      'SUMMARY:' +
        escapeText(
          (options.demo ? '[DEMO] ' : '') +
            'Barcelona ' +
            (f.home ? 'vs ' : 'at ') +
            f.opponent,
        ),
      'LOCATION:' + escapeText(f.stadium),
      'DESCRIPTION:' +
        escapeText(
          options.demo
            ? 'Illustrative fixture. Not a real schedule. No reminder alarm is included.'
            : f.competition +
                '. One-time calendar export. Kickoff changes will not update automatically; check the app before the match.',
        ),
      'STATUS:CONFIRMED',
    );
    if (!options.demo)
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Barcelona match reminder',
        'TRIGGER:-PT' + options.minutes + 'M',
        'END:VALARM',
      );
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
