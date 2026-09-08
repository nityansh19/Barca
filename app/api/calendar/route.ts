import { getDashboard } from '../../../server/dashboard';
import { createCalendar } from '../../../shared/calendar';
export async function GET(request: Request) {
  const url = new URL(request.url),
    fixtureId = url.searchParams.get('fixture'),
    minutes = Number(url.searchParams.get('minutes') ?? 60);
  if (![15, 30, 60].includes(minutes))
    return Response.json(
      { error: 'Choose a 15, 30 or 60 minute reminder.' },
      { status: 400 },
    );
  try {
    const feed = await getDashboard();
    if (feed.stale)
      return Response.json(
        {
          error:
            'The schedule is out of date. Refresh before exporting a calendar.',
        },
        { status: 503 },
      );
    const fixtures = fixtureId
      ? feed.fixtures.filter((f) => f.id === fixtureId)
      : feed.fixtures;
    const scheduled = fixtures.filter(
      (f) =>
        f.status === 'scheduled' &&
        f.kickoff &&
        Date.parse(f.kickoff) > Date.now(),
    );
    if (!scheduled.length)
      return Response.json(
        { error: 'No future confirmed kickoff times to export.' },
        { status: 404 },
      );
    return new Response(
      createCalendar(scheduled, {
        demo: feed.mode === 'demo',
        minutes: minutes as 15 | 30 | 60,
        now: new Date(),
      }),
      {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition':
            'attachment; filename="barca-' +
            (feed.mode === 'demo' ? 'demo-' : '') +
            'matches.ics"',
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch {
    return Response.json(
      { error: 'The schedule could not be loaded. Please try again.' },
      { status: 503 },
    );
  }
}
