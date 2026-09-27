# Security

## Reporting a vulnerability

Please report security issues privately to the Darna Eats maintainers (do not open a public issue). Include steps to reproduce and the affected component (app, Cloud Functions, rules). We aim to acknowledge reports within 3 business days.

## Security model (summary)

Darna Eats never relies on client-side checks alone. Every security decision is enforced server-side by **Firestore/Storage Security Rules** or **Cloud Functions**.

### Authentication & roles
- Firebase Authentication (phone primary, email/password secondary). Passwords are handled by Firebase Auth only; the app never stores them.
- Roles live in **custom claims** (`roles: string[]`) that only Cloud Functions (Admin SDK) can set. `ensureUserProfile` gives new accounts `buyer`; `becomeSeller` adds `seller`; only admins (via `adminSetUserRoles`) or the out-of-band `scripts/grant-admin.ts` can grant `moderator`/`admin`.
- Rules forbid users from writing `role`, `roles`, `isActive` or creating their own profile document.
- The auth session is persisted in the OS keychain/keystore (Expo SecureStore) on native.

### Server-authoritative operations (Cloud Functions)
| Operation | Protection |
| --- | --- |
| Place order | Re-prices from Firestore in a transaction, validates seller approval/fulfillment/schedule/lead time, decrements stock atomically (no overselling), idempotency key, rate limit (10/h) |
| Order status changes | Transition table + actor check (`shared/orderStateMachine.ts`); suspended sellers cannot accept |
| Seller approval / rejection / suspension | Staff permission check, audit log, notifications, visibility flip on content |
| Reviews | Only the buyer of a completed order, once; moderation keeps rating aggregates consistent |
| Reports | Rate limited (10/day), server-assigned priority, staff-only triage with audited actions |
| Admin tools | Permission matrix in `shared/permissions.ts`; every mutation audited |

Inputs to every callable are validated with Zod; errors return stable reason codes and never leak internals. App Check enforcement can be enabled with `ENFORCE_APP_CHECK=true`.

### Data protection in rules
- Public content is readable only when the seller is approved (server-maintained `sellerApproved` flag) and not hidden.
- `sellerPrivate` (exact pickup address/coordinates) is readable only by its owner and staff; buyers only receive the pickup address on their own order after acceptance.
- Public seller coordinates must equal the approximate centre of an existing service area (checked with `get()` in rules).
- Orders are readable only by their buyer, seller and staff; nobody can write them from the client.
- Conversations/messages are participant-only; staff access requires the audited `adminInspectConversation` function tied to a report.
- `auditLogs` are append-only and server-written; clients (including admins) cannot create, edit or delete them.
- `rateLimits` are inaccessible to clients.

### Storage
- Only JPEG/PNG/WebP up to 5 MB with image extensions are accepted.
- Identity documents live under `verification/{uid}/`, readable by the owner and staff only, writable only while the application is editable. The app never generates download URLs for them; staff view them through the SDK and each access is audited.
- Chat images are readable only by conversation participants.
- Images are re-encoded client-side, which strips EXIF metadata such as GPS location.

### Secrets
- No secrets are embedded in the app. `EXPO_PUBLIC_*` values are public configuration.
- `.env`, service-account keys, `google-services.json`, signing keys are git-ignored.
- Seed/demo passwords come from `SEED_DEMO_PASSWORD` and the seed script refuses to run outside the emulators.

## Verification

`npm run test:emulator` runs the security rules test-suite (`tests/rules`) and server integration tests (`tests/integration`). Run it before every rules or functions change.

## Hardening checklist before launch
- [ ] Enable App Check (web + native attestation) and set `ENFORCE_APP_CHECK=true`.
- [ ] Restrict API keys in Google Cloud Console to the app's package/bundle IDs and domains.
- [ ] Configure Firebase Auth SMS region policy (allow Tunisia) and abuse protections.
- [ ] Set budget alerts and Firestore/Functions quotas.
- [ ] Use a dedicated tile server or commercial tile plan instead of the public OSM tiles.
- [ ] Enable Cloud Audit Logs and backups (Firestore PITR / scheduled exports).
