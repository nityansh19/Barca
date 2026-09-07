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
import { demoFixtures, demoPlayers, officialLinks } from '../shared/demo';
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
  const upcoming = demoFixtures.filter(
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
  const filteredMatches = demoFixtures.filter(
    (f) =>
      (matchTab === 'Results'
        ? f.status === 'finished'
        : f.status !== 'finished') &&
      (competition === 'All competitions' || competition === f.competition),
  );
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
            <span className="season-pill">2026 / 27</span>
          </div>
          <div className="demo-notice">
            <span className="demo-dot" />
            <strong>Demo preview</strong>
            <span>
              Fixtures and statistics are illustrative. Player availability is
              unverified.
            </span>
          </div>
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
                              <strong>{n}</strong>
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
                      No upcoming dated demo fixture. Visit Matches for fixtures
                      awaiting a kickoff time.
                    </div>
                  )}
                </section>
                <aside className="right-stack">
                  <section className="panel result-card">
                    <p className="eyebrow">
                      LAST TIME OUT <span>DEMO</span>
                    </p>
                    <div className="result">
                      <span>BAR</span>
                      <strong>
                        {preferences.spoilerFree ? '•••' : '3 – 1'}
                      </strong>
                      <span>VAL</span>
                    </div>
                    <p>
                      La Liga <span>·</span> Full-time
                    </p>
                    <button
                      className="text-link"
                      onClick={() => setSelectedMatch(demoFixtures[4])}
                    >
                      Match details <ArrowRight size={16} />
                    </button>
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
                  {demoPlayers.slice(0, 3).map((p) => (
                    <button
                      className="spotlight-row"
                      key={p.id}
                      onClick={() => setSelectedPlayer(p)}
                    >
                      <span className="shirt-number">{p.number}</span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.position}</small>
                      </span>
                      <span className="player-contribution">
                        <strong>{p.goals + p.assists}</strong>
                        <small>G + A · demo</small>
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
                  {['Upcoming', 'Results'].map((t) => (
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
                    'La Liga',
                    'Champions League',
                    'Copa del Rey',
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              {filteredMatches.map(fixtureRow)}
              {!filteredMatches.length && (
                <p className="empty-state">
                  No demo matches in this competition yet.
                </p>
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
                  Sample player profiles · season statistics
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
              <div className="player-grid">
                {demoPlayers
                  .filter(
                    (p) =>
                      position === 'All players' || p.position === position,
                  )
                  .map((p) => (
                    <button
                      className="player-card"
                      key={p.id}
                      onClick={() => setSelectedPlayer(p)}
                    >
                      <div className="player-art">
                        <span>{p.number}</span>
                        <Shield size={40} strokeWidth={1} />
                      </div>
                      <div className="player-info">
                        <span className="eyebrow">{p.position}</span>
                        <h2>{p.name}</h2>
                        <span className="status-pill">
                          Availability unknown
                        </span>
                        <div className="player-stats">
                          <span>
                            <strong>{p.appearances}</strong>Apps
                          </span>
                          <span>
                            <strong>{p.goals}</strong>Goals
                          </span>
                          <span>
                            <strong>{p.assists}</strong>Assists
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
              </aside>
            </div>
          )}
          <footer>
            <span>Made for the culers.</span>
            <span>
              Independent fan project <span className="footer-dot">•</span> Demo
              preview
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
          DEMO {selectedMatch ? 'MATCH CENTRE' : 'PLAYER PROFILE'}
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
              <span className="status-pill">Availability unknown</span>
              <p>Live availability has not been connected.</p>
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
                Illustrative season statistics, not live player data.
              </p>
            </>
          )
        )}
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
