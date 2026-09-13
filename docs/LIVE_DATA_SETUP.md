# Live football data setup

The application works in explicit demo mode without an API key. Search, favourites, shared detail links, reminder previews and calendar downloads can be used immediately. Demo events are marked `[DEMO]` and never contain reminder alarms.

## Deploy on Vercel

1. Import `nityansh19/Barca` into Vercel as a Next.js project from the `main` branch.
2. Keep the root directory as `./`; Vercel can use the repository's normal `npm run build` command.
3. Add `API_FOOTBALL_KEY` as an encrypted server environment variable. Never expose it through `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, a GitHub commit or chat.
4. Add `FOOTBALL_DATA_MODE=live` and `FOOTBALL_SEASON=2026` for the current 2026/27 season. If the season is omitted, the backend derives the July-to-June season automatically.
5. Deploy, then open `/api/health` and `/api/dashboard`. The dashboard response should report `mode: "live"` and `source: "API-Football"` before the data is treated as connected.

Use the same variables for Preview deployments if you want provider-backed preview builds. The API key is only read in the server runtime.

## Caching and the free API plan

The base adapter resolves Barcelona's provider ID by exact club name and country, then loads season fixtures and the current registered squad. Base schedule/squad data is stored in Vercel Runtime Cache for six hours. Three provider requests are needed per successful base refresh. A second 24-hour cache entry allows an explicitly stale feed to be shown if the provider temporarily fails. Live-mode errors never switch silently to demo records.

During a match window (starting 10 minutes before scheduled kickoff and ending up to four hours after it), the backend refreshes the current fixture by fixture ID. The live fixture is shared through Vercel Runtime Cache for three minutes. This keeps the maximum full-window polling profile inside the API-Football free plan more safely than a two-minute interval. Once the provider reports a final/cancelled/postponed state, that result is cached for six hours. Web and mobile clients poll the shared backend every three minutes in a match window and every 15 minutes otherwise.

The live fixture refresh currently updates match status, score and elapsed minute. Detailed event timelines (goals/cards/substitutions), confirmed lineups, injuries, return estimates and full player statistics remain unconnected. Those fields must stay unknown rather than being assigned fabricated values.

## Local development

Run `npm install`, then `npm run setup`. The setup command creates ignored `.env` and `mobile/.env` files from their examples without overwriting existing files. Set the web variables locally if you want provider-backed development; otherwise demo mode remains explicit.

Outside Vercel, the server uses a process-local memory cache for development. The deployed application uses Vercel Runtime Cache so different users share provider results.

## Mobile backend origin

`mobile/.env.example` documents `EXPO_PUBLIC_API_URL`. Without an origin, mobile uses labelled built-in sample data. After Vercel deployment, set it to the public Vercel origin, for example `https://your-project.vercel.app`, then restart Expo. Never place the API-Football key in the mobile environment.

## Notifications and calendar exports

The preview calculates local morning and pre-match times, including daylight-saving transitions. It does not schedule push notifications. Test notification buttons remain single tests only.

Live calendar exports include a 15, 30 or 60 minute alarm; demo exports include no alarm. These are one-time `.ics` downloads, not calendar subscriptions. Kickoff changes do not update previously imported events. Stale schedules are blocked from export. Automatic push delivery, lineup alerts, reschedule notifications and cross-device subscription management still require a worker and platform credentials.
