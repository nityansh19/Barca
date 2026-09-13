export const runtime = 'nodejs';

export function GET() {
  return Response.json({
    status: 'ok',
    dataMode: process.env.FOOTBALL_DATA_MODE ?? 'demo',
    providerConfigured: !!process.env.API_FOOTBALL_KEY,
    scheduledNotifications: false,
    version: '0.4.0',
    platform: process.env.VERCEL ? 'vercel' : 'local',
  });
}
