# Google Play — Data Safety form answers (DRAFT)

> **Status: DRAFT for review.** These answers map the app's actual data flows
> (Phase 4) to the Play Console **Data safety** section. Confirm against the
> final shipping build and your backend's real retention/processor contracts
> before submitting. Apple's App Privacy "nutrition label" (App Store Connect)
> uses the same underlying facts — mirror these answers there.

## Summary toggles

- **Does your app collect or share any of the required user data types?** — **Yes.**
- **Is all of the user data encrypted in transit?** — **Yes** (HTTPS/TLS to the
  API; the release build requires an HTTPS base URL).
- **Do you provide a way for users to request that their data be deleted?** —
  **Yes, off-app**: users email support@wiserwits.com. (In-app self-serve
  deletion is not yet implemented — see the account-deletion risk note below.)

## Data types — collected / shared

For each: **Collected = Yes** unless noted. **Shared** means sent to a third
party (processors that act on our behalf still count and are listed).

| Data type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
| Name | Yes | No | Account management, app functionality | Required |
| Email address | Yes | No | Account management, app functionality | Required |
| User IDs | Yes | No | Account management, app functionality | Required |
| Password (hashed) | Yes | No | Account management | Required |
| **Health & fitness** (BMI, consultations, diet, lab reports) | Yes | To authorized contributors you grant | App functionality | Optional (user-entered) |
| Other financial info (payment/order references) | Yes | To Razorpay (payment processor) | Purchases | Required for paid features |
| Payment card details | **No** (handled entirely by Razorpay checkout) | — | — | — |
| Device or other IDs (Expo push token) | Yes | To Expo (push delivery) | Send notifications | Optional (only if notifications enabled) |
| App activity / other actions (academic records: attendance, marks, assignments, etc.) | Yes | No | App functionality | Required for enrolled use |
| Messages / other in-app content (advice threads, feedback) | Yes | No | App functionality | Optional |

Notes:
- We do **not** collect precise/approximate location, contacts, photos/videos,
  audio, browsing history, or advertising identifiers.
- We do **not** use data for advertising or marketing, and we do **not** sell
  data or share it with data brokers.
- No third-party analytics/ads SDKs are integrated in this build. (If an
  analytics provider is added later, update this form: declare the data type,
  purpose = Analytics, and the processor.)

## Security practices

- **Encrypted in transit:** Yes (TLS).
- **Data deletion:** users can request deletion via support@wiserwits.com.
- **Committed to Play Families / follows the Families policy:** confirm with
  product — the app is used by minors via schools/guardians.

## Per-type "purpose" cheat-sheet (Play options)

- App functionality — all data types above.
- Account management — name, email, user IDs, password.
- Payments — order/payment references (via Razorpay).
- (Do NOT check) Advertising or marketing, Analytics, Fraud prevention beyond
  payments, Personalization — unless/until those features are actually added.

## Account-deletion risk (action required before iOS submission)

The app currently has **no in-app account deletion** (product decision Q9).
Deletion is handled off-app via support. **Apple App Review Guideline 5.1.1(v)**
requires apps that support account creation to also offer in-app account
deletion — this is a likely rejection reason. Options before submission:
1. Add an in-app "Delete account" flow (backend `DELETE /api/student/account`
   with data/token cleanup + a confirmation UI), or
2. Provide an account-deletion web page and link to it in-app (Apple accepts a
   link to a deletion flow in some cases — verify current guidance).

Google Play also requires an account-deletion route (in-app or via a web link
declared in the Data safety form) — set the "Delete account URL" accordingly.
