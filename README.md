# Barca

An independent FC Barcelona fan companion for the web, Android and iOS. Not affiliated with FC Barcelona.

## Current milestone: v0.2 — connected data layer and fan tools

- Web dashboard loads a shared API with loading, retry and stale-data states.
- Accent-insensitive fixture/player search, current competition filters and newest-first results.
- Favourite players saved per device on web and mobile.
- Shareable web match/player links and calendar downloads.
- Local-time reminder preview with daylight-saving handling; no scheduled delivery yet.
- API-Football fixtures/current-squad adapter ready for a server-side key.
- Durable D1 feed cache with refresh leasing, backoff and an explicit stale-data limit.
- 24 automated tests covering provider normalization, SQLite cache behaviour, calendar encoding and reminder timing.

See [live-data setup](docs/LIVE_DATA_SETUP.md) for credentials, caching, mobile API access and remaining limitations.

### Foundation retained

- Responsive web dashboard with countdown and local kickoff times.
- Fixtures/results with competition filters and match detail dialogs.
- Player profiles, position filters and illustrative season statistics.
- Official club source links, without republishing news articles.
- Device-local reminder preferences, spoiler-free mode and browser notification test.
- Expo mobile app with Home, Matches, Squad, Updates, Reminders, player profiles, persistent preferences and a notification test.
- Shared football models and sample data; read-only demo API routes.
- Pure reminder engine with tests for rescheduling, postponements, time zones, retry windows and deduplication.

**The published app remains in demo mode because no API key is configured.** Fixtures and statistics are samples and availability is unknown. Once configured, the new adapter supplies real fixtures and current squad membership hourly; player statistics, verified injuries, confirmed lineups and minute-by-minute scores remain unconnected. Automatic push delivery and account sync are not implemented. Notification buttons send a single test only; preferences and reminder previews do not schedule future notifications.

## Run the website

Use Node 24 LTS and npm (the checked-in lockfiles are authoritative).

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. Web source is at the repository root; the Sites starter uses React, TypeScript and Vinext with a Cloudflare-compatible server build.

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
app/                  Web interface and demo API routes
shared/               Platform-independent types, defaults and demo dataset
server/notifications.ts Pure reminder calculation, not a running worker
tests/                Reminder behavior tests
mobile/               Expo Android/iOS application
docs/                 Architecture and implementation roadmap
```

API endpoints: `GET /api/health`, `GET /api/dashboard`, `GET /api/fixtures`, `GET /api/squad` and `GET /api/calendar`. Feed endpoints expose source, mode and freshness. The web UI consumes `/api/dashboard`; mobile consumes it when `EXPO_PUBLIC_API_URL` is configured, otherwise it uses an explicit built-in demo. Calendar export supports optional `fixture` and `minutes` query parameters.

The browser optionally exposes `navigate_barca` through WebMCP. It only navigates between screens and does not enable notifications. Unsupported browsers continue normally.

## Before a public launch

See [the roadmap](docs/ROADMAP.md). Choose a licensed football provider, verify coverage in every Barça competition, configure durable subscriptions and a real push worker, complete native-device testing, and resolve dependency audit findings. No API keys or push-service credentials are included.

The initial generated dependency tree reports security advisories (including high-severity web dependencies). Some have no compatible fix reported by npm. The demo should not be treated as production-ready; update supported upstream versions and reassess before opening a live service to fans. Do not run `npm audit fix --force` blindly because it can break the pinned Sites/Expo framework versions.

Technical references: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [API-Football coverage](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide).
