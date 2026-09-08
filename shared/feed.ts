import type { Fixture, Player } from './domain';
export type DashboardFeed = {
  mode: 'demo' | 'live';
  source: string;
  fetchedAt: string;
  stale: boolean;
  season: number;
  fixtures: Fixture[];
  players: Player[];
  notices: string[];
};
export function seasonFor(date: Date) {
  return date.getUTCFullYear() - (date.getUTCMonth() < 6 ? 1 : 0);
}
export function sortedFixtures(fixtures: Fixture[]) {
  return [...fixtures].sort(
    (a, b) =>
      (a.kickoff ? Date.parse(a.kickoff) : Infinity) -
      (b.kickoff ? Date.parse(b.kickoff) : Infinity),
  );
}
export function searchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
export function filterFixtures(
  fixtures: Fixture[],
  filter: { tab: string; competition: string; query: string },
) {
  const result = sortedFixtures(fixtures).filter(
    (f) =>
      (filter.tab === 'Results'
        ? f.status === 'finished'
        : filter.tab === 'Live'
          ? f.status === 'live'
          : f.status !== 'finished' && f.status !== 'live') &&
      (filter.competition === 'All competitions' ||
        f.competition === filter.competition) &&
      searchText(f.opponent + ' ' + f.competition).includes(
        searchText(filter.query.trim()),
      ),
  );
  return filter.tab === 'Results' ? result.reverse() : result;
}
