# Store listing text

Draft text for the App Store and Google Play listings of **mukoko weather**, a
Mukoko Africa product by Nyuchi Africa. Refs #54.

Voice: community storytelling and service, not persuasion. Say what the app
does for a person in their own place; no superlatives, no "best", no "#1", no
claims about accuracy we cannot show. Character counts are measured; stay
inside them when editing.

Before pasting, read the description against the build you are submitting and
delete any line for a screen that is not in that build. Lines marked _(when
shipped)_ depend on open pull requests (#50 to #53) and must come out if those
have not merged into the submitted build.

## URLs and contact

The repository's one-backend guard (`scripts/check-cloudflare-only.mjs`)
fails on any text that names the web app's host, so the exact URLs are kept in
issue #54, not here. They are:

| Field                    | Value                                                    |
| ------------------------ | -------------------------------------------------------- |
| Support URL              | the web app's `/help` page (exact URL in #54)            |
| Marketing URL (optional) | the web app's home page (exact URL in #54)               |
| Privacy policy URL       | the web app's `/privacy` page (exact URL in #54)         |
| Support email            | `support@mukoko.com`                                     |
| Copyright (App Store)    | `2026 Nyuchi Africa (PVT) Ltd`                           |
| Seller / developer name  | the legal name on the developer account (owner confirms) |

Both stores open these URLs from their own crawlers and reviewers. The web
app sits behind a Cloudflare challenge today (a plain request gets a "Just a
moment..." page), so confirm the `/privacy` and `/help` pages load for a
logged-out visitor without a challenge before submitting.

## App Store (iOS)

| Field                       | Limit | Text                                                                                                                                                                       |
| --------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                        | 30    | `mukoko weather` (14)                                                                                                                                                      |
| Subtitle                    | 30    | `The forecast for your place` (27)                                                                                                                                         |
| Promotional text            | 170   | `A farmer checking the frost line, a teacher planning sports day, a lodge manager reading the sky before a game drive: the forecast for your own place, in seconds.` (162) |
| Keywords (comma, no spaces) | 100   | `forecast,rain,frost,farm,planting,season,hourly,Zimbabwe,Harare,Bulawayo,Africa,local,lodge,school` (98)                                                                  |
| Primary category            | n/a   | Weather                                                                                                                                                                    |
| Secondary category          | n/a   | Lifestyle                                                                                                                                                                  |
| Age rating                  | n/a   | Answer the questionnaire truthfully; see "Age rating" in `privacy.md`                                                                                                      |

Keywords do not repeat words already in the name or subtitle (Apple indexes
those anyway), and name no other company's product.

## Google Play (Android)

| Field             | Limit | Text                                                                                   |
| ----------------- | ----- | -------------------------------------------------------------------------------------- |
| App name          | 30    | `mukoko weather` (14)                                                                  |
| Short description | 80    | `The forecast for your own place, from the farm and the school to the lodge.` (75)     |
| Category          | n/a   | Weather                                                                                |
| Tags              | 5     | Weather, Local, Forecast (pick from Play's list; they are fixed values, not free text) |
| Contact email     | n/a   | `support@mukoko.com`                                                                   |
| Website           | n/a   | the web app's home page (exact URL in #54)                                             |

## Full description (both stores, 4000 characters each)

The same text works for both stores. Plain text: neither store renders
Markdown, so keep the line breaks and the dashes as they are.

```text
Weather is local. The rain that matters is the rain on your field, not the rain in the capital. mukoko weather gives you the forecast for your own place, within seconds of opening the app.

A farmer in Marondera checks whether tonight will bring frost before covering the seedlings. A teacher in Gweru looks at tomorrow afternoon before sports day. A lodge manager in Hwange reads the sky before the evening game drive. Each of them sees the weather for where they are, not for the nearest big city.

What you get
- The weather where you are right now: temperature, feels-like, wind, humidity, pressure, UV and cloud.
- The next hours, hour by hour, and the next seven days.
- Search for any place by name, or browse places by country and by what people do there: farming, mining, tourism, schools, border posts.
- Save the places you care about: home, the farm, your parents' town.
- Shamwari, an AI helper that answers questions about the weather in your words.
- Frost and weather notices for your place (when shipped).
- Air quality, haze and the moon (when shipped).
- Advice for what you do: farming, travel, sport, events (when shipped).

Your place, your way
Use your location for the forecast under your feet, or search for a place without sharing your location at all. Your location is used only while the app is open, to fetch the forecast. You do not need an account.

Made in Africa, for everywhere
mukoko weather began in Zimbabwe and works for any place on Earth. It is a Mukoko Africa product, built by Nyuchi Africa.

Questions or ideas? Write to support@mukoko.com. We read every message.
```

Counted length: about 1,600 characters, well inside both stores' 4,000.

## What's new (first release)

```text
The first release of mukoko weather: the forecast for your own place, the next hours and the next seven days, search and saved places, and Shamwari, the AI weather helper.
```

## Notes for the owner

- **The name.** The brand writes the product as "mukoko weather" (lower case),
  but `app.json` `expo.name` is still "Mukoko Weather", which is the name under
  the icon on the home screen. The store name and the on-device name may
  differ, but readers notice. Decide one and change `app.json` if needed.
- **Places named in the text** (Marondera, Gweru, Hwange) are examples of seed
  places the app ships with. Swap them for places your first testers know.
- **Shamwari** sends what a person types to our weather API, which answers it
  with a model run by Cloudflare. Say nothing in the listing that the privacy
  answers in `privacy.md` do not also say.
