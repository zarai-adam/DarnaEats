# Privacy architecture

This document describes how Darna Eats handles personal data. It is the technical basis for the public privacy policy (to be reviewed by legal counsel for compliance with Tunisian Organic Law No. 2004-63 on personal data protection and INPDP requirements before launch).

## Principles
- **Minimisation** — collect only what a marketplace transaction needs.
- **Separation** — public profile data, private seller data and verification data live in separate documents/paths with different access rules.
- **Need-to-know** — exact addresses are shared only between the two parties of a confirmed order.
- **Accountability** — staff access to sensitive data is audited.

## Data inventory

| Data | Where | Who can read |
| --- | --- | --- |
| Name, language, email, phone (account) | `users/{uid}` | The user, staff |
| Push tokens | `users/{uid}/pushTokens` | The user (server sends pushes) |
| Public kitchen profile (name, story, specialties, photos, approximate area, ratings) | `sellerProfiles/{uid}` | Everyone signed in, **only once approved** |
| Exact pickup address / coordinates, contact phone | `sellerPrivate/{uid}` | The seller, staff |
| Legal name, ID document type, ID document image path, agreements | `sellerVerification/{uid}` + `verification/{uid}/` (Storage) | The seller, staff (audited document views) |
| Orders (items, totals, schedule, buyer notes, delivery address) | `orders/{id}` | That order's buyer and seller, staff |
| Pickup address shared with the buyer | `orders/{id}.pickupDetails` (set on acceptance, cleared on cancellation) | That order's buyer and seller |
| Reviews (rating, comment, reviewer first name) | `reviews/{id}` | Public while visible |
| Chat messages and images | `conversations/{id}/messages`, `chat/{id}/` | The two participants; staff only via a report-linked, audited function |
| Reports | `reports/{id}` | The reporter, staff |
| Audit logs | `auditLogs/{id}` | Staff |

Never public: home addresses, exact coordinates, private phone numbers, identity documents, verification data, buyer addresses, other users' orders.

## Location
- Seller locations are published only as the approximate centre of a service area (~1 km grid), enforced by security rules.
- The buyer's device location is optional, requested only for "nearest" sorting and the map, snapped to ~1 km, and **never stored** server-side.
- Images are re-encoded before upload, removing EXIF/GPS metadata.

## Phone numbers
Phone numbers are never shown to other users. Communication happens through in-app chat, which shows a safety notice discouraging sharing personal details.

## Analytics
Only allow-listed product events (e.g. `order_created`) with non-personal parameters (IDs, counts, amounts). No names, phone numbers, addresses, message contents or verification data are sent.

## Retention (recommended defaults)
- Verification documents: while the seller account is active + 12 months after closure, then deleted.
- Orders: 5 years (accounting/dispute needs), anonymisable on account deletion.
- Chat: 12 months after last message.
- Audit logs: 3 years.
- Rate-limit counters: rolling, short-lived.

## User rights
Users can request access, correction or deletion by contacting support (in-app "Report a problem"). Deletion removes the auth account, profile, push tokens, favorites and cart; orders are anonymised rather than deleted where they must be kept.

## Third parties
- Google Firebase (hosting of data, authentication, messaging) — data processed in the EU region configured for the project.
- Expo push service (iOS push relay) — receives push token and notification text only.
- Map tiles (OpenStreetMap by default) — the device requests map tiles for the viewed area; no account data is sent.
- Google reCAPTCHA — used during phone sign-in to prevent abuse.

## AI
The MVP uses no AI services. Any future AI feature must follow the rules in the README (server-side only, minimal data, no automated moderation or approvals).
