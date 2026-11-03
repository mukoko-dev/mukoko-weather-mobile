# Mukoko Weather (mobile)

> The Expo / React Native client for Mukoko Weather — iOS and Android.

![Expo](https://img.shields.io/badge/Expo-SDK_58-000020?style=flat-square&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?style=flat-square&logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Platforms](https://img.shields.io/badge/Platforms-iOS_%7C_Android-lightgrey?style=flat-square)

**Backend:** the Cloudflare weather API, `weather-api.mukoko.com` |
**Version:** 1.0.0 | **Distribution:** not yet in either store

---

## What it is

A thin client over the Cloudflare weather API (the public Worker in
[`mukoko-dev/mukoko-weather`](https://github.com/mukoko-dev/mukoko-weather),
`workers/public-api`). No weather logic is duplicated here: every call goes to
that API's `/v1/*` routes, and the repo owns only presentation, navigation,
device identity and sign-in.

**The app talks to the API, and only the API.** It connects to the Cloudflare
backend and nothing else: no website's server, no database, no weather
provider. Data platforms sit behind the API, not behind the app. The base URL
and every route live in one place, `src/api/client.ts`, so moving to the Mukoko
consumer API (`api.mukoko.com`) is a change to that file. `npm test` runs
`scripts/check-cloudflare-only.mjs`, which fails on any retired host, database
URL or client package, or direct provider call (see
[One backend only](#one-backend-only)).

The weather home (GPS plus a 7-day forecast), a per-location page, the
Locations list, explore/search and My Weather (preferences), held together by
the web's shell: the mukoko weather mark on the home sky, one floating bottom
bar (Map, My Location and the saved places, Locations), swipe between places,
and a ⋯ menu sheet. Shamwari AI chat is paused, as on the web.

| Fact              | Value                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Display name      | mukoko weather (the brand's lower-case form; `expo.name`)                                |
| npm package name  | `mukoko-mobile` (the repo and app are `mukoko-weather-mobile` / Mukoko Weather)          |
| Bundle ID (iOS)   | `africa.nyuchi.mukoko.weather`                                                           |
| Package (Android) | `africa.nyuchi.mukoko.weather`                                                           |
| URL scheme        | `mukoko://`                                                                              |
| EAS project       | `97f6eb48-2aac-42c2-b13d-5f68f1a86174` (owner `nyuchi-web-services`)                     |
| API base          | `https://weather-api.mukoko.com`; `EXPO_PUBLIC_API_URL` may name another Cloudflare host |

**Not yet released.** `eas.json` defines `development`, `preview` and
`production` build profiles; `production` is the store build on both
platforms (an iOS device build that can go to TestFlight). Android submits to
the Play Console **internal track, `draft` status**; the iOS submit profile
waits on two owner-fill values (`ascAppId`, `appleTeamId`). The app is in
neither store: [`docs/store/`](docs/store/README.md) has the readiness notes,
listing text, privacy answers and the owner's checklist, and
[`docs/payments.md`](docs/payments.md) the payments design. EAS Update is set up
(`expo-updates`, `runtimeVersion` policy `appVersion`, `updates.url`), and a
workflow publishes the JavaScript of every push to `staging` (see "See it in
Expo Go").

## Setup

Expo SDK 58 needs Node.js 22.13 or newer on the 22 line, 24.3 or newer on the 24 line, or 26 and later (odd-numbered releases such as 23 and 25 are not supported).

```bash
cd mukoko-weather-mobile
npm install
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_WORKOS_CLIENT_ID (EXPO_PUBLIC_API_URL can stay as is)
```

`EXPO_PUBLIC_API_URL` must be a Cloudflare host (`weather-api.mukoko.com`, later
`api.mukoko.com`). Any other value is ignored and the default is used. To work
against a Worker on your own machine (`wrangler dev` in
`mukoko-dev/mukoko-weather`), a development build also accepts an address on
your own network:

```env
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:8787
```

The simulator can hit `localhost`, but a physical device on Expo Go needs your
machine's LAN IP. Run `ipconfig getifaddr en0` on macOS to find it.

## Run

```bash
npx expo start
# then press:
#   i  -> iOS simulator
#   a  -> Android emulator
#   w  -> web (limited; secure-store falls back to localStorage)
```

For a physical device, scan the QR code with the Expo Go app
(`https://expo.dev/go`).

## See it in Expo Go, without a computer

Every push to `main` (production) and to `staging` (pre-production) publishes the
app's JavaScript to EAS Update (`.eas/workflows/publish-preview-update.yml`; the
EAS branch has the git branch's name). To open the latest one on a phone:

1. Install or update Expo Go to the SDK 58 version (`https://expo.dev/go`) and
   sign in to the Expo account that belongs to the `nyuchi-web-services` team.
2. Open the project's Updates page on expo.dev
   (`https://expo.dev/accounts/nyuchi-web-services/projects/mukoko-weather/updates`),
   pick the `main` or `staging` branch and the newest update, and scan the QR code or use
   "Open in Expo Go".

Expo Go carries only the native modules of its SDK, which is enough for this
app today. A change that adds a native module needs a development build instead.
The update calls the Cloudflare weather API only (`weather-api.mukoko.com`).

## Verify

```bash
npm run typecheck              # tsc --noEmit
npm test                       # jest, including the one-backend guard
npm run check:cloudflare-only  # the guard on its own
npx expo-doctor                # SDK version + dependency checks
```

## Project layout

```
mukoko-weather-mobile/
  app.json                       # Expo config — bundle IDs, plugins, scheme
  src/
    app/                         # Expo Router (file-based)
      _layout.tsx                # Root Stack — fonts, auth init, device register, AppChrome (the shell)
      (tabs)/                    # Home group (tab navigator, its own bar not drawn)
        _layout.tsx              # Screens + the bar's clearance on the lists
        index.tsx                # My Location (home) — GPS, then the shared WeatherPage, brand mark
        locations.tsx            # Locations — My Location + saved places as weather cards, Home / Remove
        explore.tsx              # Search / add a location
        shamwari.tsx             # AI chat — paused behind FLAGS.shamwari_chat (redirects home)
        my.tsx                   # My Weather: account, saved places, theme, activities
      menu.tsx                   # The ⋯ menu as a native sheet
      map.tsx                    # Weather map placeholder until the API serves tiles (#55)
      location/[slug].tsx        # /location/harare etc. — the same WeatherPage, with Back
      location/[slug]/agriculture.tsx  # /location/harare/agriculture — farm windows, advice, charts, calendar
      location/[slug]/forecast.tsx    # the 24-hour chart, the week chart and rows, sun times
      location/[slug]/atmosphere.tsx  # the tiles, then humidity, wind, pressure and UV over 24 hours
      sign-in.tsx                # WorkOS AuthKit launcher
      sign-in-callback.tsx       # OAuth redirect target (mukoko://sign-in-callback)
    brand/
      tokens.ts                  # 7 minerals, spacing, radius, font families
      fonts.ts                   # @expo-google-fonts/* loader map
    theme/
      mzizi.ts                   # Weather screens' tokens, mirrored from the web: space, type scale, radius, touch, page colours
      farm.ts                    # Severity, malachite, chart-series and ENSO colours for the farm and place cards
      weather-scales.ts          # Weather DATA colours: AQI bands, frost blues, model lines (never brand minerals)
      wx-series.ts               # Chart series colours (weather convention, light and dark), mirrored from the web
      sky.ts                     # The eight page skies (light + dark), stars, rain streaks
      colors.ts                  # Light + dark palette for the other tabs (mineral-derived)
      typography.ts              # Type scale for the other tabs: hero/display/title/body/mono
    shared/                      # Pure logic ported from the web (hero, hourly outlook, place-time, tile insights, chart data, sun times, air quality, haze, moon, averages, tile details, nowcast, model comparison, activities, suitability rules, feasibility, tips, community lane, report types, location pager, swipe, feature flags), with the web's tests
    shell/                       # The shell's pure rules: web page keys ↔ app routes, page moves, menu rows, Locations cards
    state/
      preferences.ts             # Saved places, theme, activities (SecureStore)
      home-location.ts           # The Home location (device-local, as on the web)
    api/
      client.ts                  # base URL, ROUTES table, fetch wrapper, error parsing
      weather.ts                 # GET /v1/weather (+ /v1/locations for a slug), converted to the screens' model (nowcast and model series included)
      air-quality.ts             # GET /v1/air-quality
      haze.ts                    # GET /v1/haze
      climate.ts                 # GET /v1/normals, /v1/normals/monthly, /v1/history (the Averages detail)
      agriculture.ts             # GET /v1/agriculture: ready, or unavailable with the Worker's reason
      enso.ts                    # GET /v1/enso (El Nino / La Nina phase)
      profile.ts                 # GET /v1/locations/profile (season, climate, crop calendar), cached 30 min
      place.ts                   # The place under a weather answer, as the farm and place cards take it
      agri-history.ts            # GET /v1/history and /v1/normals for the 30-day card
      locations.ts               # GET /v1/search, /v1/geo, /v1/locations
      chat.ts                    # POST /v1/ai/chat (Shamwari)
      activities.ts              # GET /v1/activities, /v1/suitability (checked field by field, cached 10 min)
      reports.ts                 # GET/POST /v1/reports, POST /v1/reports/upvote (switched off: COMMUNITY_REPORTS_ENABLED)
      ai.ts                      # POST /v1/ai/summary, /v1/ai/followup (signed-in only; not called while sign-in is off)
      devices.ts                 # POST /v1/devices (device preference profile)
      auth.ts                    # WorkOS hosted sign-in via expo-auth-session (switched off)
    analytics/                   # Measurement through our own API only: no SDK, nothing sent yet
      events.ts                  # The event vocabulary shared with the web; closed-set values and coarse places only
      queue.ts                   # The on-device queue: cap, persistence, opt-out, resettable install id, batches
      index.ts                   # track(), recordAppOpen(), the uploader (switched off: EVENTS_UPLOAD_ENABLED)
    device/
      identity.ts                # UUID v4 in SecureStore (Android/iOS) / localStorage (web)
      register.ts                # POST /v1/devices with the install id (switched off)
    components/
      BrandText.tsx              # Typography + tone variants
      Header.tsx                 # Mark + "weather" wordmark
      MukokoLogo.tsx             # Seed of Life mark + "weather", on the page or on the sky
      shell/                     # AppChrome, the floating BottomBar, PlaceLane, swipe, Locations card, shell icons
      icons/Icon.tsx             # Drawn weather + interface icons (react-native-svg); no emoji
      icons/ActivityIcon.tsx     # Drawn activity glyphs, report-type icons and the sheet/report action icons
      icons/CardIcons.tsx        # Factory (smog), alert triangle, chevron
      weather/                   # The location page, one component per web section:
        WeatherScroll.tsx        #   page container: sky, gutters, safe areas, status bar
        WeatherSky.tsx           #   the page sky (expo-linear-gradient)
        SkyHero.tsx              #   the open-sky hero
        ConditionsCard.tsx       #   outlook sentence + hourly strip (place time)
        ConditionTiles.tsx       #   air quality, haze, wind, UV, feels like, visibility, rain, humidity, pressure, sun, moon, averages; each tile opens its detail
        AirQualityCard.tsx       #   the US AQI card (+ AirQualityDetail.tsx: bands, guidance, pollutants vs WHO)
        HazeCard.tsx             #   smoke, dust, smog, mist (only when there is haze)
        MetricDetailSheet.tsx    #   a tile's detail: headline, 24 h chart, related readings, explanation
        AveragesDetail.tsx       #   monthly normals (chart + table), temperature and precipitation tabs
        DetailSheet.tsx          #   the one sheet (page sheet on iOS): tile details, air quality, averages, activity picker and advice, report wizard; + SheetSection, StatGrid
        ForecastExtras.tsx       #   Next hour nowcast + Model comparison
        AlertBanners.tsx         #   frost and weather-unavailable notices
        CardSkeleton.tsx         #   a card's loading state
        DailyCard.tsx            #   the week: chart and rows (on /forecast, as on the web)
        AgricultureSnapshot.tsx  #   farm verdict, four windows, six figures; every "no data" reason in words
        EnsoCard.tsx             #   El Nino / La Nina outlook
        AboutPlaceCard.tsx       #   the place's facts + profile rows (climate zone, typical month, crop calendar)
        SeasonBadge.tsx          #   the season line in the Conditions card's footer
        MapPreviewCard.tsx       #   honest placeholder: the map is not in the app yet
        PlaceTrail.tsx           #   Home / Country / Province / Place
        Agriculture*.tsx, CropCalendarTable.tsx, AgriSeriesChart.tsx, SubPage.tsx  #   the agriculture page
        WeatherSkeleton.tsx      #   structural loading state
        WeatherPage.tsx          #   one page for both screens; error state
        CommunityLane.tsx        #   24 h lane per picked activity, rated by the Worker's rules, with report pins
        ActivityPickerSheet.tsx  #   the activity picker (also opened from the My tab)
        ActivitiesSheet.tsx      #   the advice sheet: ActivityCard per activity (rating, 24 h trend, tips)
        ActivitySheets.tsx       #   one provider holding the picker and the advice sheet
        RecentReports.tsx        #   community reports list + upvote (not live yet)
        ReportWizardSheet.tsx    #   the 3-step report wizard (submit behind COMMUNITY_REPORTS_ENABLED)
        AiSummary.tsx            #   Shamwari insight: the signed-out state, and the signed-in card behind the sign-in switch
        AiFollowup.tsx           #   inline follow-up chat (signed in, after an insight)
        LocationDetail.tsx       #   /forecast and /atmosphere: the sky, top row with Back, title, cards, every state
        DetailSkeleton.tsx       #   the detail pages' structural loading state
        PageCard.tsx             #   the ordinary card on a page (title, border, padding)
        SectionHeader.tsx        #   a section title with one action ("Full forecast", "24h trends")
        HourlyForecastCard.tsx   #   24-Hour Forecast card (HourlyChart)
        SunTimesCard.tsx         #   sunrise, sunset, daylight in the place's time
        AtmosphericDetailsCard.tsx #  the four 24-hour atmospheric charts
        ChartErrorBoundary.tsx   #   one section's crash stays in that section
        charts/                  #   the reusable time-series chart and the web's six chart configs
          TimeSeriesChart.tsx    #     react-native-svg chart: touch readout, VoiceOver text alternative, Reduce Motion
          chart-layout.ts        #     axes, ticks, smooth paths, bars, nearest point (pure)
          chart-model.ts         #     what to draw for a chart (pure)
          chart-text.ts          #     the words a chart says (pure)
          HourlyChart.tsx, DailyChart.tsx, HumidityCloudChart.tsx, WindSpeedChart.tsx, PressureChart.tsx, UVIndexChart.tsx
    hooks/
      usePalette.ts              # Reads OS color scheme -> palette (other tabs)
      usePageColors.ts           # The web's page colours for the weather screens
      useNow.ts                  # The current instant, refreshed each minute
      useReduceMotion.ts         # OS Reduce Motion, live
      useActivityData.ts         # Activity list + suitability rules (seed first; rules have a failure state)
      useReports.ts              # Reports for a place (`off` while the switch is off)
      useSignedIn.ts             # Signed-in state behind SIGN_IN_AVAILABLE
      useHeroActivityLine.ts     # The hero's "for your activities" line
      useLocationWeather.ts      # a detail page's load: loading, ready, error, refresh
      useLocationLinks.ts        # opens a place's forecast and atmosphere pages
      weather-cache.ts           # the last answer per place, in memory for 5 minutes
    test-utils/                  # Mocks and recorded-answer fixtures for the tests
  assets/
    images/                      # Icons, splash, the mukoko mark
```

## What's wired vs. switched off

| Surface                                                    | Status           | Notes                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weather home (sky, hero, Conditions, tiles)                | Live             | `GET /v1/weather?lat&lon`; the answer is converted to the screens' model in `src/api/weather.ts`                                                                                                                                                                                                                                              |
| Air quality, haze, moon, averages, tile details            | Live             | `GET /v1/air-quality`, `/v1/haze`, `/v1/normals`, `/v1/normals/monthly`, `/v1/history`; moon and tile details are computed on the phone                                                                                                                                                                                                       |
| Next hour, model comparison, frost and unavailable notices | Live             | From `GET /v1/weather` (`minutely`, `models`, the hourly series, `X-Weather-Provider`)                                                                                                                                                                                                                                                        |
| Location detail (`/location/[slug]`)                       | Live             | `GET /v1/locations?slug=` for the coordinate, then `GET /v1/weather`                                                                                                                                                                                                                                                                          |
| Forecast (`/location/[slug]/forecast`)                     | Live             | The same two routes; opens from the page's answer when it was just shown (in-memory, 5 minutes), else fetches. 24-hour and 7-day charts and sun times                                                                                                                                                                                         |
| Atmosphere (`/location/[slug]/atmosphere`)                 | Live             | The same two routes. The tiles, then humidity and cloud, wind and gusts, pressure and UV over 24 hours. Air quality on this page comes with the air-quality card                                                                                                                                                                              |
| Agriculture card and page (`/location/[slug]/agriculture`) | Live             | `GET /v1/agriculture` (windows, rain, soil, water balance, GDD, 16-day charts, crop calendar), `/v1/history` + `/v1/normals` (30 days against normal), `/v1/enso`. When the Worker answers `available: false` the card says why from its `reason`. Shamwari's briefing and advice line need an account: the cards say so while sign-in is off |
| Season line and "About {place}" rows                       | Live             | `GET /v1/locations/profile`: the season in the place's month (local names), climate zone, typical month, next season, crop calendar. A place with no crop calendar names no crops; derived values say "estimated"                                                                                                                             |
| Weather map card and the bar's Map button                  | **Placeholder**  | Say the map is coming (`src/app/map.tsx`). The map needs tile routes on the Cloudflare backend first (#55; see "Needs a Cloudflare route first")                                                                                                                                                                                              |
| Explore / search                                           | Live             | `GET /v1/search?q=`                                                                                                                                                                                                                                                                                                                           |
| Use my location                                            | Live             | `GET /v1/geo?lat&lon&autoCreate=true` names the exact place under the fix. Nothing is stored; the app has no route that creates a place                                                                                                                                                                                                       |
| Shamwari AI chat                                           | **Paused**       | Paused as on the web (`FLAGS.shamwari_chat` in `src/shared/feature-flags.ts`): the route redirects home and nothing links to it. When on: the full-viewport chat screen (`src/app/(tabs)/shamwari.tsx`) against `POST /v1/ai/chat`                                                                                                            |
| Activities: picker, advice, Community lane, hero line      | Live             | Activities from `GET /v1/activities`, ratings from the Worker's rules at `GET /v1/suitability`, evaluated on the device. The picks are stored on this device only and are never sent anywhere (not to the API, a device profile or an AI route). With the rules unreachable the screens say so and show no rating                             |
| Community reports (list, upvote, report wizard)            | **Switched off** | Built against the Worker's contract (mukoko-weather PR #401); `GET /v1/reports` answers 404 on production today. Behind `COMMUNITY_REPORTS_ENABLED` in `src/api/reports.ts`, pinned off by a test: with it off no request is made, the card says reports are not live, and the wizard cannot send                                             |
| Shamwari insight and follow-up on the location page        | **Switched off** | Signed-in only on the web. With sign-in off (below) the page shows the signed-out card, which says why. The signed-in cards (`POST /v1/ai/summary`, `/v1/ai/followup`) are built behind the same switch and send no activities                                                                                                                |
| Brand fonts (Noto Serif + Noto Sans + JetBrains Mono)      | Live             | Bundled via `@expo-google-fonts/*`                                                                                                                                                                                                                                                                                                            |
| Device identity (SecureStore UUID)                         | Live             | Generated on first launch                                                                                                                                                                                                                                                                                                                     |
| Device registration                                        | **Switched off** | `POST /v1/devices` with the install id and nothing else, behind `DEVICE_REGISTRATION_ENABLED` in `src/device/register.ts` (off: a person's preferences are to live in their own synced database, so the server-side device profile is being retired). Even when on, development builds log and skip it                                        |
| Measurement (first open, forecast shown, place saved)      | **Queued only**  | Events are validated and queued on the phone (`src/analytics`); the switch is on My → Privacy. Nothing is sent until the API serves `POST /v1/events` (mukoko-dev/mukoko-weather#438); then flip `EVENTS_UPLOAD_ENABLED`                                                                                                                      |
| WorkOS AuthKit sign-in                                     | **Switched off** | The API has no route to exchange the code for a session, so the screen says "Sign-in isn't available yet" and keeps no session. Flip `SIGN_IN_AVAILABLE` in `src/api/auth.ts` once it exists (design: issue #41)                                                                                                                              |

### Needs a Cloudflare route first

These are the gaps between the app and the Cloudflare backend. Each is a server
change, not an app change:

- **Sign-in:** a token-exchange route on the Mukoko or Nyuchi API that takes
  `{ code, codeVerifier, redirectUri }` and answers a session, holding the
  WorkOS secret. Issue #41 has the design.
- **Map tiles (the weather map):** weather overlay tiles (XYZ + TileJSON) and
  base-map vector tiles with a style, behind the one gateway. The app may not
  call a tile provider or a second host.
- **Shamwari's farm advice and agronomy briefing:** `POST /v1/ai/agriculture`
  (the web's `{location, activities, mode: "snapshot" | "briefing"}` request,
  answering `{text, source, cached, mode, generatedAt}`), signed-in only, so it
  waits for the sign-in route above.
- **Community reports:** deploy `POST /v1/reports`, `GET /v1/reports` and
  `POST /v1/reports/upvote` (mukoko-weather PR #401), then flip
  `COMMUNITY_REPORTS_ENABLED`. The model's follow-up questions for the wizard
  (`POST /v1/reports/clarify`) are not served by any Worker; the wizard uses
  the Worker's fixed questions meanwhile.
- **Measurement:** `POST /v1/events` and `POST /v1/events/forget` on the
  weather API (proposal: mukoko-dev/mukoko-weather#438), then flip
  `EVENTS_UPLOAD_ENABLED`. The app already queues the events.
- **Creating a place:** belongs to the Nyuchi API, not to a Worker and not to
  this app. GPS uses `autoCreate=true`, which names the spot without storing it.

## One backend only

Owner decisions (2026-11-01): the app connects to the Cloudflare backend and
never to a website's server, and it connects to the API, never to a database.
This is enforced, not just written down:

- `src/api/client.ts` holds the one base URL and the table of routes. A value of
  `EXPO_PUBLIC_API_URL` on any host but `weather-api.mukoko.com` or
  `api.mukoko.com` is ignored.
- `scripts/check-cloudflare-only.mjs` reads every text file in the project and
  fails on a retired host, a database URL or name, a database or hosting-platform
  package, a direct weather-provider call, or a URL on a Mukoko host that is
  not on its allow-list. `npm test` runs it
  (`src/__tests__/cloudflare-only.test.ts`), so the org's `vite-plus / test`
  check runs it on every pull request.

## WorkOS environment variables

The hosted sign-in flow needs three values:

- `EXPO_PUBLIC_WORKOS_CLIENT_ID` — from the WorkOS dashboard (public-safe)
- `EXPO_PUBLIC_WORKOS_AUTHKIT_DOMAIN` — your AuthKit hosted domain
  (e.g. `https://auth.mukoko.com`)
- A redirect URI registered with WorkOS: `mukoko://sign-in-callback`

The WorkOS **client secret** stays on the mukoko-weather server (used by the
code-exchange endpoint). It must never appear in the mobile bundle.

## Brand kit

Tokens mirror `mukoko-weather/src/app/globals.css`. If you change a mineral
hex or spacing value in `src/brand/tokens.ts`, update the web token at the
same time so the apps stay in lock-step.

These are the **seven minerals** — one of the three families in the
[Mzizi](https://mzizi.dev) palette's twenty-one. The heritage and experimental
families are not used here.

- Cobalt `#0047AB` — primary CTAs, links
- Tanzanite `#4B0082` — brand mark, AI premium
- Malachite `#004D40` — success, growth
- Gold `#5D4037` — warmth, sun
- Terracotta `#A0522D` — earth, grounding
- Sodalite `#283593` — Shamwari / AI surfaces
- Copper `#BF5A36` — community, reports

## Tests

```bash
npm test
```

53 test files, covering the API client (URL building, base-URL rules, all three
error formats), each route against answers recorded from the weather Worker, the
chat, device and sign-in behaviour, the one-backend guard, device identity, the
shared weather/i18n/locations/ICAO helpers, the web's chart data and sun times
with the web's own vectors (and the viewer's clock made hostile), the chart's
geometry, text alternative, touch and VoiceOver steps, brand tokens, and component render
tests via `@testing-library/react-native` (`src/__tests__/` plus colocated
`*.test.ts(x)` files). The recorded answers are in `src/api/__fixtures__/`
(GET reads of `weather-api.mukoko.com` on 2026-11-01); no test touches the
network, and none writes to a production endpoint.

The org's `vite-plus / test` check runs `npm test` on every pull request, and
`vite-plus / check` runs the formatter, lint and type check. No workflow runs
`npm run typecheck` on its own or any EAS build.

## Native build

Expo's pre-build flow creates the `/ios` and `/android` folders on demand:

```bash
npx expo prebuild               # generates native projects (clears ios/ and android/ first; the default since SDK 57)
npx expo run:ios                # build + launch iOS app
npx expo run:android            # build + launch Android app
```

Both folders are gitignored — regenerate them whenever `app.json` changes.

## Licence

⚠️ **The `LICENSE` file in this repository is unmodified `create-expo-app`
boilerplate** — it is the MIT licence with copyright attributed to _650
Industries, Inc. (aka Expo)_, not to Nyuchi. `package.json` declares no
`license` field and is marked `private`.

Nothing here is licensed to anyone yet. The LICENSE file needs replacing with
whichever licence is actually intended before this README can claim one.

© Nyuchi Africa (PVT) Ltd.
