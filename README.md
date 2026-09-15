# Barca

An independent FC Barcelona fan companion for web, Android, and iOS. It is not affiliated with FC Barcelona.

## Current milestone

**v0.4 — Vercel-native live provider data**

The project supports live schedule, results, and squad data through API-Football when server credentials are configured. Without live credentials, the application stays explicit about demo/stale data instead of pretending provider data is current.

## What the app includes

### Match experience

- Barça fixtures and results
- Local kickoff times and countdowns
- Competition filters
- Match detail dialogs
- Shareable match links
- Calendar downloads
- Spoiler-free preference

### Squad experience

- Current squad feed when live mode is enabled
- Position filters
- Player search
- Player profiles
- Favourite players stored per device
- Unknown-safe statistics

### Data and reliability

- API-Football provider integration
- Vercel Runtime Cache
- Six-hour schedule/squad cache
- Short match-window score/status refresh
- Explicit stale-data fallback
- Provider normalization tests
- Cache and calendar behavior tests

### Mobile companion

The Expo application includes Home, Matches, Squad, Updates, Reminders, player profiles, persistent preferences, and notification testing.

## Tech and platform structure

```text
app/        Next.js web interface and API routes
shared/     Shared football types, defaults, and demo data
server/     Provider adapter, caching, and reminder calculations
mobile/     Expo Android/iOS application
docs/       Architecture, live-data setup, and roadmap
```

## Live-data configuration

The deployed app requires server-side configuration for live API-Football data:

```text
API_FOOTBALL_KEY=<private provider key>
FOOTBALL_DATA_MODE=live
FOOTBALL_SEASON=2026
```

Never expose the API-Football key in client code or commit it to GitHub.

For the full provider setup and current limitations, see [`docs/LIVE_DATA_SETUP.md`](./docs/LIVE_DATA_SETUP.md).

## Run the website

Use Node.js 22 and npm.

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` creates ignored environment files from the checked-in examples without overwriting local values.

## Verify before deployment

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Deploy on Vercel

Recommended settings:

```text
Framework Preset: Next.js
Root Directory: ./
Install Command: npm install
Build Command: npm run build
Output Directory: default
Node.js: 22.x
```

After deployment, verify:

- `/api/health`
- `/api/dashboard`

In live mode, the dashboard should identify `API-Football` as its source.

## Run the mobile app

```bash
cd mobile
npm ci
npm start
```

After the web app has a public URL, set `EXPO_PUBLIC_API_URL` in `mobile/.env` to that origin and restart Expo. The provider API key remains server-side.

Mobile validation:

```bash
npm run typecheck
npx expo export --platform android --platform ios
```

## Current limitations

The following are intentionally not presented as complete yet:

- Detailed event timelines
- Confirmed lineups
- Injury feeds
- Full player statistics
- Automatic push delivery
- Account-based preference sync

## Roadmap

See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for public-launch work, provider coverage checks, richer match data, push delivery, native-device testing, and dependency cleanup.
