export function GET() {
  return Response.json({
    status: 'ok',
    dataMode: 'demo',
    scheduledNotifications: false,
    version: '0.1.0',
  });
}
