# Store privacy answers

Answers for Apple's App Privacy questionnaire (the "nutrition label") and
Google Play's Data safety form, for the build on `staging` as of 2026-11-02.
Refs #54.

Every answer below was checked against the code, not against intentions. If a
switch named here changes, the answers change with it; update this file in the
same pull request.

## What the app actually sends

Every request goes through `apiFetch` in `src/api/client.ts` to the weather
API (`weather-api.mukoko.com`), with the header `X-Mukoko-Client:
mukoko-mobile/<ios|android>` and, only if a session exists, a bearer token.
There is no analytics, advertising, crash-reporting or attribution SDK in
`package.json`.

| Call (`ROUTES`)                     | Sent by                                                         | What leaves the phone                                                                             | Live?                                           |
| ----------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `GET /v1/weather?lat&lon`           | Weather home, a place's page                                    | The coordinate of the place shown. On the home tab that is the GPS fix (`Accuracy.High`, precise) | Yes                                             |
| `GET /v1/geo?lat&lon[&autoCreate]`  | Home (name the place under the fix), Settings "Use my location" | The GPS fix (`Accuracy.High` on home, `Accuracy.Balanced` in Settings)                            | Yes                                             |
| `GET /v1/search?q`                  | Explore                                                         | What the person types in the search box                                                           | Yes                                             |
| `GET /v1/locations?slug`            | A place's page                                                  | The place's slug                                                                                  | Yes                                             |
| `POST /v1/ai/chat`                  | Shamwari tab                                                    | The message, up to the last messages of the conversation, and the activities picked in Settings   | Yes                                             |
| `POST /v1/devices`                  | `registerDevice()` in `src/device/register.ts`                  | The per-install id (a random UUID kept in SecureStore)                                            | **No.** `DEVICE_REGISTRATION_ENABLED = false`   |
| Sign-in (WorkOS, `auth.mukoko.com`) | Sign-in screen                                                  | Email and whatever the person enters on the hosted page                                           | **No.** `SIGN_IN_AVAILABLE = false` (issue #41) |

One request does not go to our API: **EAS Update** (`expo-updates`). On launch
the app asks Expo's update server (`u.expo.dev`) for a newer JavaScript bundle.
That request carries the platform, the runtime version, the update channel and
an `EAS-Client-ID` header, a random per-install UUID that `expo-updates`
creates (`EASClientID` in `ios/EXUpdates/AppLoader/FileDownloader.swift` and
its Android twin). Expo also counts these checks in EAS Insights ("App usage"),
which is aggregate usage by platform and version. It is not tied to a person.

Saved places, the theme and the picked activities stay on the phone
(`src/state/preferences.ts`) while device registration is off.

What the backend does with it (from `mukoko-dev/mukoko-weather`
`workers/README.md`): the Workers log no payloads, coordinates or keys; query
strings are redacted in traces; `geo?autoCreate=true` names the point and
writes no place, though the geocoder's answer for the ~1 km cell is cached in
KV (a day for a hit, ten minutes for a miss); the `shamwari` AI Gateway runs with logging off. Weather
answers are cached by place or coordinate, not by person. To answer a coordinate,
the backend asks a weather provider and a reverse geocoder for that point, with
no identifier attached.

## Apple App Privacy

**Does the app collect data?** Yes.

**Tracking?** No. The app does not link data with other companies' data for
advertising, does not share it with data brokers, and has no IDFA access
(no `NSUserTrackingUsageDescription`, no App Tracking Transparency prompt).

| Data type (Apple's name)                                                                                        | Collected? | Linked to the user? | Used for tracking? | Purposes                     | Why                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ---------- | ------------------- | ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location: Precise Location                                                                                      | Yes        | No                  | No                 | App Functionality            | The GPS fix is sent to fetch the forecast and name the place. No account, no id with it.                                                           |
| Location: Coarse Location                                                                                       | Yes        | No                  | No                 | App Functionality            | When a person allows only approximate location on iOS, that is what is sent. Declare both.                                                         |
| User Content: Other User Content                                                                                | Yes        | No                  | No                 | App Functionality            | Shamwari messages leave the phone. If you can confirm they are processed in real time and never retained, Apple allows "not collected"; see below. |
| Identifiers: Device ID                                                                                          | Yes        | No                  | No                 | App Functionality, Analytics | The `EAS-Client-ID` on EAS Update checks; Expo aggregates them into usage counts we can see.                                                       |
| Search History                                                                                                  | Yes        | No                  | No                 | App Functionality            | Search text is sent to find places; the backend caches answers per query (up to a day) and passes the text to a geocoder. Declared to be safe.     |
| Contact Info, Health, Financial, Contacts, Browsing History, Purchases, Diagnostics, Sensitive Info, Usage Data | No         |                     |                    |                              | Nothing in the app reads or sends these.                                                                                                           |

Apple's rule on real-time processing: data "processed only in real time to
service the request and not retained" is not "collected". Search text does
not qualify (answers are cached per query), and Shamwari messages may, because
gateway logging is off. Declare
Shamwari messages as collected unless the backend owner confirms in writing
that no message is stored anywhere (gateway, Worker, model provider). Over-
declaring is safe; under-declaring is a rejection or a removal.

**When sign-in (#41) ships**, add: Contact Info: Email Address (Linked: Yes,
App Functionality), Identifiers: User ID (Linked: Yes, App Functionality). If
the account syncs saved places or preferences, add the matching rows as
Linked. Apple guideline 5.1.1(v) then also requires an in-app way to delete
the account, and guideline 4.8 requires Sign in with Apple (or an equivalent
privacy-preserving login) if the sign-in page offers Google or another
third-party login.

**When device registration is switched on**, the install id goes to our API
too: Identifiers: Device ID stays (now also to us), still Not Linked while there
is no account.

### Privacy manifest

Expo SDK 58 builds a `PrivacyInfo.xcprivacy` from the manifests that ship in
each native library (SecureStore, file system, user defaults and so on). We
add nothing of our own today. Read the generated file in the first iOS build's
logs or archive and check it matches the table above; add
`ios.privacyManifests` in `app.json` only if Apple's upload check reports a
missing required-reason API.

### Location purpose string (Info.plist)

`app.json` now sets, through the `expo-location` plugin:

> mukoko weather uses your location to show the forecast for exactly where you
> are, whether that is a farm, a school or a lodge. It is used only while the
> app is open.

and removes the "Always" location keys, the motion key and the temporary
full-accuracy key, which the app never uses. Apple reviewers reject purpose
strings that do not say why (guideline 5.1.1), and question "Always" keys in
an app with no background location. Checked with
`npx expo config --type introspect`: the generated Info.plist holds only
`NSLocationWhenInUseUsageDescription`.

`ios.config.usesNonExemptEncryption: false` sets `ITSAppUsesNonExemptEncryption`
so TestFlight does not stop every build for the export-compliance question.
That is true while the app only uses the operating system's HTTPS; revisit if
custom cryptography is ever added.

### Age rating

Answer Apple's questionnaire (and Play's IARC questionnaire) truthfully. The
answer that needs thought is Shamwari: it is an AI chat that answers free text.
Where a questionnaire asks about AI chat, user-generated content or
unrestricted interaction, say yes, and describe the guardrails (the AI Gateway's
guardrails and the personal-data refusal in the AI Worker). Expect a higher
rating than 4+ / Everyone if the question is answered yes; that is the honest
outcome, not something to work around.

## Google Play Data safety

**Does your app collect or share any of the required user data types?** Yes.

**Is all of the user data collected by your app encrypted in transit?** Yes
(HTTPS only).

**Do you provide a way for users to request that their data is deleted?** No
account exists, and nothing is stored against a person. Answer "No" while
sign-in is off. When #41 ships, this becomes "Yes" with a deletion URL.

| Data type (Play's name)             | Collected | Shared | Ephemeral?                   | Required or optional                        | Purposes                     |
| ----------------------------------- | --------- | ------ | ---------------------------- | ------------------------------------------- | ---------------------------- |
| Location: Approximate location      | Yes       | Yes    | No                           | Optional (search works without it)          | App functionality            |
| Location: Precise location          | Yes       | Yes    | No                           | Optional                                    | App functionality            |
| App activity: In-app search history | Yes       | Yes    | No                           | Optional (only if the person searches)      | App functionality            |
| Messages: Other in-app messages     | Yes       | No     | Yes, if the backend confirms | Optional (only if the person uses Shamwari) | App functionality            |
| Device or other IDs                 | Yes       | No     | No                           | Required (EAS Update check)                 | App functionality, Analytics |

Why "Shared: Yes" for location and search. Google does not count a transfer
to a service provider that processes data on our behalf under contract as
sharing. To answer a coordinate or a search, the backend passes it, with no
identifier, to a weather provider and to a public geocoder (Nominatim, run by
the OpenStreetMap Foundation under a usage policy, not a processing contract).
That makes the honest default "Shared: Yes, App functionality". Switch to "No"
only if counsel confirms every recipient is a contracted service provider.
Shamwari messages go only to our AI Worker and Cloudflare's model service,
which is our processor; Expo receives the update check as our update service.

Why "Ephemeral: No" for location and search. Answers are cached per place,
coordinate or query in the backend (KV, up to a day). The cache holds no
person, but it is not "in memory only, for the request" as Play defines
ephemeral, so do not tick it.

**Android permissions** in the merged manifest
(`npx expo config --type introspect`): `INTERNET`, `ACCESS_COARSE_LOCATION`,
`ACCESS_FINE_LOCATION`. `app.json` blocks four that the default Android
template (and, for storage, the `expo-file-system` plugin) add and the app
never uses: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`,
`SYSTEM_ALERT_WINDOW` ("display over other apps", only the development menu
needs it) and `VIBRATE`. Without the block the Play listing would show storage
and draw-over-other-apps permissions. Check the permission list Play Console
shows for the first AAB against this paragraph.
