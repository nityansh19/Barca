import { dashboardResponse } from '../../../server/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return dashboardResponse();
}
