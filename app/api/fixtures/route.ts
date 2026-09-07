import { demoFixtures } from '../../../shared/demo';
export function GET() {
  return Response.json(
    {
      mode: 'demo',
      source: 'Illustrative sample data',
      fixtures: demoFixtures,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
