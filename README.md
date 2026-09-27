# Darna Eats · دارنا إيتس

A Tunisia-first marketplace connecting **verified home cooks** with nearby customers who want authentic homemade Tunisian food. The MVP targets **Greater Tunis** (Tunis, Ariana, Ben Arous, Manouba) in **Arabic (full RTL) and French**.

- Package / bundle ID: `tn.darnaeats.app` · slug: `darna-eats` · scheme: `darnaeats`
- Stack: Expo SDK 57 (React Native 0.86, TypeScript, Expo Router) + Firebase (Auth, Firestore, Cloud Functions, Storage, FCM)
- Payment: cash on delivery only · Fulfillment: buyer pickup or seller-arranged delivery
- AI: **not** part of the MVP. The architecture leaves a clean server-side boundary for Gemini later (see [Future AI integration](#future-ai-integration)).



---

## Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Firebase setup](#firebase-setup)
4. [Environment configuration](#environment-configuration)
5. [Running locally with the Emulator Suite](#running-locally-with-the-emulator-suite)
6. [Seed data & demo accounts](#seed-data--demo-accounts)
7. [Testing](#testing)
8. [Production build](#production-build)
9. [Deployment](#deployment)
10. [Admin setup](#admin-setup)
11. [Key design decisions & assumptions](#key-design-decisions--assumptions)
12. [Known MVP limitations](#known-mvp-limitations)
13. [Future roadmap](#future-roadmap)

---

## Architecture

```text
darna-eats/
├── app/                      Expo Router routes (screens)
│   ├── _layout.tsx           Providers: fonts, i18n/RTL, React Query (+offline cache), Paper theme, Auth
│   ├── index.tsx             Entry router (language → auth → terms → role/seller status)
│   ├── (auth)/               language, welcome, sign-in, sign-up, phone (OTP / link), terms, role
│   ├── (buyer)/              tabs (home, discover, orders, messages, profile) + search, map, kitchen/[id],
│   │                         dish/[id], cart, checkout, order/[id], review/[orderId], favorites, daily-menu…
│   ├── seller/               onboarding/* (verification), (tabs) dashboard/menu/orders/messages/profile,
│   │                         dish/new, dish/[id], menus, menu-editor, order/[id], reviews, earnings…
│   ├── admin/                dashboard, verification, reports, reviews, dishes, sellers, users,
│   │                         analytics, audit, categories, locations, settings, conversation (audited)
│   └── chat/[id], notifications, settings, report, legal
├── src/
│   ├── components/           DishCard, SellerCard, VerifiedBadge, RatingStars, PriceDisplay, badges,
│   │                         SearchBar, QuantitySelector, BottomSheet, FormField, States (loading/empty/error)…
│   ├── features/<domain>/    Data access (React Query hooks) per domain + feature components
│   ├── services/
│   │   ├── firebase/         SDK init (emulators, App Check), typed callables, converters, storage upload
│   │   ├── payments/         PaymentProvider descriptors (cash on delivery only)
│   │   ├── fulfillment/      FulfillmentProvider (pickup, seller_delivery)
│   │   ├── maps/             MapProvider abstraction + Leaflet/OpenStreetMap implementation
│   │   ├── search/           SearchProvider abstraction + Firestore prefix-token implementation
│   │   ├── notifications/    Push registration (FCM on Android, Expo push on iOS) + deep-link routing
│   │   ├── analytics/        Typed, allow-listed product events
│   │   └── secureStorage.ts  Keychain/keystore-backed storage for the auth session
│   ├── localization/         i18next setup, RTL switching, bilingual field helper
│   ├── schemas/              Zod form schemas (messages are i18n keys)
│   ├── store/                Zustand: cart (one seller per cart), settings (language, mode)
│   └── theme/, types/, utils/, hooks/
├── shared/                   Pure-TS domain logic used by BOTH app and functions:
│                             order state machine, pricing (millimes), availability, Tunis time slots,
│                             text normalisation/search tokens (Arabic + French), geo privacy, permissions
├── functions/                Cloud Functions (TypeScript, europe-west1)
│   └── src/
│       ├── services/         orders, sellers, reviews, reports, dishes, admin, users, payments
│       ├── triggers/         onDishWritten (search index/denormalisation), onSellerProfileWritten,
│       │                     onMenuWritten, onMessageCreated (unread counters + push)
│       └── lib/              auth context, audit log, rate limiting, notifications, input schemas
├── locales/{ar,fr}/common.json
├── firestore.rules · storage.rules · firestore.indexes.json · firebase.json
├── scripts/                  seed (emulator only), grant-admin, check-translations, generate-assets
└── tests/                    unit (domain), rules (Firestore/Storage security), integration (functions)
```

### How trust & security are enforced

| Concern | Where it is enforced |
| --- | --- |
| Roles (`buyer`, `seller`, `moderator`, `admin`) | Auth **custom claims** set only by Cloud Functions; rules read `request.auth.token.roles` |
| Seller approval | `reviewSellerApplication` function (audited). Rules forbid clients from touching `status` |
| Public visibility | Dishes/menus carry a server-maintained `sellerApproved` flag; public queries & rules require it |
| Prices, totals, stock | `placeOrder` re-reads dishes **in a transaction**, computes totals in millimes, decrements stock (no overselling) |
| Order lifecycle | `updateOrderStatus` validates transitions with `shared/orderStateMachine.ts` (same table the UI uses) |
| Reviews | One per completed order, created server-side; post-moderated; aggregates kept consistent |
| Reports & moderation | Server-only writes, rate limited, every staff action written to append-only `auditLogs` |
| Exact addresses | `sellerPrivate/{uid}` (owner + staff only). Pickup address is copied to the order **only after acceptance** |
| Public coordinates | Seller coordinates must equal the chosen service area's approximate centre (checked in rules) |
| Identity documents | `verification/{uid}/…` in Storage, readable by owner + staff only, never exposed via download URLs; staff access is audited |
| Chat privacy | Participants only. Staff can read a conversation only through an audited function tied to a report |

### Data model

Collections: `users` (+`pushTokens` sub-collection), `sellerProfiles`, `sellerVerification`, `sellerPrivate`, `categories`, `governorates`, `cities`, `serviceAreas`, `appSettings`, `dishes`, `menus`, `favorites`, `carts`, `orders` (items embedded with name/price **snapshots**), `reviews` (id = order id), `reports`, `conversations` (+`messages`), `notifications`, `auditLogs`, `rateLimits` (internal).
Types: `src/types/models.ts`. Rules: `firestore.rules`. Indexes: `firestore.indexes.json`.

Order statuses: `pending → accepted → preparing → ready → (out_for_delivery →) completed`, with `cancelled` and `disputed` branches (see `shared/orderStateMachine.ts`).

### Cost control

- One-shot reads + pull-to-refresh by default. Real-time listeners **only** for the open order, the open chat and the Messages tab, and they detach on unmount.
- Cursor pagination everywhere lists can grow; Firestore `count()`/`sum()` aggregations for dashboards and earnings.
- Daily-menu feed is one query thanks to dish summaries denormalised by a trigger.
- Images are resized to ≤1600 px and re-encoded as JPEG (this also strips EXIF/GPS) before upload; `expo-image` caches on disk.
- Selected read-only queries (catalog, dishes, sellers, order history) are persisted to disk for offline browsing.
- Chat messages send push only (no in-app notification document per message).

---

## Prerequisites

- Node.js 22 and npm 10
- Java 17+ (for the Firebase Emulator Suite)
- Firebase CLI: `npm i -g firebase-tools` (v15+)
- For devices: Expo Go is **not** sufficient for push notifications and native App Check; use a development build (`npx expo run:android` / EAS) for those. Everything else runs in Expo Go or the browser.

## Firebase setup

1. Create a Firebase project (region: **europe-west1** for Functions; Firestore location `eur3` recommended).
2. Enable **Authentication** providers: *Phone* (primary) and *Email/Password* (secondary). Add your auth domain to authorised domains.
3. Create **Firestore** (production mode) and **Storage**.
4. Add a **Web app** and copy its config into `.env` (see below). For Android push, add an Android app with package `tn.darnaeats.app` and download `google-services.json` (kept out of git; point `GOOGLE_SERVICES_JSON` at it).
5. `firebase use --add` to point `.firebaserc` at your project (the default `demo-darna-eats` is emulator-only).
6. Deploy rules, indexes and functions (see [Deployment](#deployment)).
7. Optional but recommended for production: enable **App Check** (reCAPTCHA Enterprise for web; Play Integrity / App Attest via `@react-native-firebase/app-check` in a dev build) and then set `ENFORCE_APP_CHECK=true` for Functions.

## Environment configuration

Copy `.env.example` to `.env`. Only `EXPO_PUBLIC_*` values reach the app bundle, and they are **public by design** (Firebase web config is protected by rules/App Check, not secrecy). Never put service-account keys or API secrets in `EXPO_PUBLIC_*`.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase web app config |
| `EXPO_PUBLIC_FUNCTIONS_REGION` | Must match the functions region (`europe-west1`) |
| `EXPO_PUBLIC_USE_EMULATORS` / `EXPO_PUBLIC_EMULATOR_HOST` | Use the local Emulator Suite; set the host to your LAN IP on a physical device |
| `EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` | Web App Check (optional) |
| `EXPO_PUBLIC_MAP_TILE_URL` / `EXPO_PUBLIC_MAP_ATTRIBUTION` | Map tiles (OpenStreetMap by default — use your own tile server/provider for production traffic) |
| `EXPO_PUBLIC_TERMS_VERSION` | Bump to require users to re-accept terms |
| `SEED_DEMO_PASSWORD` | Dev-only password for seeded emulator accounts (scripts only) |
| `ENFORCE_APP_CHECK` | Functions runtime flag |

## Running locally with the Emulator Suite

```bash
cd darna-eats
npm install
npm --prefix functions install
cp .env.example .env            # defaults already point to the emulators

# Terminal 1 – build functions and start Auth, Firestore, Functions, Storage (+ UI on :4000)
npm run emulators

# Terminal 2 – seed fictional Greater Tunis data and demo accounts
SEED_DEMO_PASSWORD=choose-a-dev-password npm run seed

# Terminal 3 – start the app
npm start          # then press a (Android), i (iOS) or w (web)
```

Phone sign-in works against the Auth emulator without real SMS: the code is printed in the emulator logs / UI. In production the app renders Google's invisible reCAPTCHA (required by the Firebase JS SDK for phone auth) from your auth domain.

## Seed data & demo accounts

`npm run seed` (**emulator only** — it refuses to run otherwise) creates:

- 22 governorates (only the 4 Greater Tunis ones active), 14 cities, 18 service areas with approximate coordinates
- 8 categories, 10 approved fictional sellers, 40 dishes, today's daily menus
- 4 completed demo orders with genuine review documents (ratings are computed from them — no fabricated metrics)
- one **pending** seller application for the admin queue

| Role | Email (development only) |
| --- | --- |
| Buyer | `buyer.demo@darnaeats.test` |
| Seller (approved) | `seller.demo@darnaeats.test` |
| Seller (pending application) | `pending.seller@darnaeats.test` |
| Admin | `admin.demo@darnaeats.test` |
| Moderator | `moderator.demo@darnaeats.test` |

The password is `SEED_DEMO_PASSWORD`; if unset, a random one is generated and printed. No password is hardcoded anywhere. All names, stories and dishes are original and fictional; dishes ship **without photos** and the app renders a generic local illustration, so no third-party imagery is used.

## Testing

```bash
npm run test:unit       # domain logic: state machine, pricing, availability, time slots, text/search, geo, permissions
npm run test:emulator   # Firestore + Storage security rules and end-to-end function flows (starts emulators itself)
npm run typecheck       # app, scripts/tests and functions
npm run lint
npm run check-translations   # every key used in code exists in BOTH ar and fr
```

The emulator suite covers, among others: buyers cannot approve sellers; sellers cannot self-approve, edit ratings, read other sellers' private/verification data or documents; users cannot change their roles; audit logs are immutable; unauthenticated users cannot read protected data; clients cannot write orders or prices; overselling is prevented under the transaction; suspended sellers cannot receive orders; private addresses are not readable by non-participants; chat is participant-only and even admins need the audited function.

> Note: in sandboxed environments with an HTTPS proxy, the Storage emulator's cross-service rule lookups (`firestore.get()` in `storage.rules`) can be intercepted. Unset `HTTPS_PROXY` for the emulator process if Storage rule tests fail with "Null value error".

## Production build

```bash
npm i -g eas-cli
eas build:configure
eas build -p android --profile production     # uses app.config.ts (package tn.darnaeats.app)
eas build -p ios --profile production         # bundle id tn.darnaeats.app
npx expo export --platform web                # static web build (admin panel works on web too)
```

Set production `EXPO_PUBLIC_*` values in EAS environment variables and `EXPO_PUBLIC_USE_EMULATORS=false`. Set `EAS_PROJECT_ID` so iOS devices can obtain Expo push tokens.

## Deployment

```bash
firebase use <your-project>
npm run deploy:rules        # Firestore rules + indexes + Storage rules
npm run deploy:functions    # builds (syncs /shared into functions/src/shared) and deploys
```

Cloud Functions need the Blaze plan. The scheduled `expireStaleOrders` job cancels pending orders that were never accepted.

## Admin setup

The first admin must be bootstrapped out-of-band (there is intentionally no way to self-assign a staff role):

```bash
# Production: service-account credentials from a secure location, never committed
GOOGLE_APPLICATION_CREDENTIALS=/secure/sa.json GCLOUD_PROJECT=<project> npm run grant-admin -- you@example.com
# Moderator instead of admin:
... npm run grant-admin -- mod@example.com --moderator
```

The user signs out/in to refresh their token, then sees **Administration**. Further role changes happen in *Admin → Users* through the audited `adminSetUserRoles` function. Moderators can review applications, reports, reviews and dishes; only admins manage users, catalog, locations and settings, and suspend sellers.

## Key design decisions & assumptions

- **Firebase JS SDK** (not `@react-native-firebase`) so the app runs in Expo Go and on web; native-only capabilities (App Check attestation, native analytics) are behind abstractions and documented.
- **Phone auth** uses an invisible reCAPTCHA rendered in a WebView (native) / the SDK verifier (web), as required by the JS SDK.
- **Session storage**: Firebase Auth persistence uses the OS keychain/keystore through Expo SecureStore (chunked adapter); only non-sensitive preferences and cached public data use AsyncStorage.
- **Maps**: Leaflet + configurable raster tiles in a WebView (no API key, no paid dependency). `MapProvider` allows swapping to Google Maps later. Sellers are shown only as ~1 km approximate areas.
- **Search**: Firestore prefix tokens (Arabic + French normalisation) built by a trigger, with remaining filters applied client-side on a bounded result set. `SearchProvider` allows Algolia/Typesense/Meilisearch later.
- **Time**: Tunisia uses a fixed UTC+1 offset (no DST since 2009); slots are hourly, bookable up to 7 days ahead, respecting preparation/pre-order lead times.
- **Money**: TND with millimes precision; all arithmetic in integer millimes.
- **Cart**: one seller per cart; persisted locally and mirrored to `carts/{uid}` (debounced). The server never trusts cart prices.
- **Push**: Android registers native FCM tokens (sent with `firebase-admin` messaging); iOS registers Expo push tokens (Expo relays to APNs) so no APNs key ships in the app.
- **Analytics**: typed allow-listed events; Firebase Analytics on web, a no-op/debug sink on native until `@react-native-firebase/analytics` is added in a dev build. No personal data, message contents or verification data are ever logged.
- **Reviews** stay visible while flagged (post-moderation) and disappear only when a moderator removes them.
- **Dispute window**: completed orders can be disputed for 48 h; disputes automatically open a high-priority report.
- **Suspension** hides a seller's dishes/menus immediately and cancels their open orders (stock is restored).

## Known MVP limitations

- Cash on delivery only; no digital payments, commissions or subscriptions.
- No third-party delivery partners; delivery is arranged by the seller.
- Greater Tunis only; other governorates are seeded but inactive.
- Search is prefix-based (no typo tolerance or relevance ranking).
- Push notifications require a development/production build (not Expo Go); App Check attestation on native requires `@react-native-firebase/app-check`.
- Chat has no end-to-end encryption (and the app does not claim it); messages are protected by access rules.
- No automated account deletion flow in-app yet (handled on request, see PRIVACY.md).
- Pre-order cutoff timestamps are supported by the data model and server but not yet editable in the dish form (lead time is).

## Future roadmap

- **Phase 2** — Sousse, Sfax and nationwide rollout (enable governorates in *Admin → Locations*); English UI (add `locales/en`); digital payments via new `PaymentProvider` implementations; richer seller analytics; delivery partners via `FulfillmentProvider`.
- **Phase 3** — Tunisian wallets (D17, Flouci, e-Dinar), commission/subscription model, loyalty, referrals, promotions, advanced search provider.
- **Phase 4** — Gemini-powered recommendations, semantic dish search, AI-assisted menu writing, multilingual assistance, personalised discovery, smart reorder suggestions.

### Future AI integration

AI must remain optional and never a dependency of the marketplace core. When added:

1. Create `functions/src/services/ai/` exposing callable functions (e.g. `suggestDishDescription`, `recommendDishes`). **Gemini keys live only in Functions secrets** (`defineSecret`), never in the app.
2. Send the minimum data needed (e.g. dish name and category, never phone numbers, addresses, documents or chat contents).
3. Validate model output with Zod; label generated text as "AI-suggested" in the UI and require the seller to confirm it.
4. Never let AI approve sellers, make moderation decisions or assert food-safety/allergen facts.
5. Write an `auditLogs` entry for AI-assisted actions that change stored data.
6. Recommendations can plug into `SearchProvider` (semantic search) without changing screens.
