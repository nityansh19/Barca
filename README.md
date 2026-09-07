# Barca

An independent FC Barcelona fan companion for the web, Android and iOS. Not affiliated with FC Barcelona.

## Current milestone: working demo foundation

- Responsive web dashboard with countdown and local kickoff times.
- Fixtures/results with competition filters and match detail dialogs.
- Player profiles, position filters and illustrative season statistics.
- Official club source links, without republishing news articles.
- Device-local reminder preferences, spoiler-free mode and browser notification test.
- Expo mobile app with Home, Matches, Squad, Updates, Reminders, player profiles, persistent preferences and a notification test.
- Shared football models and sample data; read-only demo API routes.
- Pure reminder engine with tests for rescheduling, postponements, time zones, retry windows and deduplication.

**This is not a live service yet.** All fixtures and statistics are samples. Player availability is explicitly unknown. Automatic match alerts, confirmed lineups, live scores, verified injuries and account sync are not connected. The notification buttons send a test only; changing preferences does not schedule future notifications.

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

API endpoints: `GET /api/health`, `GET /api/fixtures`, `GET /api/squad`. Every data endpoint returns `mode: "demo"` and an explicit source label. The first UI milestone imports the same sample module directly; both clients will move to the shared API when a live provider is connected.

The browser optionally exposes `navigate_barca` through WebMCP. It only navigates between screens and does not enable notifications. Unsupported browsers continue normally.

## Before a public launch

See [the roadmap](docs/ROADMAP.md). Choose a licensed football provider, verify coverage in every Barça competition, configure durable subscriptions and a real push worker, complete native-device testing, and resolve dependency audit findings. No API keys or push-service credentials are included.

The initial generated dependency tree reports security advisories (including high-severity web dependencies). Some have no compatible fix reported by npm. The demo should not be treated as production-ready; update supported upstream versions and reassess before opening a live service to fans. Do not run `npm audit fix --force` blindly because it can break the pinned Sites/Expo framework versions.

Technical references: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [API-Football coverage](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide).
