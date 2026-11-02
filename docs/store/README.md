# Store readiness

What stands between `staging` and the App Store and Google Play, what this
repository now holds for it, and the steps only the owner can take. Nothing
here has been built, signed or submitted. Refs #54.

| File                    | What it holds                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `docs/store/README.md`  | This page: the failed build, the EAS setup, assets, screenshots, the owner checklist |
| `docs/store/listing.md` | Store listing text for both stores                                                   |
| `docs/store/privacy.md` | Apple App Privacy and Google Data safety answers, checked against the code           |
| `docs/payments.md`      | In-app purchase versus selling business plans on the web (design only)               |

## Where things stand (2026-11-02)

| Build                            | SDK | Result                                                                        |
| -------------------------------- | --- | ----------------------------------------------------------------------------- |
| Android `production`, 2026-06-29 | 56  | Failed in "Install dependencies" after 24 s. The only store build ever made   |
| Android `preview`, 2026-11-01    | 58  | Finished. Internal APK                                                        |
| iOS `preview`, 2026-11-01        | 58  | Finished. **Simulator only** (`ios.simulator: true`); cannot go to TestFlight |

The app is in neither store. There is no App Store Connect record, no App
Store Connect API key on the Expo account, and no Play Console upload yet.

## Why the 2026-06-29 production build failed

EAS keeps build logs for about a month, and this build's logs expired with it
(`build:view` lists no log files), so the cause was reproduced instead: check
out the commit it built (`495b45c`) and run `npm ci`, which is what EAS runs in
that phase.

```text
npm error code ERESOLVE
npm error While resolving: jest-expo@56.0.5
npm error Found: @react-native/jest-preset@0.86.0
npm error   dev @react-native/jest-preset@"^0.86.0" from the root project
npm error Could not resolve dependency:
npm error peer @react-native/jest-preset@"^0.85.0" from jest-expo@56.0.5
```

**Root cause:** a peer-dependency conflict in the dev dependencies. The project
was on Expo SDK 56 (React Native 0.85.3), whose `jest-expo@56` needs
`@react-native/jest-preset@^0.85`, but `package.json` asked for `^0.86.0`.
`npm ci` refuses an unresolvable peer tree, so the build stopped before any
native step. EAS installs dev dependencies too, which is why a test-only
package broke a store build. Fast failure (24 s) and the phase named in the
error both match.

**Still relevant on SDK 58? No.** On `staging` today:

- `npm ci` from a clean worktree installs 1,355 packages with no ERESOLVE
  (Node 24.15; deprecation warnings only).
- `npx expo install --check`: "Dependencies are up to date". The pairs now
  agree: `@react-native/jest-preset` 0.88.1 with `react-native` 0.88.1 and
  `jest-expo` ~58.0.13.
- `npx expo-doctor`: 20 of 20 checks passed.
- The 2026-11-01 SDK 58 preview builds ran the same install phase on EAS and
  finished. The production profile uses the same build image and install step.

Node: neither `eas.json` nor `.nvmrc` pins Node, so EAS uses its default image
for SDK 58, which meets the floor in the README (22.13+ or 24.3+). Pin it with
`node` on the build profile only if EAS ever picks an older one.

To keep this from coming back: when bumping the SDK, run
`npx expo install --fix` and then `npm ci` in a clean checkout before starting
a store build; `npx expo install --check` catches a mismatched
`@react-native/jest-preset`.

## EAS configuration (this pull request)

- **`build.production`** is the store and TestFlight profile on both
  platforms. It now says so explicitly: `distribution: "store"` and
  `ios.simulator: false`, so an iOS production build is a signed device build
  that App Store Connect accepts. `preview` and `development` are unchanged
  (the iOS preview stays a simulator build for quick checks).
- **`submit.production.ios`** exists, with two owner-fill fields:
  - `ascAppId`: the numeric Apple ID of the app record in App Store Connect
    (App Information, "Apple ID"). Not a secret.
  - `appleTeamId`: the 10-character Team ID from the Apple Developer account
    (Membership details). Not a secret.

  Both hold `OWNER-FILL-...` placeholders. EAS validates them only when
  submitting to iOS, and rejects the placeholders with a clear message
  ("should consist only of digits"), so nothing can be submitted to the wrong
  app by accident. Android submission is unaffected. Neither field supports an
  environment variable (only the `ascApiKey*` fields do), so the real values go
  into `eas.json` in a later pull request.

- **No App Store Connect API key in `eas.json`.** The key belongs on the Expo
  account (`eas credentials`, "App Store Connect: Manage your API Key"), where
  EAS Submit finds it for the bundle id without any path in the repository.
- **Android submit** is unchanged: Play Console internal track, `draft`.

Commands, for the owner, once the checklist below is done:

```bash
# iOS: build a signed store build and send it to TestFlight in one go
npx eas-cli build --platform ios --profile production --auto-submit

# Android: build the AAB and upload it to the internal track as a draft
npx eas-cli build --platform android --profile production --auto-submit
```

Checked without logging in: `npx expo config --type public` succeeds;
`@expo/eas-json` resolves every build profile (production: store, device, AAB;
preview and development unchanged) and the Android submit profile; the iOS
submit profile fails only on the two placeholders, as intended.

### `app.json` changes

- iOS location purpose string rewritten; "Always" location, motion and
  temporary full-accuracy keys removed (none are used). See `privacy.md`.
- `ios.config.usesNonExemptEncryption: false` (HTTPS only; skips the
  export-compliance stop on every TestFlight build).
- `android.blockedPermissions`: `READ_EXTERNAL_STORAGE`,
  `WRITE_EXTERNAL_STORAGE` (added by `expo-file-system`, unused).

## Brand assets: what is right and what is missing

The owner's point stands: the store will show the icon and the first
screenshot before anything else, and both need work.

| Asset                             | File                                                      | State                                                                                                                                                                                                                                                                                       |
| --------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS app icon                      | `assets/icon.png` (same file as `assets/images/icon.png`) | Mukoko mark (seven hexagons on dark tanzanite). **Has transparent rounded corners.** iOS needs a full-bleed square with no transparency: Expo flattens the alpha onto white, so the corners show white slivers inside Apple's own mask. Needs a square 1024×1024 PNG, no alpha, no rounding |
| Android adaptive icon, foreground | `assets/images/android-icon-foreground.png`               | Mukoko mark, but it fills about 91–95% of the canvas. Android crops adaptive icons to the inner 66 of 108 dp (about 61%), so the outer hexagons get cut. Needs the mark scaled into the centre 61%                                                                                          |
| Android adaptive icon, background | `backgroundColor: #F3E5F5` in `app.json`                  | Fine                                                                                                                                                                                                                                                                                        |
| Android themed (monochrome) icon  | `assets/images/android-icon-monochrome.png`               | **Wrong shape.** It is a full rounded tile with white hexagons; Android uses only the alpha of this image, so it renders as a solid square in the user's theme colour. Needs the hexagons alone, single colour, on transparency, inside the same 61% safe zone                              |
| Splash, light and dark            | `splash-icon.png`, `splash-icon-dark.png`                 | Mukoko mark. Fine                                                                                                                                                                                                                                                                           |
| Web favicon                       | `assets/images/favicon.png`                               | Mukoko mark. Fine                                                                                                                                                                                                                                                                           |
| Play Store icon                   | none                                                      | **Missing.** 512×512, 32-bit PNG, up to 1 MB, uploaded in Play Console (not from the build). Full square; Play applies its own mask                                                                                                                                                         |
| Play feature graphic              | none                                                      | **Missing.** 1024×500, JPEG or 24-bit PNG, no alpha. Required to publish                                                                                                                                                                                                                    |
| Brand on the first screen         | Weather home                                              | **Missing.** The Explore and Settings tabs show `MukokoLogo` in `Header`; the Weather home, which is the first screenshot, shows no Mukoko mark or wordmark. Home-screen components are being changed in #50–#53, so this is for that work, not this pull request                           |

Expo template leftovers still in `assets/images`: `expo-logo.png`,
`expo-badge.png`, `expo-badge-white.png`, `react-logo*.png`,
`tutorial-web.png`, `logo-glow.png` and the folder `expo-defaults-backup/`.
They are used only by `src/components/animated-icon*.tsx` and
`src/components/web-badge.tsx`, which no screen imports, so Metro leaves them
out of the bundle and no user sees them. Delete the files and the two unused
components in a follow-up so nobody reaches for them.

## Screenshots

Required sizes as published by Apple and Google on 2026-11-02. Capture from a
production-like build (not Expo Go, no development overlay), light theme first,
with a real place on screen.

### App Store

| Display     | Pixel size (portrait)                 | Needed?                                                                                                        |
| ----------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| iPhone 6.9" | 1320×2868 (also 1290×2796, 1260×2736) | Yes. App Store Connect scales these down for smaller iPhones                                                   |
| iPhone 6.5" | 1284×2778 or 1242×2688                | Only if 6.9" is not given; supply anyway if App Store Connect asks                                             |
| iPad 13"    | 2064×2752 or 2048×2732                | **Yes while `ios.supportsTablet` is `true`.** Set it to `false` to drop the iPad listing and these screenshots |

PNG or JPEG, 1 to 10 per size, no transparency.

### Google Play

| Asset             | Size                                                                                                                                                                                               | Needed?                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Phone screenshots | 2 to 8; 9:16 portrait; each side between 320 and 3840 px. Use 1080×1920 or larger (at least 1080 px on the short side to be eligible for Play's promotional placements, which also need 4 or more) | Yes                       |
| Feature graphic   | 1024×500, JPEG or 24-bit PNG, no alpha                                                                                                                                                             | Yes                       |
| App icon          | 512×512, 32-bit PNG                                                                                                                                                                                | Yes                       |
| 7" and 10" tablet | Same rules as phone                                                                                                                                                                                | Only to appear on tablets |

### Which screens, in order

1. **Weather home, at a real place**: sky, hero temperature, condition, the
   Conditions card with the hour-by-hour strip. Caption: "The forecast for
   your own place".
2. **The 7-day card and tiles** (scrolled): "The next hours and the next
   seven days".
3. **Explore**, browsing by what people do there (farming, tourism, schools):
   "Find any place, or browse by what you do".
4. **A saved place's page** reached from Explore (a farm town such as
   Marondera): "Save the places you care about".
5. **Shamwari** with one real question and answer about the place: "Ask
   Shamwari about the weather".
6. **Dark theme** of the home screen.
7. When #50 to #53 merge: a frost notice, air quality, and the agriculture
   card, each with its own caption.

Use the same place across shots where you can, and keep captions short and in
the brand voice; no device frames are required by either store.

## Owner checklist

Ordered. Each step is account work only the owner can do; nothing here runs a
build until step 10.

1. **D-U-N-S number** for Nyuchi Africa (PVT) Ltd (free from Dun & Bradstreet;
   allow up to 2 weeks). Both Apple (organisation enrolment) and Google
   (organisation account) ask for it.
2. **Apple Developer Program** enrolment as the organisation (USD 99 a year).
   Note the **Team ID** (Membership details).
3. **App Store Connect app record**: My Apps, +, New App; platform iOS; name
   "mukoko weather"; primary language; bundle id
   `africa.nyuchi.mukoko.weather` (register it under Identifiers first if it is
   not offered); SKU of your choice. Note the app's **Apple ID** (App
   Information), which is `ascAppId`.
4. **Fill `eas.json`**: replace the two `OWNER-FILL-...` values in
   `submit.production.ios` with the Apple ID and Team ID (neither is secret),
   in a pull request.
5. **App Store Connect API key into EAS**: App Store Connect, Users and
   Access, Integrations, App Store Connect API, generate a key with the App
   Manager role; download the `.p8` once. Then `npx eas-cli credentials`, iOS,
   production, "App Store Connect: Manage your API Key", and upload it. Never
   commit the `.p8`.
6. **iOS signing**: let EAS create and hold the distribution certificate and
   provisioning profile on the first iOS production build (it asks to log in
   to the Apple account once). Do not enable push or other capabilities the
   app does not use.
7. **Google Play Console** developer account as the organisation (USD 25 once),
   with identity verification. If it is created as a **personal** account,
   Google requires a closed test with at least 12 testers for 14 days before
   production access; an organisation account does not.
8. **Play Console app**: Create app, name "mukoko weather", default language,
   App, Free; accept the declarations. Fill the App content section: privacy
   policy URL, Data safety (from `privacy.md`), content rating (IARC), target
   audience, ads (none), app access (no login needed).
9. **Google service account for EAS Submit**: in Google Cloud, create a
   service account and a JSON key; in Play Console, Users and permissions,
   invite the service account's email with release permissions for this app.
   Then `npx eas-cli credentials`, Android, production, "Google Service
   Account", and upload the JSON. Never commit the JSON.
10. **First Android upload**: Google requires the very first AAB to be
    uploaded by hand in Play Console before the API (and EAS Submit) can
    upload. Run `npx eas-cli build -p android --profile production`, download
    the AAB from the build page, and upload it to Testing, Internal testing.
    Opt in to **Play App Signing** when asked (Google holds the app signing
    key; EAS keeps the upload key). After this, `--auto-submit` works.
11. **First iOS build to TestFlight**:
    `npx eas-cli build -p ios --profile production --auto-submit`. Answer the
    export-compliance question once if App Store Connect still asks (the
    `usesNonExemptEncryption` key should prevent it).
12. **TestFlight internal testers**: App Store Connect, TestFlight, Internal
    Testing, create a group, add up to 100 people who are users on the team;
    builds reach them without review. External testers (anyone with an email
    or a public link) need one Beta App Review per version.
13. **Play internal testing**: add testers' Google accounts or a Google Group
    to the internal track; share the opt-in link.
14. **Brand assets** before any public listing: the square iOS icon, the
    corrected adaptive foreground and monochrome icons, the 512 px Play icon,
    the feature graphic, and a Mukoko mark on the home screen (see the table
    above).
15. **Store listings**: paste the text from `listing.md`, the URLs from #54,
    and the screenshots; App Privacy answers from `privacy.md`; age rating
    questionnaire; App Store category Weather.
16. **Make sure the privacy and help pages load** for a logged-out visitor
    without a bot challenge (see `listing.md`).
17. **Submit for review**: App Store "Add for Review" on the version; Play
    production release (or a closed test first). Expect questions on location
    use and on Shamwari; the answers are in `privacy.md`.
18. **Before sign-in (#41) ships**: update both privacy forms, add in-app
    account deletion, and add Sign in with Apple if any third-party login is
    offered.
