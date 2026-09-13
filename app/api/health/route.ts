export const runtime = 'nodejs';

export function GET() {
  const dataMode = (process.env.FOOTBALL_DATA_MODE ?? 'demo').trim().toLowerCase();
  const providerConfigured = Boolean(process.env.API_FOOTBALL_KEY?.trim());

  return Response.json({
    status: 'ok',
    dataMode,
    providerConfigured,
    scheduledNotifications: false,
    version: '0.4.1',
    platform: process.env.VERCEL ? 'vercel' : 'local',
  });
}
