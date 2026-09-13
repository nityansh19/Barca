# Live football data setup

The application works in explicit demo mode without an API key. Search, favourites, shared detail links, reminder previews and calendar downloads can be used immediately. Demo events are marked `[DEMO]` and never contain reminder alarms.

## Enable API-Football

1. Create an account at [API-Football](https://dashboard.api-football.com/) and check that its plan covers the desired season and Barcelona competitions. No provider subscription is purchased by this repository.
2. Configure `API_FOOTBALL_KEY` as a **server secret** in Sites. Never place it in a browser, an `EXPO_PUBLIC_*` variable, a GitHub commit or chat.
3. Set `FOOTBALL_DATA_MODE=live`. Optionally set `FOOTBALL_SEASON=2026`; an empty season uses the current July-to-June season.
4. Publish the updated runtime configuration, then load `/api/dashboard`. Verify `mode`, `source`, `fetchedAt`, `stale`, fixtures and current squad membership before relying on the information.

For local development only, copy `.env.example` to ignored `.env`, supply the key locally and apply the checked-in migration to the local D1 database. Hosted migrations are applied by Sites during publication. Generate future migrations with `npm run db:generate`; do not rewrite an applied migration.

The base adapter resolves Barcelona's provider ID by exact club name and country, then loads season fixtures and the current registered squad. Base schedule/squad data is cached for six hours to protect low API quotas. Three provider requests are needed per successful base refresh. Refreshing the UI reads the same cache instead of bypassing quota protection. An expired-cache lease prevents concurrent refreshes; provider failures back off for a minute. Saved base data can be shown for up to 24 hours with an explicit stale marker, after which the app reports unavailable. Live-mode errors never switch to demo records.

During a match window (starting 10 minutes before scheduled kickoff and ending up to four hours after it), the backend refreshes the current fixture by fixture ID. That live fixture is cached for two minutes, so all web/mobile users share one upstream provider request rather than each draining quota independently. Once the provider reports a final/cancelled/postponed state, that result is held for six hours and repeated live polling stops. The web and mobile clients poll the shared backend every two minutes in a match window and every 15 minutes otherwise.

The live fixture refresh currently updates match status, score and elapsed minute in the shared data model. Detailed event timelines (goals/cards/substitutions), confirmed lineups, injuries, return estimates and full player statistics remain unconnected. Those fields must stay unknown rather than being assigned fabricated zeroes or availability labels.

## Mobile backend origin

`mobile/.env.example` documents the optional `EXPO_PUBLIC_API_URL`. Without an origin, mobile uses labelled built-in sample data. With an origin, it reads `/api/dashboard` and displays failures without replacing them with samples.

The current backend is public at `https://barca-fan-companion.nityansh-bahadur1905.chatgpt.site`. Run `npm run setup` from the repository root to create a mobile `.env` pointing to that origin. Existing environment files are preserved; update `EXPO_PUBLIC_API_URL` manually if you already have one. Restart Expo after changing it. Never embed Sites access tokens or API-Football keys into the app.

## Notifications and calendar exports

The preview calculates local morning and pre-match times, including daylight-saving transitions. It does not schedule push notifications. Test notification buttons remain single tests only.

Live calendar exports include a 15, 30 or 60 minute alarm; demo exports include no alarm. These are one-time `.ics` downloads, not calendar subscriptions. Kickoff changes do not update previously imported events. Stale schedules are blocked from export. Automatic push delivery, lineup alerts, reschedule notifications and cross-device subscription management still require a worker and platform credentials.
