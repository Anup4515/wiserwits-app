# WiserWits Student Mobile App — Phase 0 & 1 Summary

_A walkthrough of what was built in the first two phases of the mobile app, and how
authentication works end-to-end. Prepared to share with mentor._

- **App repo:** `ww-student-app` — React Native / Expo (the mobile app).
- **Backend repo:** `ww-student-dashboard` — the existing Next.js app that already
  powers the student web dashboard. The mobile app talks to the **same backend and
  database**; we added a small mobile-auth surface to it rather than building a new
  service.

---

## 1. The big picture

The web dashboard authenticates with **NextAuth cookies** (browser sessions). Mobile
apps can't use cookies the same way, so Phase 1 added a **token-based** auth path
(Bearer access token + rotating refresh token) that lives *alongside* the cookie flow
and reuses all the existing business logic.

The key design decision: **one session shape, two ways to authenticate.** A mobile
request carrying a `Bearer` token is resolved into the exact same `session.user` object
that a browser cookie produces — so all ~29 existing student API routes work for mobile
**unchanged**.

---

## 2. Phase 0 — Foundations (App) ✅

Everything needed to start building screens. No user-facing features yet; this is the
skeleton.

| Area | What was done |
|------|---------------|
| **Scaffold** | Expo SDK 55 app (TypeScript, expo-router), `app/` (routes) + `src/` (logic) structure. Pinned to SDK 55 — not the newer 56 — because the public Play Store Expo Go doesn't support 56 yet. |
| **Dependencies** | TanStack Query (server state), react-hook-form + zod (forms/validation), expo-secure-store (secure token storage), charts, icons, Razorpay RN SDK (payments, wired later), expo-notifications (push, wired later). |
| **Theme** | Brand tokens — navy `#1A2658`, gold `#F0C227`, Inter font, spacing/typography — in `src/theme`. |
| **Copy module** | `src/lib/copy.ts` — all UI text is id-keyed and **audience-neutral** (works for both the student and a parent viewing on their behalf). No hard-coded strings in screens; i18n-ready. |
| **API client** | `src/api/client.ts` — a `fetch` wrapper with the standard response envelope, Bearer auth, automatic 401 refresh, and offline handling (details in §5). |
| **Config / env** | `EXPO_PUBLIC_API_BASE_URL` flows through `app.config.ts` → `src/lib/env.ts` so we can point at staging vs. production. EAS build profiles set up in `eas.json`. |

**Verification:** `tsc --noEmit` clean, `expo config` resolves, `expo install --check` green.

---

## 3. Phase 1 — Authentication / login system (Backend + App) ✅

This phase delivered a working login system on both sides.

### Backend (added to `ww-student-dashboard`)

1. **Shared session claims** — extracted `buildSessionClaims()` into
   `app/lib/session-claims.ts` so the mobile login and the web login produce the
   *identical* session payload (student id, name, email, active enrollment, plan, and
   the `features[]` list that gates paid features).
2. **Token primitives** (`app/lib/mobile-token.ts`):
   - **Access token** — a short-lived (**30 min**) HS256 JWT, signed with the *same*
     `AUTH_SECRET` the web session uses, carrying the session claims.
   - **Refresh token** — an opaque random string (30-day lifetime). Only its **SHA-256
     hash** is stored in the DB, so a database leak can't be replayed as a login.
3. **New table** `student_refresh_tokens` (id, student_id, token_hash, expires_at,
   revoked_at, device_label) — one row per active device session.
4. **Three new endpoints:**
   - `POST /api/auth/mobile/login` — same bcrypt password check as the web
     `authorize()`, rate-limited (10 attempts / 15 min per email), returns
     `{ accessToken, refreshToken, user }`. Uniform "Invalid email or password" error so
     we don't reveal which emails exist.
   - `POST /api/auth/mobile/refresh` — validates the refresh token, **rotates** it
     (revokes the old, issues a new), and re-computes plan state so plan upgrades take
     effect without re-login.
   - `POST /api/auth/mobile/logout` — revokes the refresh token; `?all=true` revokes
     every session for that student ("sign out everywhere"). Idempotent.
5. **The Bearer seam** (`getSession()` in `app/lib/auth-utils.ts`) — the crux. It reads
   an `Authorization: Bearer` header (from the request or `next/headers()`), verifies
   the JWT, and returns the same shape as the cookie session; if there's no Bearer, it
   falls back to the cookie `auth()`. All 29 student routes were switched from `auth()`
   → `getSession()` with **no signature changes**, so they now serve both web and mobile.
6. **CORS** added to the mobile auth routes (Authorization header + OPTIONS preflight).

> **Note / plan correction:** the original plan assumed only two helper functions needed
> the Bearer seam. In reality **29 routes call `auth()` directly** — all were migrated.
> The web cookie flow is fully preserved.

### App (in `ww-student-app`)

- **Multi-session token store** (`src/auth/token-store.ts`) — Instagram-style: a parent
  can add several children (siblings) on one device and switch between them locally, no
  server round-trip. Each account keeps its own tokens + cached profile and stays logged
  in until its own refresh token expires.
- **`AuthContext`** (`src/auth/AuthContext.tsx`) — exposes `signIn`, `switchAccount`,
  `signOut`, `removeAccount`, `signOutAll` to the whole app.
- **Root auth gate** (`app/_layout.tsx`) — unauthenticated users are sent to `(auth)`
  screens; authenticated users to the `(tabs)` app.
- **Screens** — Welcome, Login, OTP signup, password reset (reusing the backend's
  existing OTP endpoints), plus the account-switcher and add-account modals.
- **First-run onboarding** (notification opt-in).

**Verification:** both repos typecheck clean; jose sign/verify roundtrip validated
against the real `AUTH_SECRET` (tamper + audience checks pass). Full HTTP smoke test is
pending a running backend + Postgres.

---

## 4. How login works, step by step

```
┌────────────┐   email + password    ┌──────────────────────────────┐
│  Mobile    │ ─────────────────────▶ │ POST /api/auth/mobile/login   │
│  app       │                        │  • bcrypt-check the password  │
│            │                        │  • buildSessionClaims()       │
│            │  { accessToken (JWT),  │  • sign 30-min access JWT     │
│            │ ◀───  refreshToken,  ──│  • store SHA-256(refresh) row │
│            │        user }          └──────────────────────────────┘
│            │
│  stores both tokens per-account in the
│  OS secure store (Keychain / Keystore)
└────────────┘
```

1. User enters email + password on the Login screen.
2. App calls `POST /api/auth/mobile/login`.
3. Backend verifies the password (bcrypt), builds the session claims, signs a 30-minute
   access JWT, and stores a hashed refresh token row.
4. App saves `{ accessToken, refreshToken, user }` for that account in the device's
   **secure store** (iOS Keychain / Android Keystore via `expo-secure-store`).
5. The auth gate flips the app to the authenticated tabs.

### Making authenticated requests

Every call to a `/api/student/*` route attaches `Authorization: Bearer <accessToken>`.
The backend's `getSession()` verifies the JWT and reconstructs the session — the route
behaves exactly as it would for a logged-in web user.

### When the access token expires (silent refresh)

The access token lives only 30 minutes. The API client handles expiry transparently:

```
request → 401 Unauthorized
      → POST /api/auth/mobile/refresh { refreshToken }
      → backend rotates: revokes old refresh token, issues a NEW access + refresh pair
      → app stores the rotated tokens
      → original request is retried once, automatically
```

- This is **single-flight**: if several requests get a 401 at once, only *one* refresh
  runs and the rest wait for it (`refreshInFlight` in `src/api/client.ts`).
- If the refresh token is itself expired/revoked, that account's session is dropped and
  the app returns the user to login.
- **Token rotation** means every refresh invalidates the previous refresh token — a
  stolen refresh token stops working the moment the real device refreshes.

### Logout

- **Sign out (this account):** revokes the current refresh token server-side and removes
  it locally; other added accounts stay logged in.
- **Sign out everywhere:** `?all=true` revokes every refresh token for the student.

---

## 4a. Which library stores the tokens

Tokens are stored with **`expo-secure-store`**, which is a thin wrapper over the
platform's hardware-backed secure storage:

- **iOS** → **Keychain Services**
- **Android** → **Keystore** (encrypted `SharedPreferences`)

This is wrapped in `src/auth/secure-storage.ts` behind a small `storage`
`{ getItem, setItem, removeItem }` interface so the rest of the app doesn't call
SecureStore directly. On **Expo web** (dev only) it falls back to `localStorage`, since
SecureStore has no browser implementation; production auth runs on native.
---

## 4b. How the backend knows a request is from the mobile app

There is no separate "mobile mode" flag or a different set of routes — the backend
distinguishes the two clients by **how the request is authenticated**, inside the single
`getSession()` helper (`app/lib/auth-utils.ts`):

1. **Is there an `Authorization: Bearer <token>` header?**
   - **Yes** → it's the mobile app. The JWT is verified and, if valid, becomes the
     session. Web browsers never send this header (they send a cookie).
   - **No** → fall back to the NextAuth **cookie** session (`auth()`) — that's the web
     dashboard.

2. **The JWT is cryptographically scoped to the mobile app**, so a token can't be
   confused with anything else (from `app/lib/mobile-token.ts`):
   - `issuer: "ww-student-dashboard"` and `audience: "ww-student-app"` are set when
     signing and **enforced on verify** — a token minted for anything else fails.
   - It's signed with the shared `AUTH_SECRET` (HS256), so it can't be forged.

---

## 5. Security properties worth highlighting

- **Shared secret, shared shape** — mobile JWTs are signed with the same `AUTH_SECRET`
  as the web session and carry the identical claims, so there is exactly one
  authorization model to reason about.
- **Refresh tokens are never stored in plaintext** — only their SHA-256 hash is in the
  DB; the raw value exists only on the device.
- **Rotation on every refresh** — limits the blast radius of a leaked refresh token.
- **Short access-token TTL (30 min)** — a captured access token has a small window.
- **Secure device storage** — tokens live in Keychain/Keystore, not plain app storage.
  (On Expo *web* they fall back to `localStorage`, which is dev-only; production auth
  runs on native.)
- **Rate limiting + uniform errors** on login — resists brute force and email
  enumeration.
- **Revocation** — logout and "sign out everywhere" are real server-side revocations,
  not just clearing the client.

---

## 6. Key files (for reference)

**App (`ww-student-app`):**
- `src/api/client.ts` — HTTP client, Bearer auth, single-flight 401 refresh.
- `src/api/auth.ts` — login / logout / OTP signup / reset API calls.
- `src/auth/token-store.ts` — multi-session secure token storage.
- `src/auth/secure-storage.ts` — Keychain/Keystore (native) vs. localStorage (web).
- `src/auth/AuthContext.tsx` — app-wide auth state and actions.
- `app/_layout.tsx` — root auth gate + providers.

**Backend (`ww-student-dashboard`):**
- `app/lib/mobile-token.ts` — sign/verify access JWT, generate/hash refresh tokens.
- `app/lib/session-claims.ts` — the shared session-claims builder.
- `app/lib/auth-utils.ts` — `getSession()`, the Bearer-or-cookie seam.
- `app/api/auth/mobile/{login,refresh,logout}/route.ts` — the mobile auth endpoints.

---

## 7. What's next (Phase 2+)

Read-only screens (Home, Insights, Attendance, Exams, Report Card, Timetable) backed by
existing and new aggregate endpoints, then retention/write surfaces (activity feed,
health, advice, assignments), then payments (Razorpay), push notifications, and store
submission. See `execution.md` for the full phased plan.
