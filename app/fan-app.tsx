'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { flushSync } from 'react-dom';
import { registerNavigation } from './webmcp';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  Home,
  MapPin,
  Newspaper,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { officialLinks } from '../shared/demo';
import { filterFixtures, sortedFixtures, searchText } from '../shared/feed';
import { planReminders } from '../shared/reminder-plan';
import { useDashboard } from './use-dashboard';
import {
  defaultPreferences,
  parsePreferences,
  type Fixture,
  type Player,
  type Preferences,
} from '../shared/domain';

type View = 'Home' | 'Matches' | 'Squad' | 'Updates' | 'Reminders';
const navigation = [
  { name: 'Home', icon: Home },
  { name: 'Matches', icon: CalendarDays },
  { name: 'Squad', icon: Users },
  { name: 'Updates', icon: Newspaper },
  { name: 'Reminders', icon: Bell },
] as const;
const storageKey = 'barca.preferences.v1';
function when(kickoff: string | null, zone = 'UTC') {
  return kickoff
    ? new Intl.DateTimeFormat('en', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: zone,
      }).format(new Date(kickoff))
    : 'Kickoff to be confirmed';
}
function Badge({ code, barca = false }: { code: string; barca?: boolean }) {
  return (
    <span className={`club-badge ${barca ? 'barca-badge' : ''}`}>{code}</span>
  );
}

export default function FanApp() {
  const [view, setView] = useState<View>('Home');
  const { feed, error: feedError, loading, refresh } = useDashboard();
  const fixtures = sortedFixtures(feed?.fixtures ?? []);
  const players = feed?.players ?? [];
  const [query, setQuery] = useState('');
  const [favourites, setFavourites] = useState<string[]>([]);
  const [onlyFavourites, setOnlyFavourites] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const lastResult = [...fixtures]
    .reverse()
    .find((f) => f.status === 'finished');
  const isDemo = feed?.mode === 'demo';
  const [zone, setZone] = useState('UTC');
  const [now, setNow] = useState<number | null>(null);
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);
  const [message, setMessage] = useState('');
  const [competition, setCompetition] = useState('All competitions');
  const [matchTab, setMatchTab] = useState('Upcoming');
  const [position, setPosition] = useState('All players');
  const [selectedMatch, setSelectedMatch] = useState<Fixture | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(
    () => registerNavigation((nextView) => flushSync(() => setView(nextView))),
    [],
  );
  useEffect(() => {
    // Hydrate device-local time and preferences after SSR; server values must remain deterministic.
    // eslint-disable-next-line react/react-compiler
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setNow(Date.now());
    try {
      const saved = JSON.parse(
        localStorage.getItem('barca.favourites.v1') ?? '[]',
      );
      if (Array.isArray(saved))
        setFavourites(
          saved.filter((id): id is string => typeof id === 'string'),
        );
    } catch {
      /* Local preference only. */
    }
    try {
      setPreferences(
        parsePreferences(
          JSON.parse(localStorage.getItem(storageKey) ?? 'null'),
        ),
      );
    } catch {
      /* Use defaults when storage is unavailable. */
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (selectedMatch || selectedPlayer) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selectedMatch, selectedPlayer]);
  const upcoming = fixtures.filter(
    (f) =>
      f.status === 'scheduled' &&
      (!f.kickoff || now === null || Date.parse(f.kickoff) > now),
  );
  const next = upcoming.find((f) => f.kickoff);
  const remaining =
    next?.kickoff && now !== null
      ? Math.max(0, Date.parse(next.kickoff) - now)
      : null;
  const countdown =
    remaining === null
      ? ['—', '—', '—']
      : [
          Math.floor(remaining / 86400000),
          Math.floor(remaining / 3600000) % 24,
          Math.floor(remaining / 60000) % 60,
        ].map((n) => String(n).padStart(2, '0'));
  function change<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setMessage(
        'Settings saved on this device. Automatic delivery is not connected yet.',
      );
    } catch {
      setMessage('Settings changed, but browser storage is unavailable.');
    }
  }
  function closeDetails() {
    setSelectedMatch(null);
    setSelectedPlayer(null);
    history.replaceState(null, '', location.pathname + location.search);
  }
  async function testNotification() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setMessage('This browser does not support this notification test.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage(
          'Notifications are blocked. You can change this in your browser’s site settings.',
        );
        return;
      }
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Barça · Test reminder', {
        body: 'Your browser can display reminders. Automatic match alerts still need the live notification service.',
        tag: 'barca-test',
      });
      setMessage('Test sent. This does not enable automatic match alerts yet.');
    } catch {
      setMessage(
        'The test could not be delivered. Check browser support and site permissions.',
      );
    }
  }
  function fixtureRow(f: Fixture) {
    return (
      <button
        className="fixture-row"
        key={f.id}
        onClick={() => setSelectedMatch(f)}
      >
        <span className="fixture-date">
          {f.kickoff
            ? new Intl.DateTimeFormat('en', {
                month: 'short',
                day: '2-digit',
                timeZone: zone,
              }).format(new Date(f.kickoff))
            : 'TBC'}
          <small>{f.home ? 'HOME' : 'AWAY'}</small>
        </span>
        <Badge code={f.code} />
        <span className="fixture-name">
          <strong>{f.opponent}</strong>
          <small>
            {f.competition} · {f.home ? 'Home' : 'Away'}
          </small>
        </span>
        <span className="fixture-time">
          {f.score
            ? preferences.spoilerFree
              ? 'Hidden'
              : `${f.score[0]} – ${f.score[1]}`
            : f.kickoff
              ? new Intl.DateTimeFormat('en', {
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: zone,
                }).format(new Date(f.kickoff))
              : 'TBC'}
        </span>
        <ChevronRight size={17} />
      </button>
    );
  }
  const filteredMatches = filterFixtures(fixtures, {
    tab: matchTab,
    competition,
    query,
  });
  const visiblePlayers = players.filter(
    (p) =>
      (position === 'All players' || p.position === position) &&
      (!onlyFavourites || favourites.includes(p.id)) &&
      searchText(p.name).includes(searchText(query.trim())),
  );
  const reminderPreview =
    now === null
      ? []
      : planReminders(fixtures, preferences, zone, new Date(now)).slice(0, 5);
  useEffect(() => {
    if (!feed) return;
    const openHash = () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const match = feed.fixtures.find((f) => f.id === params.get('match'));
      const player = feed.players.find((p) => p.id === params.get('player'));
      if (match) {
        setSelectedPlayer(null);
        setSelectedMatch(match);
      } else if (player) {
        setSelectedMatch(null);
        setSelectedPlayer(player);
      } else if (params.has('match') || params.has('player'))
        setActionMessage('This shared item is not in the current feed.');
    };
    openHash();
    window.addEventListener('hashchange', openHash);
    return () => window.removeEventListener('hashchange', openHash);
  }, [feed]);
  function toggleFavourite(id: string) {
    const next = favourites.includes(id)
      ? favourites.filter((p) => p !== id)
      : [...favourites, id];
    setFavourites(next);
    try {
      localStorage.setItem('barca.favourites.v1', JSON.stringify(next));
      setActionMessage('Favourite players saved on this device.');
    } catch {
      setActionMessage(
        'Favourite changed for this session; device storage is unavailable.',
      );
    }
  }
  async function shareDetails() {
    const url = new URL(window.location.href);
    url.hash = selectedMatch
      ? 'match=' + encodeURIComponent(selectedMatch.id)
      : 'player=' + encodeURIComponent(selectedPlayer?.id ?? '');
    try {
      await navigator.clipboard.writeText(url.toString());
      setActionMessage('Link copied.');
    } catch {
      setActionMessage('Copy this link: ' + url.toString());
    }
  }
  async function downloadCalendar(fixtureId?: string) {
    setActionMessage('Preparing calendar…');
    try {
      const params = new URLSearchParams({
        minutes: String(preferences.minutesBefore),
      });
      if (fixtureId) params.set('fixture', fixtureId);
      const response = await fetch('/api/calendar?' + params);
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? 'Calendar export failed.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = isDemo ? 'barca-demo.ics' : 'barca-matches.ics';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setActionMessage(
        isDemo
          ? 'Demo calendar downloaded. It contains sample matches and no alarms.'
          : 'Calendar downloaded. Imported events do not update automatically when kickoff changes.',
      );
    } catch (e) {
      setActionMessage(
        e instanceof Error ? e.message : 'Calendar export failed.',
      );
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="wordmark" href="/" aria-label="Barça home">
          <span className="brand-mark">b.</span>barça
          <span className="brand-dot">•</span>
        </Link>
        <p className="nav-caption">THE FAN COMPANION</p>
        <nav aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={view === name ? 'nav-item active' : 'nav-item'}
              aria-current={view === name ? 'page' : undefined}
              onClick={() => {
                setView(name);
                setMessage('');
                setQuery('');
                setActionMessage('');
              }}
            >
              <Icon size={20} />
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="stripe" />
          <strong>Blaugrana, always.</strong>
          <p>
            Independent fan project.
            <br />
            Not affiliated with FC Barcelona.
          </p>
          <span className="version">EARLY ACCESS · V0.1</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            FC BARCELONA <span className="muted">/ MEN’S FIRST TEAM</span>
          </span>
          <button
            className="icon-button"
            aria-label="Open reminder settings"
            onClick={() => setView('Reminders')}
          >
            <Bell size={20} />
          </button>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR CLUB. YOUR CORNER.</p>
              <h1>
                {view === 'Home'
                  ? 'Visca el Barça.'
                  : view === 'Reminders'
                    ? 'Never miss a match.'
                    : view === 'Squad'
                      ? 'The blaugrana.'
                      : view === 'Matches'
                        ? 'Every match. One club.'
                        : 'Around the club.'}
              </h1>
            </div>
            <span className="season-pill">
              {feed
                ? feed.season + ' / ' + String(feed.season + 1).slice(-2)
                : 'Loading…'}
            </span>
          </div>
          <div className="feed-toolbar">
            <div className="demo-notice">
              <span className="demo-dot" />
              <strong>
                {loading && !feed
                  ? 'Loading feed'
                  : isDemo
                    ? 'Demo preview'
                    : feed?.stale
                      ? 'Saved feed'
                      : feed
                        ? 'Provider connected'
                        : 'Feed unavailable'}
              </strong>
              <span>
                {feed?.notices[0] ?? 'Loading fixtures and the squad…'}
              </span>
            </div>
            <button
              className="secondary-button"
              disabled={loading}
              onClick={() => {
                void refresh();
              }}
            >
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>
          </div>
          {feed && (
            <p className="feed-meta">
              {feed.source} ·{' '}
              {isDemo
                ? 'Sample season'
                : 'Updated ' + when(feed.fetchedAt, zone)}
            </p>
          )}
          {feedError && (
            <div role="alert" className="error-banner">
              {feedError}
              {feed ? ' The screen shows the last loaded data.' : ''}
            </div>
          )}
          <output className="action-message">{actionMessage}</output>
          {(view === 'Matches' || view === 'Squad') && (
            <label className="search-label">
              <span className="sr-only">
                Search{' '}
                {view === 'Matches' ? 'opponents or competitions' : 'players'}
              </span>
              <input
                className="search-input"
                type="search"
                placeholder={
                  view === 'Matches'
                    ? 'Search opponent or competition…'
                    : 'Search a player…'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          )}
          {view === 'Home' && (
            <>
              <div className="dashboard-grid">
                <section className="next-match">
                  <div className="card-heading">
                    <span className="eyebrow">NEXT MATCH</span>
                    <span className="competition-pill">
                      {next?.competition ?? 'Fixtures'}
                    </span>
                  </div>
                  {next ? (
                    <>
                      <div className="match-teams">
                        <div>
                          <Badge code="BAR" barca />
                          <h2>FC Barcelona</h2>
                          <span>{next.home ? 'HOME' : 'AWAY'}</span>
                        </div>
                        <span className="versus">vs</span>
                        <div>
                          <Badge code={next.code} />
                          <h2>{next.opponent}</h2>
                          <span>{next.home ? 'AWAY' : 'HOME'}</span>
                        </div>
                      </div>
                      <p className="match-location">
                        <MapPin size={15} />
                        {next.stadium}
                      </p>
                      <div className="kickoff">
                        <CalendarDays size={17} />
                        {when(next.kickoff, zone)}
                      </div>
                      <div className="match-bottom">
                        <div className="countdown">
                          {countdown.map((n, i) => (
                            <div key={i}>
                              <strong>{n ?? '—'}</strong>
                              <small>{['DAYS', 'HRS', 'MINS'][i]}</small>
                            </div>
                          ))}
                        </div>
                        <button
                          className="primary-button"
                          onClick={() => setView('Reminders')}
                        >
                          <Bell size={17} />
                          Set reminders
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      No upcoming dated fixture. Visit Matches for fixtures
                      awaiting a kickoff time.
                    </div>
                  )}
                </section>
                <aside className="right-stack">
                  <section className="panel result-card">
                    <p className="eyebrow">
                      LAST TIME OUT <span>{isDemo ? 'DEMO' : 'RESULT'}</span>
                    </p>
                    {lastResult ? (
                      <>
                        <div className="result">
                          <span>BAR</span>
                          <strong>
                            {preferences.spoilerFree
                              ? '•••'
                              : (lastResult.score?.join(' – ') ?? '—')}
                          </strong>
                          <span>{lastResult.code}</span>
                        </div>
                        <p>{lastResult.competition} · Full-time</p>
                        <button
                          className="text-link"
                          onClick={() => setSelectedMatch(lastResult)}
                        >
                          Match details <ArrowRight size={16} />
                        </button>
                      </>
                    ) : (
                      <p>No completed matches in this feed.</p>
                    )}
                  </section>
                  <section className="reminder-card">
                    <div className="bell-tile">
                      <Bell size={22} />
                    </div>
                    <h2>Be there for kickoff.</h2>
                    <p>
                      Choose your match-day reminders and test notifications on
                      this device.
                    </p>
                    <button
                      className="text-link"
                      onClick={() => setView('Reminders')}
                    >
                      Manage reminders <ArrowRight size={16} />
                    </button>
                  </section>
                </aside>
              </div>
              <div className="lower-grid">
                <section className="panel">
                  <div className="section-heading">
                    <h2>Coming up</h2>
                    <button
                      className="text-link"
                      onClick={() => setView('Matches')}
                    >
                      All matches <ArrowUpRight size={16} />
                    </button>
                  </div>
                  {upcoming.slice(1, 4).map(fixtureRow)}
                  <p className="timezone">
                    <Clock3 size={14} />
                    Times in {zone}
                  </p>
                </section>
                <section className="panel">
                  <div className="section-heading">
                    <h2>Squad spotlight</h2>
                    <button
                      className="text-link"
                      onClick={() => setView('Squad')}
                    >
                      View squad <ArrowUpRight size={16} />
                    </button>
                  </div>
                  {players.slice(0, 3).map((p) => (
                    <button
                      className="spotlight-row"
                      key={p.id}
                      onClick={() => setSelectedPlayer(p)}
                    >
                      <span className="shirt-number">{p.number ?? '—'}</span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.position}</small>
                      </span>
                      <span className="player-contribution">
                        <strong>
                          {p.goals === null || p.assists === null
                            ? '—'
                            : p.goals + p.assists}
                        </strong>
                        <small>G + A {isDemo ? '· demo' : ''}</small>
                      </span>
                    </button>
                  ))}
                </section>
              </div>
            </>
          )}
          {view === 'Matches' && (
            <section className="panel">
              <div className="section-heading">
                <div className="segmented">
                  {['Upcoming', 'Live', 'Results'].map((t) => (
                    <button
                      key={t}
                      className={matchTab === t ? 'selected' : ''}
                      aria-pressed={matchTab === t}
                      onClick={() => setMatchTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Filter competition"
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                >
                  {[
                    'All competitions',
                    ...new Set(fixtures.map((f) => f.competition)),
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button
                className="secondary-button calendar-button"
                disabled={
                  !feed ||
                  feed.stale ||
                  !!feedError ||
                  !upcoming.some((f) => f.kickoff)
                }
                onClick={() => {
                  void downloadCalendar();
                }}
              >
                {isDemo
                  ? 'Download demo calendar'
                  : 'Download upcoming matches'}
              </button>
              <p className="feed-meta">
                One-time calendar export.{' '}
                {isDemo
                  ? 'Sample matches; no reminder alarms.'
                  : 'Kickoff changes do not update imported events.'}
              </p>
              {filteredMatches.map(fixtureRow)}
              {!filteredMatches.length && (
                <p className="empty-state">No matches match these filters.</p>
              )}
              <p className="timezone">
                <Clock3 size={14} />
                Times in {zone}. Undated fixtures stay TBC.
              </p>
            </section>
          )}
          {view === 'Squad' && (
            <>
              <div className="section-heading">
                <p className="muted">
                  {isDemo
                    ? 'Sample player profiles · season statistics'
                    : 'Current registered squad · missing data shown as —'}
                </p>
                <select
                  aria-label="Filter players by position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  {[
                    'All players',
                    'Goalkeeper',
                    'Defender',
                    'Midfielder',
                    'Forward',
                  ].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="favourite-filter">
                <button
                  className="secondary-button"
                  aria-pressed={onlyFavourites}
                  onClick={() => setOnlyFavourites((v) => !v)}
                >
                  {onlyFavourites
                    ? '★ Favourites only'
                    : '☆ Show favourite players'}
                </button>
                <span>{favourites.length} saved on this device</span>
              </div>
              {!visiblePlayers.length && (
                <p className="empty-state">
                  No players match these filters. Open a player profile to add a
                  favourite.
                </p>
              )}
              <div className="player-grid">
                {visiblePlayers.map((p) => (
                  <button
                    className="player-card"
                    key={p.id}
                    onClick={() => setSelectedPlayer(p)}
                  >
                    <div className="player-art">
                      <span>{p.number ?? '—'}</span>
                      <Shield size={40} strokeWidth={1} />
                    </div>
                    <div className="player-info">
                      <span className="eyebrow">{p.position}</span>
                      <h2>{p.name}</h2>
                      <span className="status-pill">Availability unknown</span>
                      <div className="player-stats">
                        <span>
                          <strong>{p.appearances ?? '—'}</strong>Apps
                        </span>
                        <span>
                          <strong>{p.goals ?? '—'}</strong>Goals
                        </span>
                        <span>
                          <strong>{p.assists ?? '—'}</strong>Assists
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {view === 'Updates' && (
            <>
              <p className="intro-copy">
                Follow confirmed updates at the source. An automatic news feed
                is coming later.
              </p>
              <div className="updates-grid">
                {officialLinks.map((item, i) => (
                  <a
                    className="update-card"
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className={`update-art art-${i}`}>
                      <span>
                        {i === 0 ? 'MÉS QUE' : 'MATCH'}
                        <br />
                        {i === 0 ? 'UN CLUB.' : 'DAY.'}
                      </span>
                      <ArrowUpRight size={36} />
                    </div>
                    <div className="update-content">
                      <span className="eyebrow">
                        {item.category} · OFFICIAL SOURCE
                      </span>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <span className="text-link">
                        Read on fcbarcelona.com <ArrowUpRight size={16} />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
          {view === 'Reminders' && (
            <div className="settings-layout">
              <section className="panel settings-panel">
                <div className="section-heading">
                  <h2>Your match-day routine</h2>
                  <Bell size={20} />
                </div>
                <p className="settings-note">
                  Settings are saved on this device. Automatic delivery will
                  become available once the live feed and push service are
                  connected.
                </p>
                {(
                  [
                    {
                      key: 'matchDay',
                      title: 'Match-day reminder',
                      description: 'A heads-up on the day Barça play.',
                    },
                    {
                      key: 'beforeMatch',
                      title: 'Before kickoff',
                      description:
                        'A little time to settle in before the match.',
                    },
                    {
                      key: 'lineup',
                      title: 'Confirmed lineup',
                      description:
                        'When the official starting XI is published.',
                    },
                    {
                      key: 'spoilerFree',
                      title: 'Spoiler-free mode',
                      description: 'Hide scores throughout the app.',
                    },
                  ] as const
                ).map((s) => (
                  <label
                    className="setting-row"
                    key={s.key}
                    aria-label={s.title}
                  >
                    <span>
                      <strong>{s.title}</strong>
                      <small>{s.description}</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-checked={preferences[s.key]}
                      checked={preferences[s.key]}
                      onChange={(e) => change(s.key, e.target.checked)}
                    />
                  </label>
                ))}
                <label className="setting-row">
                  <span>
                    <strong>Reminder lead time</strong>
                    <small>Before the scheduled kickoff.</small>
                  </span>
                  <select
                    value={preferences.minutesBefore}
                    disabled={!preferences.beforeMatch}
                    onChange={(e) =>
                      change(
                        'minutesBefore',
                        Number(e.target.value) as 15 | 30 | 60,
                      )
                    }
                  >
                    {[15, 30, 60].map((n) => (
                      <option key={n} value={n}>
                        {n} minutes
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary-button test-button"
                  onClick={testNotification}
                >
                  <Bell size={17} />
                  Send a test notification
                </button>
                <output className="feedback">{message}</output>
              </section>
              <aside className="panel info-panel">
                <span className="eyebrow">ON YOUR TERMS</span>
                <h2>Only the alerts you want.</h2>
                <p>
                  Browser permission is requested only when you run the test.
                </p>
                <p>
                  Your settings stay on this device. Account sync and scheduled
                  delivery are planned for the next development phase.
                </p>
                <span className="status-pill">
                  Automatic alerts: not connected
                </span>
                <h3 className="preview-heading">Your reminder preview</h3>
                <p>
                  {isDemo
                    ? 'Illustrative timings only. Nothing is scheduled.'
                    : 'Planned timings only. Nothing is scheduled.'}
                </p>
                {reminderPreview.length ? (
                  reminderPreview.map((r) => (
                    <div className="preview-row" key={r.fixtureId + r.kind}>
                      <strong>{r.opponent}</strong>
                      <small>
                        {r.kind === 'match-day'
                          ? 'Match-day'
                          : 'Before kickoff'}{' '}
                        · {when(r.at, zone)}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>No future reminders with these settings.</p>
                )}
                <p className="feed-meta">
                  Morning reminders are at 09:00 local time, only when more than
                  an hour remains. Lineup alerts need the confirmed lineup feed.
                </p>
              </aside>
            </div>
          )}
          <footer>
            <span>Made for the culers.</span>
            <span>
              Independent fan project <span className="footer-dot">•</span>{' '}
              {isDemo ? 'Demo preview' : 'Football companion'}
            </span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="detail-panel"
        aria-labelledby="detail-title"
        onCancel={closeDetails}
        onClose={closeDetails}
      >
        <button
          className="close-button icon-button"
          aria-label="Close details"
          onClick={closeDetails}
        >
          <X />
        </button>
        <p className="eyebrow">
          {isDemo ? 'DEMO ' : ''}
          {selectedMatch ? 'MATCH CENTRE' : 'PLAYER PROFILE'}
        </p>
        <h2 id="detail-title">
          {selectedMatch
            ? `Barcelona ${selectedMatch.home ? 'vs' : 'at'} ${selectedMatch.opponent}`
            : selectedPlayer?.name}
        </h2>
        {selectedMatch ? (
          <>
            <p>
              {selectedMatch.competition} · {when(selectedMatch.kickoff, zone)}
            </p>
            <p>
              <MapPin size={16} /> {selectedMatch.stadium}
            </p>
            {selectedMatch.score && (
              <p className="detail-score">
                {preferences.spoilerFree
                  ? 'Score hidden — spoiler-free mode'
                  : `${selectedMatch.score[0]} – ${selectedMatch.score[1]}`}
              </p>
            )}
            <div className="detail-actions">
              <span className="status-pill">{selectedMatch.status}</span>
              <button
                className="secondary-button"
                onClick={() => {
                  void shareDetails();
                }}
              >
                Copy match link
              </button>
              <button
                className="secondary-button"
                disabled={
                  selectedMatch.status !== 'scheduled' ||
                  !selectedMatch.kickoff ||
                  !!feed?.stale ||
                  !!feedError
                }
                onClick={() => {
                  void downloadCalendar(selectedMatch.id);
                }}
              >
                {isDemo ? 'Download demo event' : 'Add to calendar'}
              </button>
            </div>
            <div className="detail-empty">
              <Users />
              <h3>Lineup not available</h3>
              <p>
                Confirmed squads, live events and match stats will appear here
                after the football feed is connected.
              </p>
            </div>
          </>
        ) : (
          selectedPlayer && (
            <>
              <p>
                #{selectedPlayer.number} · {selectedPlayer.position} ·{' '}
                {selectedPlayer.nationality}
              </p>
              <span className="status-pill">
                {selectedPlayer.availability === 'Unknown'
                  ? 'Availability unknown'
                  : selectedPlayer.availability}
              </span>
              <p>Live availability has not been connected.</p>
              <div className="detail-actions">
                <button
                  className="secondary-button"
                  aria-pressed={favourites.includes(selectedPlayer.id)}
                  onClick={() => toggleFavourite(selectedPlayer.id)}
                >
                  {favourites.includes(selectedPlayer.id)
                    ? '★ Favourite player'
                    : '☆ Add to favourites'}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    void shareDetails();
                  }}
                >
                  Copy player link
                </button>
              </div>
              <div className="player-stats detail-stats">
                {[
                  [selectedPlayer.appearances, 'Appearances'],
                  [selectedPlayer.minutes, 'Minutes'],
                  [selectedPlayer.goals, 'Goals'],
                  [selectedPlayer.assists, 'Assists'],
                ].map(([n, label]) => (
                  <span key={label}>
                    <strong>{n}</strong>
                    {label}
                  </span>
                ))}
              </div>
              <p className="muted">
                {isDemo
                  ? 'Illustrative season statistics, not live player data.'
                  : 'Player statistics and availability are not yet connected. Missing values are not zero.'}
              </p>
            </>
          )
        )}
        <output className="action-message">{actionMessage}</output>
        <a
          className="text-link"
          href={selectedMatch ? officialLinks[1].url : officialLinks[0].url}
          target="_blank"
          rel="noreferrer"
        >
          Check the official club source <ArrowUpRight size={16} />
        </a>
      </dialog>
    </div>
  );
}
