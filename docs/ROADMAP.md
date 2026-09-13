# Implementation roadmap

## 1. First working foundation — implemented

Web and mobile demo screens, shared models, preferences, test notifications, sample API routes, reminder planning logic and tests.

## 2. Live football data

**v0.4 implemented:** native Next.js/Vercel deployment, shared dashboard API and clients, API-Football fixtures/current squad adapter, Vercel Runtime Cache with stale fallback, source/freshness labels, match-window score/status/minute refresh, search, favourites, web share links, calendar export and reminder previews.

**Still required:** player-statistics endpoints, injury/availability sources, confirmed lineups, detailed match events and faster refresh after upgrading beyond the provider free tier.

- Keep provider secrets on the server and never expose them through public environment variables.
- Filter upstream data by a verified Barcelona team ID.
- Clients consume the API with loading, empty, unavailable and stale states. Never silently replace a provider failure with demo data.
- Store kickoff as nullable UTC. Preserve postponed/cancelled states and update consumers when a fixture changes.
- Availability records must distinguish unknown, doubtful, injured, suspended, back in training and cleared to play. Only publish sourced return estimates.
- Introduce confirmed lineups only after provider confirmation. Do not substitute predictions.

## 3. Automatic match-day notifications

The current `dueReminders` module calculates due messages only. It does not contact providers, persist subscriptions or deliver anything.

Add a scheduled worker, authenticated subscription API, durable device records and an outbox. Store preference version, IANA time zone, device token, opt-in state and delivery receipt. Configure APNs/FCM (or Expo Push) for mobile and Web Push/VAPID for supported browsers. Add request validation, rate limits, token ownership checks and revocation.

Before sending, refresh the fixture and preferences. Cancel pending jobs for deleted, cancelled, postponed or changed fixtures. Reminder identities include fixture and kickoff version. Give delivery records a unique key and make retries idempotent.

## 4. Production readiness

- Resolve dependency advisories with compatible upstream updates.
- Add accounts only for cross-device syncing; keep public browsing available without login.
- Add automated provider-feed health checks and observability.
- Validate on physical Android and iOS devices.
- Test accessibility, mobile layouts, screen readers, large text, keyboard navigation and permissions.
- Add unit/integration tests around provider normalization and notification delivery retries.
- Add original app icons and store assets, privacy/data-retention controls and regional distribution configuration.
- Confirm permission to reuse club marks, player images, articles and provider data before distribution.

## Later

Richer match events and stats, standings, regional viewing links and Barça Femení. Community chat, prediction games and social features remain outside the first release.
