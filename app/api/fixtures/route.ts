import { dashboardResponse } from '../../../server/dashboard';
export function GET() {
  return dashboardResponse(({ players: _players, ...feed }) => feed);
}
