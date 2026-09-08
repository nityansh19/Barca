import { env } from 'cloudflare:workers';
export function GET() {
  const runtime = env as {
    FOOTBALL_DATA_MODE?: string;
    API_FOOTBALL_KEY?: string;
  };
  return Response.json({
    status: 'ok',
    dataMode: runtime.FOOTBALL_DATA_MODE ?? 'demo',
    providerConfigured: !!runtime.API_FOOTBALL_KEY,
    scheduledNotifications: false,
    version: '0.2.0',
  });
}
