# Barca

An independent FC Barcelona fan companion for the web, Android and iOS. Not affiliated with FC Barcelona.

Public website: [Barça Fan Companion](https://barca-fan-companion.nityansh-bahadur1905.chatgpt.site). The public API is hosted at the same origin. GitHub stores source code; pushing a commit does not automatically deploy a new Sites version.

## Current milestone: v0.3 — live provider data

- Web dashboard loads a shared API with loading, retry and stale-data states.
- API-Football-backed Barça schedule, results and current squad when server credentials are configured.
- Quota-aware six-hour base cache plus shared two-minute match-window score/status refresh.
- Accent-insensitive fixture/player search, current competition filters and newest-first results.
- Favourite players saved per device on web and mobile.
- Shareable web match/player links and calendar downloads.
- Local-time reminder preview with daylight-saving handling; no scheduled delivery yet.
- Durable D1 feed cache with refresh leasing, backoff and an explicit stale-data limit.
- Automated tests cover provider normalization, live fixture refresh, SQLite cache behaviour, calendar encoding and reminder timing.

See [live-data setup](docs/LIVE_DATA_SETUP.md) for credentials, caching, mobile API access and remaining limitations.

### Foundation retained

- Responsive web dashboard with countdown and local kickoff times.
- Fixtures/results with competition filters and match detail dialogs.
- Player profiles, position filters and illustrative season statistics when provider fields are unavailable.
- Official club source links, without republishing news articles.
- Device-local reminder preferences, spoiler-free mode and browser notification test.
- Expo mobile app with Home, Matches, Squad, Updates, Reminders, player profiles, persistent preferences and a notification test.
- Shared football models and sample data; read-only demo API routes.
- Pure reminder engine with tests for rescheduling, postponements, time zones, retry windows and deduplication.

**The published app remains in demo mode until the Sites runtime is configured with `API_FOOTBALL_KEY`, `FOOTBALL_DATA_MODE=live` and a new Sites version is published.** Once configured, the adapter supplies real fixtures, results, current squad membership and match-window score/status updates. Detailed event timelines, confirmed lineups, injuries, full player statistics, automatic push delivery and account sync are not implemented yet.

## Run the website

Use Node 24 LTS and npm (the checked-in lockfiles are authoritative).

```sh
npm ci
npm run setup
npm run dev
```

Open the local URL printed by the server. Web source is at the repository root; the Sites starter uses React, TypeScript and Vinext with a Cloudflare-compatible server build.

The setup command creates ignored local environment files without overwriting existing values. Mobile is configured to read the public hosted backend. Run setup from the repository root before starting mobile. API credentials are never included; the app remains usable with clearly labelled demo data until a provider key is configured.

```sh
npm run test
npm run typecheck
npm run lint
npm run build
```

Lint checks authored application, shared, server and test code. Generated shadcn components are retained as starter components and are not included in application lint.

## Run the mobile app

```sh
cd mobile
npm ci
npm start
```

Use a compatible Expo Go or development build. Push delivery requires platform configuration and a development build; this milestone includes a local notification test only. Native device behavior must be tested on Android and iOS before release. Building an iOS binary locally requires macOS/Xcode; EAS builds can be configured later.

```sh
cd mobile
npm run typecheck
npx expo export --platform android --platform ios
```

The mobile app has its own lockfile to preserve Expo's supported React/React Native versions. It imports only platform-independent modules from `shared/`. No generated native projects or app-store signing credentials are committed. App icons and store assets remain to be designed.

## Structure

```text
app/                  Web interface and API routes
shared/               Platform-independent types, defaults and demo dataset
server/                Provider adapter, cache and reminder calculation
mobile/                Expo Android/iOS application
docs/                  Architecture and implementation roadmap
```

API endpoints: `GET /api/health`, `GET /api/dashboard`, `GET /api/fixtures`, `GET /api/squad` and `GET /api/calendar`. Feed endpoints expose source, mode and freshness. The web UI consumes `/api/dashboard`; mobile consumes it when `EXPO_PUBLIC_API_URL` is configured, otherwise it uses an explicit built-in demo. Calendar export supports optional `fixture` and `minutes` query parameters.

The browser optionally exposes `navigate_barca` through WebMCP. It only navigates between screens and does not enable notifications. Unsupported browsers continue normally.

## Before a public launch

See [the roadmap](docs/ROADMAP.md). Verify API-Football coverage in every Barça competition, connect detailed match events/lineups/player stats if required, configure durable subscriptions and a real push worker, complete native-device testing, and resolve dependency audit findings. No API keys or push-service credentials are included.

The initial generated dependency tree reports security advisories (including high-severity web dependencies). Some have no compatible fix reported by npm. The demo should not be treated as production-ready; update supported upstream versions and reassess before opening a live service to fans. Do not run `npm audit fix --force` blindly because it can break the pinned Sites/Expo framework versions.
