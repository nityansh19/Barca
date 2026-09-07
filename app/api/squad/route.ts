import { demoPlayers } from '../../../shared/demo';
export function GET() {
  return Response.json(
    {
      mode: 'demo',
      source: 'Illustrative sample data; availability unverified',
      players: demoPlayers,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
