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

Five surfaces: the weather home (GPS plus a 7-day forecast), explore/search,
Shamwari AI chat, a preferences tab, and a per-location detail route.

| Fact              | Value                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Display name      | Mukoko Weather                                                                           |
| npm package name  | `mukoko-mobile` (the repo and app are `mukoko-weather-mobile` / Mukoko Weather)          |
| Bundle ID (iOS)   | `africa.nyuchi.mukoko.weather`                                                           |
| Package (Android) | `africa.nyuchi.mukoko.weather`                                                           |
| URL scheme        | `mukoko://`                                                                              |
| EAS project       | `97f6eb48-2aac-42c2-b13d-5f68f1a86174` (owner `nyuchi-web-services`)                     |
| API base          | `https://weather-api.mukoko.com`; `EXPO_PUBLIC_API_URL` may name another Cloudflare host |

**Not yet released.** `eas.json` defines `development`, `preview` and
`production` build profiles, but the only submit target is Android → Play
Console **internal track, `draft` status**. There is no iOS submit
configuration, and the app is in neither store. EAS Update is set up
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

Every push to `staging` publishes the app's JavaScript to EAS Update
(`.eas/workflows/publish-preview-update.yml`, branch `staging`). To open the
latest one on a phone:

1. Install or update Expo Go to the SDK 58 version (`https://expo.dev/go`) and
   sign in to the Expo account that belongs to the `nyuchi-web-services` team.
2. Open the project's Updates page on expo.dev
   (`https://expo.dev/accounts/nyuchi-web-services/projects/mukoko-weather/updates`),
   pick the `staging` branch and the newest update, and scan the QR code or use
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
      _layout.tsx                # Root Stack — fonts, auth init, device register
      (tabs)/                    # Bottom tab group
        _layout.tsx              # NativeTabs config
        index.tsx                # Weather (home) — GPS, then the shared WeatherPage
        explore.tsx              # Search / add a location
        shamwari.tsx             # AI chat placeholder
        my.tsx                   # Account, device id, sign-in
      location/[slug].tsx        # /location/harare etc. — the same WeatherPage, with Back
      sign-in.tsx                # WorkOS AuthKit launcher
      sign-in-callback.tsx       # OAuth redirect target (mukoko://sign-in-callback)
    brand/
      tokens.ts                  # 7 minerals, spacing, radius, font families
      fonts.ts                   # @expo-google-fonts/* loader map
    theme/
      mzizi.ts                   # Weather screens' tokens, mirrored from the web: space, type scale, radius, touch, page colours
      sky.ts                     # The eight page skies (light + dark), stars, rain streaks
      colors.ts                  # Light + dark palette for the other tabs (mineral-derived)
      typography.ts              # Type scale for the other tabs: hero/display/title/body/mono
    shared/                      # Pure logic ported from the web (hero, hourly outlook, place-time, tile insights), with the web's tests
    api/
      client.ts                  # base URL, ROUTES table, fetch wrapper, error parsing
      weather.ts                 # GET /v1/weather (+ /v1/locations for a slug), converted to the screens' model
      locations.ts               # GET /v1/search, /v1/geo, /v1/locations
      chat.ts                    # POST /v1/ai/chat (Shamwari)
      devices.ts                 # POST /v1/devices (device preference profile)
      auth.ts                    # WorkOS hosted sign-in via expo-auth-session (switched off)
    device/
      identity.ts                # UUID v4 in SecureStore (Android/iOS) / localStorage (web)
      register.ts                # POST /v1/devices with the install id (switched off)
    components/
      BrandText.tsx              # Typography + tone variants
      Header.tsx                 # Wordmark + 7-mineral stripe
      icons/Icon.tsx             # Drawn weather + interface icons (react-native-svg); no emoji
      weather/                   # The location page, one component per web section:
        WeatherScroll.tsx        #   page container: sky, gutters, safe areas, status bar
        WeatherSky.tsx           #   the page sky (expo-linear-gradient)
        SkyHero.tsx              #   the open-sky hero
        ConditionsCard.tsx       #   outlook sentence + hourly strip (place time)
        ConditionTiles.tsx       #   wind, UV, feels like, visibility, rain, humidity, pressure, sun
        DailyCard.tsx            #   the week
        WeatherSkeleton.tsx      #   structural loading state
        WeatherPage.tsx          #   one page for both screens; error state
    hooks/
      usePalette.ts              # Reads OS color scheme -> palette (other tabs)
      usePageColors.ts           # The web's page colours for the weather screens
      useNow.ts                  # The current instant, refreshed each minute
      useReduceMotion.ts         # OS Reduce Motion, live
    test-utils/                  # Mocks and recorded-answer fixtures for the tests
  assets/
    images/                      # Icons, splash, tab glyphs
```

## What's wired vs. switched off

| Surface                                               | Status           | Notes                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Weather home (sky, hero, Conditions, tiles, 7-day)    | Live             | `GET /v1/weather?lat&lon`; the answer is converted to the screens' model in `src/api/weather.ts`                                                                                                                                                                                                       |
| Location detail (`/location/[slug]`)                  | Live             | `GET /v1/locations?slug=` for the coordinate, then `GET /v1/weather`                                                                                                                                                                                                                                   |
| Explore / search                                      | Live             | `GET /v1/search?q=`                                                                                                                                                                                                                                                                                    |
| Use my location                                       | Live             | `GET /v1/geo?lat&lon&autoCreate=true` names the exact place under the fix. Nothing is stored; the app has no route that creates a place                                                                                                                                                                |
| Shamwari AI tab                                       | Live             | Full-viewport chat screen (`src/app/(tabs)/shamwari.tsx`) against `POST /v1/ai/chat`; mirrors the Worker's message-length, history and rate limits                                                                                                                                                     |
| Brand fonts (Noto Serif + Noto Sans + JetBrains Mono) | Live             | Bundled via `@expo-google-fonts/*`                                                                                                                                                                                                                                                                     |
| Device identity (SecureStore UUID)                    | Live             | Generated on first launch                                                                                                                                                                                                                                                                              |
| Device registration                                   | **Switched off** | `POST /v1/devices` with the install id and nothing else, behind `DEVICE_REGISTRATION_ENABLED` in `src/device/register.ts` (off: a person's preferences are to live in their own synced database, so the server-side device profile is being retired). Even when on, development builds log and skip it |
| WorkOS AuthKit sign-in                                | **Switched off** | The API has no route to exchange the code for a session, so the screen says "Sign-in isn't available yet" and keeps no session. Flip `SIGN_IN_AVAILABLE` in `src/api/auth.ts` once it exists (design: issue #41)                                                                                       |

### Needs a Cloudflare route first

These are the gaps between the app and the Cloudflare backend. Each is a server
change, not an app change:

- **Sign-in:** a token-exchange route on the Mukoko or Nyuchi API that takes
  `{ code, codeVerifier, redirectUri }` and answers a session, holding the
  WorkOS secret. Issue #41 has the design.
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

33 test files, covering the API client (URL building, base-URL rules, all three
error formats), each route against answers recorded from the weather Worker, the
chat, device and sign-in behaviour, the one-backend guard, device identity, the
shared weather/i18n/locations/ICAO helpers, brand tokens, and component render
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
