# Mukoko Weather (mobile)

> The Expo / React Native client for
> [Mukoko Weather](https://weather.mukoko.com) — iOS and Android.

[![Lint](https://github.com/nyuchi/mukoko-weather-mobile/actions/workflows/lint.yml/badge.svg)](https://github.com/nyuchi/mukoko-weather-mobile/actions/workflows/lint.yml)
![Expo](https://img.shields.io/badge/Expo-SDK_56-000020?style=flat-square&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?style=flat-square&logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Platforms](https://img.shields.io/badge/Platforms-iOS_%7C_Android-lightgrey?style=flat-square)

**Backend:** [weather.mukoko.com](https://weather.mukoko.com) | **Version:**
1.0.0 | **Distribution:** not yet in either store

---

## What it is

A thin client over the Python API in
[`nyuchi/mukoko-weather`](https://github.com/nyuchi/mukoko-weather). No weather
logic is duplicated here: every call goes to that app's `/api/py/*` endpoints,
and the repo owns only presentation, navigation, device identity and sign-in.

Five surfaces: the weather home (GPS plus a 7-day forecast), explore/search,
Shamwari AI chat, a preferences tab, and a per-location detail route.

| Fact              | Value                                                                           |
| ----------------- | ------------------------------------------------------------------------------- |
| Display name      | Mukoko Weather                                                                  |
| npm package name  | `mukoko-mobile` (the repo and app are `mukoko-weather-mobile` / Mukoko Weather) |
| Bundle ID (iOS)   | `africa.nyuchi.mukoko.weather`                                                  |
| Package (Android) | `africa.nyuchi.mukoko.weather`                                                  |
| URL scheme        | `mukoko://`                                                                     |
| EAS project       | `97f6eb48-2aac-42c2-b13d-5f68f1a86174` (owner `nyuchi-web-services`)            |
| API base          | `https://weather.mukoko.com`, override with `EXPO_PUBLIC_API_URL`               |

**Not yet released.** `eas.json` defines `development`, `preview` and
`production` build profiles, but the only submit target is Android → Play
Console **internal track, `draft` status**. There is no iOS submit
configuration, and the app is in neither store. Note also that `app.json`
declares no `updates` block or `runtimeVersion` even though `eas.json` names
`preview` and `production` EAS Update channels.

## Setup

```bash
cd mukoko-weather-mobile
npm install
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_WORKOS_CLIENT_ID
```

For local development against a Next.js dev server, set:

```env
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000
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

## Verify

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest (smoke tests)
npx expo-doctor     # SDK version + dependency checks
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
        index.tsx                # Weather (home) — GPS + 7-day forecast
        explore.tsx              # Search / add a location
        shamwari.tsx             # AI chat placeholder
        my.tsx                   # Account, device id, sign-in
      location/[slug].tsx        # /location/harare etc.
      sign-in.tsx                # WorkOS AuthKit launcher
      sign-in-callback.tsx       # OAuth redirect target (mukoko://sign-in-callback)
    brand/
      tokens.ts                  # 7 minerals, spacing, radius, font families
      fonts.ts                   # @expo-google-fonts/* loader map
    theme/
      colors.ts                  # Light + dark palette (mineral-derived)
      typography.ts              # Type scale: hero/display/title/body/mono
    api/
      client.ts                  # fetch wrapper -> mukoko-weather /api/py/*
      weather.ts                 # /api/py/weather
      locations.ts               # /api/py/locations/add, /api/py/search, /api/py/geo
      auth.ts                    # WorkOS hosted sign-in via expo-auth-session
    device/
      identity.ts                # UUID v4 in SecureStore (Android/iOS) / localStorage (web)
      register.ts                # POST device.devices payload (STUBBED — see below)
    components/
      BrandText.tsx              # Typography + tone variants
      Header.tsx                 # Wordmark + 7-mineral stripe
      MetricCard.tsx             # Stat card (humidity, wind, etc.)
      WeatherIcon.tsx            # WMO code -> emoji glyph
    hooks/
      usePalette.ts              # Reads OS color scheme -> palette
  assets/
    images/                      # Icons, splash, tab glyphs
```

## What's wired vs. stubbed

| Surface                                               | Status               | Notes                                                                                                                                                                                              |
| ----------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weather home (current + 7-day)                        | Live                 | Calls `GET /api/py/weather?lat&lon`                                                                                                                                                                |
| Location detail (`/location/[slug]`)                  | Live                 | Calls `GET /api/py/weather?location=<slug>`                                                                                                                                                        |
| Explore / add location                                | Live                 | Calls `POST /api/py/locations/add`                                                                                                                                                                 |
| Shamwari AI tab                                       | Live                 | Full-viewport chat screen (`src/app/(tabs)/shamwari.tsx`) against `POST /api/py/chat`; mirrors the server's message-length, history and rate limits                                                |
| Brand fonts (Noto Serif + Noto Sans + JetBrains Mono) | Live                 | Bundled via `@expo-google-fonts/*`                                                                                                                                                                 |
| Device identity (SecureStore UUID)                    | Live                 | Generated on first launch                                                                                                                                                                          |
| Device registration (`device.devices`)                | **Stubbed**          | Server endpoint `POST /api/py/devices/register` doesn't exist yet — payload is logged in dev. Flip `REGISTER_ENABLED` in `src/device/register.ts` once it lands.                                   |
| WorkOS AuthKit sign-in                                | **Stubbed exchange** | The hosted page + redirect work end-to-end, but code exchange returns a stub session. Wire `POST /api/py/auth/mobile/exchange` in mukoko-weather and flip `EXCHANGE_ENABLED` in `src/api/auth.ts`. |

### Why is auth/registration stubbed?

Phase 1A in mukoko-weather is bringing WorkOS AuthKit online for the web. The
mobile token-exchange endpoint and the `device.devices` register endpoint
aren't in main yet. Rather than blocking the bootstrap, we generate a stable
local device id and short-circuit the network calls so the rest of the UI
can be developed and reviewed.

When mukoko-weather ships either endpoint, the changes here are tiny:

- `src/device/register.ts` -> set `REGISTER_ENABLED = true`
- `src/api/auth.ts` -> set `EXCHANGE_ENABLED = true`

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

28 test files, covering the API client and chat client, device identity and
registration payloads, the shared weather/i18n/locations/ICAO helpers, brand
tokens, and component render tests via `@testing-library/react-native`
(`src/__tests__/` plus colocated `*.test.ts(x)` files).

> **These do not run in CI.** The only workflow in this repo is the org lint
> gate; nothing runs `npm test`, `npm run typecheck`, or any EAS build. Run
> them locally before pushing.

## Native build

Expo's pre-build flow creates the `/ios` and `/android` folders on demand:

```bash
npx expo prebuild --clean       # generates native projects
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
