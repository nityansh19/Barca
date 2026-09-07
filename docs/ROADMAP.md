# Implementation roadmap

## 1. First working foundation — implemented

Web and mobile demo screens, shared models, preferences, test notifications, sample API routes, reminder planning logic and tests. No live or medical claims are inferred from sample data.

## 2. Live football data

- Select a provider after testing Barcelona fixtures, player statistics, injuries and confirmed lineups across La Liga, Champions League and domestic cups. Include friendlies only where coverage exists.
- Keep provider secrets on the server. Filter upstream data by a verified Barcelona team ID.
- Introduce a normalized provider adapter and durable cached records with source, provider ID, fetched-at timestamp and data freshness.
- Clients consume the API with loading, empty, unavailable and stale states. Never silently replace a provider failure with demo data.
- Store kickoff as nullable UTC. Preserve postponed/cancelled states and update consumers when a fixture changes.
- Availability records must distinguish unknown, doubtful, injured, suspended, back in training and cleared to play. Only publish sourced return estimates.
- Introduce confirmed lineups only after provider confirmation. Do not substitute predictions.

## 3. Automatic match-day notifications

The current `dueReminders` module calculates due messages only. It does not contact providers, persist subscriptions or deliver anything.

Add a server worker polled every minute, an authenticated subscription API, durable device records and an outbox. Store preference version, IANA time zone, device token, opt-in state and delivery receipt. Configure APNs/FCM (or Expo Push) for mobile and Web Push/VAPID for supported browsers. Add request validation, rate limits, token ownership checks and revocation.

Before sending, refresh the fixture and preferences. Cancel pending jobs for deleted, cancelled, postponed or changed fixtures. Reminder identities include fixture and kickoff version. Give delivery records a unique key, claim them transactionally and use an expiring lease for retry after worker failure. Provider delivery is at-least-once; use push collapse/tag identifiers to reduce duplicate visible alerts. Do not claim exactly-once delivery across a provider timeout.

The current policy sends a morning heads-up from 09:00 local time while more than an hour remains. Games before 09:00 (including after midnight) rely on pre-match reminders. Pre-match jobs have a five-minute retry window. Make these choices user-configurable before launch, alongside quiet hours and one-device/all-device delivery.

Confirmed lineup and fixture-change alerts require event processing; they are not implemented by the current time-based planner. Dedupe lineup alerts by confirmed lineup version. Never enable scheduled alerts using sample fixtures.

## 4. Production readiness

- Resolve dependency advisories with compatible upstream updates.
- Add accounts only for cross-device syncing; keep public browsing available without login.
- Add deep links and shareable match/player routes, calendar export, and automated feed health checks.
- Validate on physical Android and iOS devices: permission denied, app closed, revoked tokens, changed time zones, offline recovery, duplicate devices and notification taps.
- Test accessibility, mobile layouts, screen readers, large text, keyboard navigation, and permissions in supported browsers.
- Add unit/integration tests around provider normalization, outbox concurrency and delivery retries.
- Add original app icons and store assets, privacy/data-retention controls and regional distribution configuration.
- Confirm permission to reuse club marks, player images, articles and provider data before distribution.

## Later

Richer match events and stats, favourite players, standings, regional viewing links and Barça Femení. Community chat, prediction games and social features remain outside the first release.
