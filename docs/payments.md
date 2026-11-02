# Payments: one page

A design note, not a build. Nothing on the platform takes money today, and no
paywall is planned in this repository until the owner picks a model and a
provider. Refs #54.

The question: should mukoko weather earn through **in-app purchase** in the
mobile app, or by **selling business plans on the web** (API keys from the web
app's `/developers/keys`, and the embeddable widget), or both?

## The starting point

- The product promise, written into the web app's own docs: **all weather data
  is free.** Premium was planned as a single paid plan that unlocks extra map
  layers.
- The web app already issues developer API keys (`/developers/keys`, signed-in
  only, hashed at rest, 10 per person) and serves an embeddable widget. Neither
  is billed.
- The mobile app has no accounts yet: sign-in waits on a token-exchange route
  (#41). Anything sold to a person needs an account to hang it on, or it is
  lost when the phone is.

## Option A: in-app purchase (App Store and Google Play billing)

What it would sell: something used inside the app, for example the premium map
layers, an ad-free promise, or "supporter" status.

**Store rules.**

- Apple (App Review Guideline 3.1.1) and Google (Payments policy): digital
  content, features or subscriptions **unlocked or used inside the app must be
  bought with the store's billing.** The app may not carry its own payment form
  for them, and outside a few storefronts may not point people to a cheaper
  web price. These steering rules have been changing by court order and by
  region (the United States, the European Union, Korea, Japan); check the
  current text for each storefront when deciding.
- Apple 3.1.3(b), multiplatform services: the app may unlock something a person
  bought on the web **only if the same thing is also on sale as an in-app
  purchase**. So selling premium map layers on the web does not avoid in-app
  purchase for those layers; it adds a second price list.
- Every purchase screen, price change and subscription term goes through store
  review. A subscription needs a restore-purchases button, clear terms in the
  app and the listing, and (Apple) a way to manage the subscription.

**Fees** (published terms; confirm at decision time):

| Store       | Standard | Smaller sellers                                                  | Subscriptions                            |
| ----------- | -------- | ---------------------------------------------------------------- | ---------------------------------------- |
| App Store   | 30%      | 15% in the Small Business Program (under USD 1M proceeds a year) | 15% after a subscriber's first paid year |
| Google Play | 30%      | 15% on the first USD 1M of earnings each year                    | 15% from the start                       |

Both stores handle tax, refunds and card acceptance in every country they
sell in, which matters in markets where card payment is hard to set up.

**What it costs to build.** About 4 to 6 engineering weeks:

- An account system first (#41), so a purchase follows the person.
- Store products and prices in both consoles; a paid-apps agreement, tax forms
  and a payout bank account on both (confirm both stores pay out to the bank
  and country the company uses before anything else).
- A billing library in the app (the stores' own SDKs through a React Native
  module, or a hosted subscription service; the owner picks).
- Server-side receipt checks and an entitlement record on the Cloudflare
  backend (App Store Server API and notifications, Google Play Developer API
  and real-time notifications), because the app must not decide on its own
  what someone has paid for.
- Restore purchases, the paywall screens, review time for each.

**What it moves.**

| Metric               | Effect                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Weekly active people | Flat to slightly down. A paywall in front of anything people expected free costs goodwill; behind extras only, it is neutral                           |
| Paying accounts      | Up slowly: individual people, small amounts, many of them. Conversion for consumer weather apps is typically low single-digit percent of active people |
| Revenue per account  | Low (a few dollars a month at most), less 15 to 30% to the store                                                                                       |

## Option B: business plans sold on the web

What it would sell: **API access** (higher limits, commercial use, support) and
**the embeddable widget** for businesses: lodges, schools, farm co-operatives,
agri-dealers, radio and news sites, insurers, NGOs. Billed per organisation,
monthly or yearly, on the web app.

**Store rules.** API keys and embeds are used on the buyer's own website or
server, not inside the mobile app, so the stores' billing rules do not apply
(Apple 3.1.3(c) also covers services sold to organisations for their people).
Two conditions keep it that way:

- The mobile app sells nothing and links to no purchase page (outside the
  storefronts where links are now allowed, and only if we choose to).
- Nothing bought on the web unlocks a feature **inside** the app. If it ever
  does, Option A's rules come back for that feature.

**Fees.** The payment provider's, typically 3 to 5% plus a small fixed fee
per card charge; a merchant-of-record service (which also files sales tax and
VAT for us) costs more, often 5% or more. Mobile money and local bank
transfers have their own, often lower, fees.

**Provider.** The owner picks. The deciding question is which providers accept
a seller registered in Zimbabwe and pay out to the company's bank: some of the
largest card processors do not onboard Zimbabwean businesses at all. Kinds to
compare: merchant-of-record services; African payment gateways that take cards
and mobile money across several countries; a Zimbabwean gateway for EcoCash,
OneMoney and local cards; and plain invoicing with bank transfer for the first
few business customers, which needs no provider at all.

**What it costs to build.** About 3 to 4 engineering weeks, much of it on
pieces that exist:

- Plans and limits per key on the Cloudflare backend (the keys exist; usage
  metering and per-plan rate limits do not).
- Checkout and the provider's webhooks into an entitlement record per
  organisation (the platform already has organisations and memberships).
- Invoices, receipts, upgrade, downgrade and cancel pages on the web app.
- Can start smaller: invoice the first customers by hand, and build checkout
  when there are enough of them to need it.

**What it moves.**

| Metric               | Effect                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Weekly active people | Neutral in the app, likely up overall: every embed on a lodge's or a school's site puts the forecast in front of new people |
| Paying accounts      | Few: organisations, not people. Tens, then hundreds                                                                         |
| Revenue per account  | High: tens to hundreds of dollars a month per organisation, less a few percent to the provider                              |

## Side by side

|                                 | A: in-app purchase                          | B: business plans on the web                 |
| ------------------------------- | ------------------------------------------- | -------------------------------------------- |
| Who pays                        | People using the app                        | Organisations using the API or the widget    |
| Fee                             | 15 to 30% to the store                      | About 3 to 5% (more with merchant of record) |
| Fits "all weather data is free" | Only if it sells extras, never the forecast | Yes: the app stays free for every person     |
| Needs sign-in in the app (#41)  | Yes                                         | No                                           |
| Store review on pricing         | Every change                                | None                                         |
| Build                           | About 4 to 6 weeks, after #41               | About 3 to 4 weeks, can start by invoice     |
| Main metric it moves            | Paying accounts (many, small)               | Revenue per account (few, larger)            |

## A reading, for the owner to accept or reject

Start with B. It keeps the promise that the forecast is free for every person,
earns from the organisations that already get value from Mukoko's data, needs
nothing from the app stores, and can begin with an invoice. Revisit A only when
the app has accounts and an extra people clearly ask for, and price it for the
store fees from the start. Either way: no paywall on the forecast, and nothing
in the app that points to a purchase the stores would treat as steering.

## Decisions the owner needs to make

1. The model: A, B, or B now and A later.
2. The provider (for B) after checking seller-country and payout support.
3. What, if anything, is ever sold to a person inside the app.
