# Barca

An independent FC Barcelona fan companion for the web, Android and iOS. Not affiliated with FC Barcelona.

## Current milestone: v0.4 — Vercel-native live provider data

- Native Next.js web application ready for Vercel Git deployments.
- API-Football-backed Barça schedule, results and current squad when server credentials are configured.
- Vercel Runtime Cache: six-hour schedule/squad cache plus shared three-minute match-window score/status refresh.
- Explicit stale-data fallback without silently replacing provider failures with demo data.
- Accent-insensitive fixture/player search, competition filters and newest-first results.
- Favourite players saved per device on web and mobile.
- Shareable web match/player links and calendar downloads.
- Local-time reminder preview with daylight-saving handling; no scheduled delivery yet.
- Automated tests cover provider normalization, runtime-cache behavior, calendar encoding and reminder timing.

See [live-data setup](docs/LIVE_DATA_SETUP.md) for the Vercel environment variables and remaining limitations.

### Foundation retained

- Responsive web dashboard with countdown and local kickoff times.
- Fixtures/results with competition filters and match detail dialogs.
- Player profiles, position filters and unknown-safe statistics.
- Official club source links, without republishing news articles.
- Device-local reminder preferences, spoiler-free mode and browser notification test.
- Expo mobile app with Home, Matches, Squad, Updates, Reminders, player profiles, persistent preferences and a notification test.
- Shared football models and labelled sample data.

**The deployed app remains in demo mode until the server has `API_FOOTBALL_KEY`, `FOOTBALL_DATA_MODE=live` and an optional `FOOTBALL_SEASON`.** Detailed event timelines, confirmed lineups, injuries, full player statistics, automatic push delivery and account sync are not implemented yet.

## Run the website

Use Node 22 and npm.

```sh
npm install
npm run setup
npm run dev
```

`npm run setup` creates ignored `.env` files from the checked-in examples without overwriting your local values. No API credential belongs in GitHub.

Validate before deployment:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

## Deploy the website on Vercel

Import this repository into Vercel and use the `main` branch. Vercel should detect **Next.js** automatically.

Recommended project settings:

```text
Framework Preset: Next.js
Root Directory: ./
Install Command: npm install
Build Command: npm run build
Output Directory: leave blank/default
Node.js: 22.x
```

Add these server environment variables:

```text
API_FOOTBALL_KEY=<private provider key>
FOOTBALL_DATA_MODE=live
FOOTBALL_SEASON=2026
```

After deployment, check `/api/health` and `/api/dashboard`. The live dashboard should report `source: "API-Football"`. Future pushes to `main` can deploy automatically through Vercel's Git integration.

## Run the mobile app

```sh
cd mobile
npm ci
npm start
```

After the web deployment has a public URL, set `EXPO_PUBLIC_API_URL` in `mobile/.env` to that origin and restart Expo. The API-Football key stays server-side.

```sh
cd mobile
npm run typecheck
npx expo export --platform android --platform ios
```

The mobile app has its own lockfile to preserve Expo's supported React/React Native versions.

## Structure

```text
app/                  Next.js web interface and API routes
shared/               Platform-independent types, defaults and demo dataset
server/               API-Football adapter, Vercel cache and reminder calculation
mobile/               Expo Android/iOS application
docs/                 Architecture and implementation roadmap
```

API endpoints: `GET /api/health`, `GET /api/dashboard`, `GET /api/fixtures`, `GET /api/squad` and `GET /api/calendar`. Feed endpoints expose source, mode and freshness. The web UI consumes `/api/dashboard`; mobile consumes it when `EXPO_PUBLIC_API_URL` is configured.

## Before a public launch

See [the roadmap](docs/ROADMAP.md). Verify API-Football coverage in every Barça competition, connect detailed match events/lineups/player stats if required, configure durable subscriptions and a real push worker, complete native-device testing, and resolve dependency audit findings. No API keys or push-service credentials are included.
