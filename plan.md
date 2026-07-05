# WiserWits — Student Mobile App · Implementation Plan
>
> A new **React Native / Expo** mobile companion app for parents & students,
> built against the **existing `ww-student-dashboard` backend** (shared Postgres
> DB and `/api/student/*` API). This is a *new client*, not a backend rewrite —
> the only server-side additions are mobile-friendly **token auth endpoints** and
> a small set of **net-new endpoints** (activity feed, insights aggregate, push
> registration, account management) that the mobile experience needs and the web
> never built. See §6 for the complete, itemised backend change inventory.

> **Scope note (read first):** the 10 reference mocks are a **UI/visual reference
> only** — *not* the page list. This is a modern, retention-first app — we add screens beyond the
> mocks wherever the backend already supports them (Timetable, Calendar,
> Assignments, Courses/learning, Live classes, Workshops, Certificates, Articles,
> Reminders, Feedback) or where a modern app is simply expected to (Search,
> Settings & Notifications preferences, Account & Security, Help/Support,
> Onboarding). See §7–§9.

---

## 1. Goal & strategy

The web student dashboard (`ww-student-dashboard`) is feature-rich but desk-bound
and table-heavy. The mobile app has **one job: stickiness** — make WiserWits the
app a parent/guardian opens every day. It inverts the web model:

- **Insights are pushed, not searched** — a daily "Insight for you" card + an
  activity feed give a reason to open the app.
- **Glanceable, not tabular** — stat tiles, trend lines, donuts, progress rings
  for a 5-second check (vs. the web's dense tables).
- **Read-only viewer + access manager** — the app **never writes** the four
  academic data classes (attendance, marks/exams, timetable, holistic). Data
  entry stays in the contributor/partner portal. The app shows *provenance*
  ("Filled by R. Thomas") and lets the user manage contributors.

Reference mocks: `mocks/students/mobile/index.html` (10 phone screens rendered in
a single gallery, real brand tokens). **The mocks are a UI/visual-style reference
ONLY — not the page list and not the scope boundary.** They show look-and-feel
(layout, components, brand tokens); the actual app has many more pages (see §7–§9).
Source of design tokens: `ww-student-dashboard/app/globals.css`.

---

## 2. Scope

### In scope (v1)
- Native iOS + Android app (Expo) consuming the existing `/api/student/*` API.
- Token-based auth (login, OTP signup, password reset, refresh, logout).
- The 10 mock screens **plus** the additional screens in §7/§8 that existing
  endpoints already support (Timetable, Calendar, Assignments, Report Card,
  Courses, Live classes, Workshops, Certificates, Articles, Reminders, Feedback)
  and the modern-app essentials (Search, Settings, Account & Security, Help).
- Enrolled (school `erp_*`) **and** independent (self-tracked `student_self_*`)
  students — same screens, different data source + provenance label.
- Plan/feature gating mirrored from the backend (locked screens for plan-gated
  features), using the `features[]` claim carried in the access token.
- Read-only academic data; allowed writes limited to: BMI log, advice requests,
  health consultation booking, assignment submission, contributor invites/grants,
  course enrolment/purchase, profile, subscription.
- A small set of **net-new backend endpoints** (§6) the app depends on.
- **Instagram-style multi-account** (§5a): add multiple existing student accounts
  to one device (e.g. a parent adding two siblings) and **switch between them
  client-side**. Each account stays logged in until its refresh token expires.
  This is a client-side multi-session feature — **no guardian identity, no
  per-route authorization rework** (see §5a + Q1).

### Out of scope (v1) — see §13 roadmap
- **Guardian account model** (a separate parent identity with a server-side
  authorization layer over children). **Not needed** — v1 uses the lighter
  **Instagram-style multi-account** model instead (see In scope above + Q1): the
  parent logs into each sibling's existing student account and switches between
  them client-side. The heavier guardian/relationship model stays deferred.
- Offline-first / local caching beyond in-memory + token persistence.
- **In-app account deletion** (Q9 — not building it). ⚠️ Apple Guideline 5.1.1(v)
  requires it for apps with account creation; tracked as an iOS-submission risk.

> **Now in scope (decisions Q4/Q6):** OS push **send** pipeline (Expo Push/FCM/APNs,
> §6.3 item 11) and **Razorpay native** checkout (§6/§8) — both promoted from
> fast-follow into v1.

---

## 3. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Expo (React Native)** + TypeScript | Managed workflow; EAS Build for stores |
| Routing | **expo-router** (file-based) | Mirrors Next.js app-router mental model |
| Navigation | `@react-navigation` bottom tabs (via expo-router) | 5-slot tab bar (§7) |
| Data fetching | **TanStack Query** (`@tanstack/react-query`) | Caching, retries, background refetch |
| HTTP | `fetch` wrapper + small client | Mirrors `app/lib/api-client.ts`, adds Bearer + 401 refresh |
| Auth/session | Custom token store (see §5) | Access + refresh JWT |
| Secure storage | `expo-secure-store` | Tokens at rest (Keychain / Keystore) |
| State (UI) | React context + hooks | Query covers server state; minimal global UI state |
| Charts | `react-native-gifted-charts` or `victory-native` | RN equivalent of web `recharts` |
| Icons | `@expo/vector-icons` (Heroicons set if available) | Web uses `@heroicons/react` |
| Forms/validation | `react-hook-form` + **`zod`** | `zod` already used backend-side — share schemas where possible |
| Styling | NativeWind (Tailwind for RN) **or** StyleSheet + tokens | Reuse brand tokens from `globals.css` |
| Payments | **Razorpay RN SDK (native — Q4)** | Backend `/order` + `/verify` already exist |
| Notifications | `expo-notifications` + **server send pipeline in v1 (Q6)** | Activity feed + OS push both in v1 |

**Brand tokens** (from `ww-student-dashboard/app/globals.css`): navy `#1A2658`,
gold `#F0C227`, font Inter.

---

## 4. Architecture

```
┌─────────────────────────┐        HTTPS (Bearer token)        ┌──────────────────────────────┐
│  ww-student-app (Expo)   │  ───────────────────────────────▶ │  ww-student-dashboard (Next)  │
│  - expo-router screens   │                                    │  - /api/auth/mobile/* (NEW)   │
│  - TanStack Query        │  ◀───────────────────────────────  │  - /api/student/* (existing)  │
│  - secure token store    │        JSON (ApiResponse<T>)       │  - /api/student/{feed,insights,│
└─────────────────────────┘                                    │      devices,account} (NEW)   │
                                                                │  - NextAuth (web cookies)     │
                                                                │  - per-route auth() (no mw)   │
                                                                └───────────────┬───────────────┘
                                                                                │ pg
                                                                       ┌────────▼────────┐
                                                                       │  shared Postgres │
                                                                       └──────────────────┘
```

- **No new data layer for existing features.** The app talks only HTTP to the
  existing API. The DB, business logic, plan-gating catalog, and `erp_*` /
  `student_self_*` models are untouched.
- **Auth is enforced per-route, NOT by middleware.** There is **no root
  `middleware.ts`**. Every protected route calls `await auth()` and then funnels
  through one of two helpers in `app/lib/auth-utils.ts`:
  - `getStudentContext(request)` — enrolled routes; resolves active enrollment,
    honours `?enrollment_id=` history override.
  - `getStudentIdentity()` — self-tracking routes; student without enrollment.
  This is the **single chokepoint** for Bearer support: if `auth()` returns the
  same session object from a verified Bearer as it does from a cookie, *both*
  helpers — and therefore every route — work unchanged.
- **Additive server-side surface:** a mobile auth surface (bearer tokens carrying
  the *same JWT claims* the web NextAuth session bakes in) plus a handful of
  net-new endpoints for genuinely mobile-shaped needs (activity feed, insights
  aggregate, device registration + push send). See §6.
- The app should be configurable via `API_BASE_URL` (Expo public env) so it can
  point at staging vs prod.

---

## 5. Authentication & account flows

The web backend uses **NextAuth v5 (Credentials provider, JWT in an httpOnly
cookie, 24h session — `app/lib/auth.ts`)**. The `authorize()` flow queries the
`students` table (status `active`, `deleted_at IS NULL`), verifies the password
with **bcryptjs**, and bakes claims into the JWT via two **private** helpers,
`resolveActiveEnrollment()` and `resolvePlanState()`. Cookies don't translate
cleanly to native, so the app uses **bearer tokens** (decision confirmed).

### Session claims the app relies on
`session.user` (from `auth.ts`) carries exactly these — the access token must
reproduce them verbatim so no route logic changes:

```
student_id, enrollment_id|null, class_section_id|null, school_id|null,
role:"student", name, email, profile_image|null,
features[], course_ids[], plan_id|null, plan_name|null, plan_expires_at|null
```

The web refreshes plan state client-side via `useSession().update({})` (re-reads
plan from DB after a purchase) and `update({profile_image})`. The mobile **refresh
endpoint must mirror `update({})`** — re-resolve plan state on refresh so upgrades
take effect without re-login.

### Auth surfaces the app needs
| Flow | Endpoint(s) | New? |
|---|---|---|
| **Login** | `POST /api/auth/mobile/login` → `{ accessToken, refreshToken, user }` | **NEW** |
| **Refresh** | `POST /api/auth/mobile/refresh` → new `accessToken` (+ rotated refresh; re-resolves plan) | **NEW** |
| **Logout** | `POST /api/auth/mobile/logout` (revoke refresh token) | **NEW** |
| **Self sign-up (OTP)** | `POST /api/auth/signup/{request-otp,verify-otp,complete}` | exists, reuse |
| **Password reset (OTP)** | `POST /api/auth/reset-password/{request-otp,verify-otp,complete}` | exists, reuse |
| **Set password (no-pw accounts)** | `POST /api/auth/set-password` | exists, reuse |
| **Contributor invite accept** | (handled in partner portal / web link) | out of app v1 |

### Why cookies don't work + the token model
NextAuth keeps the session JWT in an **httpOnly cookie** and `auth()` reads it
from the request cookies. React Native has no httpOnly cookie jar, so the app
sends **`Authorization: Bearer <token>`** instead and the backend must accept it
(§6.2). The token model:
- **Access token**: short-lived (15–30 min) JWT containing the *exact* claims
  above, **signed with `jose`** (already in the dependency tree via `next-auth`)
  using the **same `AUTH_SECRET`**, so `/api/student/*` authorization +
  feature-gating work unchanged when the server verifies it.
- **Refresh token**: long-lived (30 days), opaque random string, **stored as a
  hash** server-side (new `student_refresh_tokens` table), **rotated on each
  refresh** (issue new, revoke old). Server-side storage is what makes logout and
  "sign out everywhere" possible.
- Tokens stored in **`expo-secure-store`**; access token sent as
  `Authorization: Bearer <token>`; auto-refresh on `401`, single-flight.
- **OTP signup/reset endpoints need no change** — they already return JSON
  tickets, not session cookies, so the app reuses them as-is.

### Client auth flow (app side)
1. **Welcome / Sign-in** (mock 1): email + password, *or* OTP signup, *or* forgot
   password.
2. On login → store tokens → bootstrap user from the `user` payload → route Home.
3. Silent refresh on 401; on refresh failure → clear tokens → Sign-in.
4. Logout → revoke refresh token + clear secure store.

### Account model notes (from `Login_and_Account_Flows.txt`)
- Students self-sign-up (own password) **or** are created by school/staff with no
  password (set via reset/set-password link before first login). Both supported.
- Portals are sealed: a student account only signs into the student surface.
- Email delivery for OTP/codes is **live/wired** server-side (Q2) — the app relies
  on OTP signup/reset in v1.

### 5a. Multi-account (Instagram-style) — client-side multi-session
A parent with two children (each an existing student account) can **add both
accounts to one device and switch between them** — like Instagram. This is a
**client-side** feature: there is **no parent/guardian identity** and **no
server-side authorization layer**. The server only ever sees normal, independent
student logins.

- **How it works:** each "added account" is one ordinary credential login → its
  own `{ accessToken, refreshToken }`. The app's secure store holds an array of
  sessions and a local `activeStudentId`; **switching swaps which token the API
  client sends — no server round-trip**.

  ```
  secure store:
  [ { studentId: 101, name: "Aarav", accessToken, refreshToken },
    { studentId: 102, name: "Diya",  accessToken, refreshToken } ]   // + active flag
  ```
- **Stay-logged-in:** all added accounts remain signed in **until each one's
  refresh token expires** (30-day rotating). Refresh runs **per account,
  independently**, against the same `student_refresh_tokens` table (it already
  keys rows by `student_id`, so N accounts = N rows — no change).
- **Plan-gating / billing / writes / provenance are unaffected** — each session
  carries its own `features[]` and acts on its own `student_id`, exactly as a
  single-account login does.
- **The one backend implication is push devices:** one phone now holds multiple
  accounts and must receive push for all of them, so `student_devices` must be
  **many-to-many** (one device token ↔ many students). See §6.3 item 10.
- **Deliberately not stored server-side:** the device↔accounts linkage lives only
  on the device. We do **not** persist "these accounts belong to one parent" (that
  would re-introduce the guardian model). Re-adding an account re-authenticates
  with credentials; we never store a password-skip shortcut.

App work: secure multi-session store, an account-switcher UI (avatar/long-press,
"Add account"), and per-account token refresh. See §7 (`account-switcher`) and the
execution plan.

---

## 6. Backend change inventory (`ww-student-dashboard`) — **complete**

All changes are **additive** and live in the shared backend, not the app. Grouped
by category; nothing here alters existing route response shapes.

### 6.1 Mobile auth surface — the login system (NEW)
1. **Token signer/verifier** — `app/lib/mobile-token.ts`: sign/verify the access
   token as a JWT with **`jose`** (transitive dep of `next-auth`, edge-safe) using
   the **same `AUTH_SECRET`**, carrying the exact claim shape from §5. `signAccess
   (claims)` (exp 15–30 min) + `verifyAccess(token)`. Plus opaque refresh-token
   generation + `sha256` hashing for storage.
2. **`app/api/auth/mobile/login/route.ts`** — reuse the `authorize()` logic from
   `auth.ts` (`bcrypt.compare` vs `students` where status `active` + `deleted_at
   IS NULL`, then `resolveActiveEnrollment` + `resolvePlanState`); sign access
   token, create + persist refresh token; return `{ accessToken, refreshToken,
   user }`. Add login rate-limiting (mirror the OTP routes' 3/15min limiter).
3. **`app/api/auth/mobile/refresh/route.ts`** — look up refresh-token hash
   (not revoked, not expired) → rotate (insert new, revoke old) → **re-run
   `resolvePlanState`** (mirror web `update({})` so plan upgrades apply) → return
   new access token (+ new refresh token).
4. **`app/api/auth/mobile/logout/route.ts`** — revoke the presented refresh token
   (set `revoked_at`); optional `?all=true` to revoke every token for the student.
5. **Refactor prerequisite:** `resolveActiveEnrollment` and `resolvePlanState` are
   currently **private** in `auth.ts`. Extract them into a shared module (e.g.
   `app/lib/session-claims.ts`) and export, so the mobile login route and NextAuth
   `authorize()` both call one implementation (no drift in claim shape).
6. **Migration — `student_refresh_tokens`**
   (`id, student_id, token_hash, expires_at, revoked_at, created_at`,
   optional `device_label`/`user_agent`), rotated + revocable. Mirror the existing
   migration mechanism in the repo (confirm format).

### 6.2 Bearer acceptance — the one cross-cutting change (NEW)
7. **Bearer-aware session resolution.** There is **no middleware**; every protected
   route resolves auth through exactly two helpers in `app/lib/auth-utils.ts`,
   each of which calls `await auth()` (cookie-only) internally:
   - `getStudentContext(request?)` — **already receives `request`** (`auth-utils.ts:39`).
   - `getStudentIdentity()` — **takes no `request`** (`auth-utils.ts:144`) → **this
     is the blocker**; without the request it can't read the `Authorization` header.

   The fix (recommended over extending NextAuth — Q3):
   - Add **`getSession(req)`** that returns the **identical** `session.user` shape
     from a **verified Bearer** (`verifyAccess` → reconstruct `session.user` from
     the token claims) *or*, if no bearer, falls back to `await auth()` (cookie).
   - Replace the `await auth()` call inside **both** helpers with
     `await getSession(request)`.
   - **Change `getStudentIdentity()` → `getStudentIdentity(request)`** and thread
     `request` into every caller (the `self/*` routes, `profile`, `access-grants`,
     `notifications`). Mechanical, but it's the real work item.

   > **Implementation note (corrected during Phase 1):** the two helpers are NOT
   > the only consumers — **29 student routes call `auth()` directly**. The shipped
   > fix makes `getSession()` read the Bearer from `next/headers()` when no request
   > is passed, so those 29 routes were converted `auth()` → `getSession()` with no
   > signature changes, and the two helpers call `getSession(request)`. Net effect is
   > still the same: the **entire** `/api/student/*` API accepts cookie+Bearer with
   > an unchanged `session.user` shape and web cookie flow preserved.
8. **CORS / allowed origins** — allow the `Authorization` header and handle
   `OPTIONS` preflight for the app origin (native sends Bearer, no cookies, no
   CSRF surface).

### 6.3 Net-new endpoints the app needs (NEW)
9. **`GET /api/student/feed`** — **the activity feed.** Today's
   `/api/student/notifications` returns only a **badge map**
   (`{ "student.exams": true, … }`), *not* a timeline. The app's core retention
   screen (mock 8) needs a chronological, day-grouped, paginated activity feed
   (new marks posted, attendance marked, report published, advice replied, etc.)
   with read/unread state. Build it as a thin aggregate over existing `erp_*` /
   `student_self_*` event tables. **This is the single most important new endpoint
   — the daily-open hook depends on it.**
10. **Device registration for push** — `POST /api/student/devices`
   (`{ expo_push_token, platform }`) + `DELETE /api/student/devices/:id`. The
   `student_devices` table must be **many-to-many** (`UNIQUE (student_id,
   expo_push_token)`) so one phone holding multiple accounts (§5a multi-account)
   receives push for **every** added student, not just the last one registered.
11. **OS push send pipeline (Q6 → in-scope, not deferred)** — a send service over
    **Expo Push** (→ FCM/APNs) that fires on the `/feed` event model (item 9), fans
    out to a student's registered devices, respects notification-preferences
    (item 12), and cleans up dead tokens from push receipts.
12. **`GET /api/student/insights`** (Q8 → build the endpoint) — **does not exist
    today** (the `insights` dir is empty; no `performance` route). Add the aggregate
    endpoint returning the Insights payload (overall grade ring, attendance trend
    series, holistic bars, strengths/focus + "insight of the day") — one round-trip,
    server owns the logic.
13. **Notification preferences** — `GET/PATCH /api/student/notification-preferences`
    (per-category toggles) backing the Settings screen, driving push opt-in
    (item 11). Small `student_notification_prefs` table.
14. **In-app change-password** — either reuse `set-password`/reset flow or add
    `POST /api/student/account/change-password` (verify current + set new) for a
    logged-in user. Confirm which the reset flow already covers.

### 6.4 Existing endpoints — **no change beyond Bearer acceptance**
Every route below already returns mobile-ready JSON; once §6.2 lands they work
as-is. Methods and gating per the inventory in §9.

> Keep all of this behind the same `features[]` plan-gating a mobile client
> can't bypass: the gate is the `features[]` claim checked inside each route, so
> a bearer carrying the same claims is gated identically.

---

## 7. Navigation & routing (expo-router)

A **5-slot bottom tab bar** condenses the web's ~23 sidebar items; **Academics**
and **Profile** are hubs that fan out to the full screen set (more than the 10
mocks).

```
Home · Insights · ( + ) · Academics · Profile
```

- **Academics** hub → Attendance, Exams & Marks, Report Card, **Timetable,
  Calendar, Assignments** (+ Feedback).
- **( + )** center action = the only "write" surfaces (all allowed): log BMI /
  ask consultant / book health consultation / submit assignment / add contributor.
- **Insights** + **Activity feed** (bell on Home) are the retention engines.
- **Profile** hub → Contributors, Subscription & Plans, **Courses / Learning,
  Certificates, Live classes, Workshops, Articles, Reminders**, Settings,
  Account & Security, Help/Support.

### Route tree
```
app/
├── (auth)/
│   ├── welcome.tsx              # mock 1: sign-in / sign-up entry
│   ├── login.tsx
│   ├── signup/                  # OTP: email → code → password
│   └── reset-password/          # OTP: email → code → new password
├── onboarding/                  # first-run: viewer role, notif opt-in
├── account-switcher/            # §5a: add account / switch between siblings
├── (tabs)/
│   ├── _layout.tsx              # 5-tab bar
│   ├── index.tsx                # Home (mock 2)
│   ├── insights.tsx             # Insights (mock 3)
│   ├── academics/
│   │   ├── index.tsx            # Academics hub
│   │   ├── attendance.tsx       # mock 4
│   │   ├── exams.tsx            # mock 5 (Exams & Marks)
│   │   ├── report.tsx           # mock 7 (Report Card)
│   │   ├── timetable.tsx        # (backed, unmocked)
│   │   ├── calendar.tsx         # (backed, unmocked)
│   │   ├── assignments.tsx      # list + submit (backed, unmocked)
│   │   └── feedback.tsx         # teacher feedback (backed, unmocked)
│   └── profile/
│       ├── index.tsx            # mock 10 (Profile & Contributors)
│       ├── subscription.tsx     # plans + Razorpay (backed)
│       ├── courses/             # learning catalog + à-la-carte purchase (backed)
│       ├── certificates.tsx     # (backed, unmocked)
│       ├── live-classes.tsx     # (backed, unmocked)
│       ├── workshops.tsx        # (backed, unmocked)
│       ├── articles/            # read & learn hub (backed, unmocked)
│       ├── reminders.tsx        # (backed, unmocked)
│       ├── settings.tsx         # notif prefs, theme, env
│       ├── account.tsx          # change password, manage devices (no delete — Q9)
│       └── help.tsx             # support / FAQ / legal links
├── activity.tsx                 # mock 8 (Activity feed — bell on Home) → NEW /feed
├── health/                      # mock 6 (Health & Wellness, tabs)
├── advice.tsx                   # mock 9 (Advice & Feedback thread)
├── search.tsx                   # global search (subjects/exams/articles/courses)
├── actions/                     # ( + ) quick actions: log-bmi, ask, book, submit, invite
└── _layout.tsx                  # root: auth gate + providers
```

- **Auth gate** in root `_layout.tsx`: unauthenticated → `(auth)`; authenticated
  → `(tabs)`.
- **Plan-gated screens** render a lock/upsell state when the feature key
  (mirrored from `app/lib/feature-routes.ts`) is absent from `features[]`.

---

## 8. Screens → backing endpoints

### Mock screens (baseline)
| # | Screen | Key endpoint(s) | Backend status |
|---|--------|-----------------|----------------|
| 1 | Welcome / Sign-in | `/api/auth/mobile/login`, `/api/auth/signup/*`, `/api/auth/reset-password/*` | login NEW; OTP reuse |
| 2 | Home (glance, account switcher §5a, push insight, today's timetable, latest activity) | `/api/student/dashboard` | exists |
| 3 | Insights (grade ring, attendance trend, holistic bars, strengths/focus) | **`/api/student/insights` (NEW)** aggregate (Q8) | **NEW** |
| 4 | Attendance (donut + calendar, provenance) | `/api/student/attendance` *(self: `/self/attendance`)* | exists |
| 5 | Exams & Marks (accordion, subject pie, rank) | `/api/student/exams`, `/api/student/marks` *(self variants)* | exists |
| 6 | Health & Wellness (BMI, consultations, diet, lab reports) | `/api/student/health`, `/health/doctor-consultations`, `/health/diet-plans`, `/health/lab-reports`, `/api/student/bmi` | exists |
| 7 | Report Card (term card + PDF, history) | `/api/student/reports` *(self: `/self/report`)* | exists |
| 8 | Activity feed (push-driven timeline) | **`/api/student/feed` (NEW)** — *not* `/notifications` (that's a badge map only) | **NEW** |
| 9 | Advice & Feedback (message thread + attachments) | `/api/student/advice` (GET/POST), `/api/student/feedback` (GET) | exists |
| 10 | Profile & Contributors (roster + invite, settings, plan) | `/api/student/profile`, `/api/student/access-grants`, `/api/student/subscription` | exists |

### Additional screens (beyond the mocks — mostly already backed)
| Screen | Key endpoint(s) | Backend status |
|--------|-----------------|----------------|
| Timetable | `/api/student/timetable` *(self: `/self/timetable`)* | exists |
| Calendar | `/api/student/calendar` *(self: `/self/calendar`)* | exists |
| Assignments (list + submit) | `GET /api/student/assignments`, `POST /assignments/[id]/submit` | exists |
| Teacher Feedback | `GET /api/student/feedback` | exists |
| Courses / Learning (catalog, enrol, à-la-carte buy) | `GET/POST /api/student/courses`, `/courses/[slug]`, `POST /courses/order`+`/verify` | exists |
| Certificates | `GET /api/student/certificates` | exists |
| Live classes | `GET /api/student/live-classes` | exists |
| Workshops | `GET /api/student/workshops` | exists |
| Articles (read & learn) | `GET /api/student/articles`, `/articles/[slug]` | exists |
| Reminders | `GET /api/student/reminders` | exists |
| Subscription & Plans (purchase) | `GET /api/student/subscription`, `POST /subscription/order`+`/verify` | exists (Razorpay) |
| Search (global) | client-side over existing endpoints, **or** new `/api/student/search` | optional NEW |
| Settings (notif prefs, theme) | **`/api/student/notification-preferences` (NEW)** | NEW |
| Account & Security (change pw, devices) | **`/account/change-password`, `/devices` (NEW)** | NEW |
| Help / Support / Legal | static + existing contact paths | none |

Quick actions (+): `POST /api/student/bmi`, `POST /api/student/advice`,
`POST /api/student/health/doctor-consultations`, `POST /api/student/assignments/[id]/submit`,
`POST /api/student/access-grants`.

> **Enrolled vs self-tracked:** the same screens render both. Enrolled students
> read `erp_*`-backed endpoints; independent students read `/api/student/self/*`.
> Selection is **session + query-param driven** (see §9). The app shows the source
> label ("Class 6 · 2025–26" vs "Self-tracked") and provenance badges.

---

## 9. Data, provenance, plan-gating & source selection

### Endpoint inventory (auth/method/gating) — what the app calls
| Route | Methods | Auth helper | Gating |
|---|---|---|---|
| `dashboard` | GET | `auth()` | always-allowed |
| `enrollments` | GET | `auth()` | always-allowed |
| `profile`, `profile/image` | GET, POST | `getStudentIdentity()` | always-allowed |
| `subscription`, `subscription/order`, `subscription/verify` | GET / POST / POST | `auth()` | always-allowed |
| `articles`, `articles/[slug]` | GET | `auth()` | always-allowed |
| `bmi`, `bmi/[id]` | GET, POST, DELETE | `auth()` | always-allowed |
| `courses`, `courses/[slug]`, `courses/order`, `courses/verify` | GET, POST | `auth()` | always-allowed |
| `attendance` *(self)* | GET | `getStudentContext()` *(self: identity)* | `student.attendance` |
| `exams`, `marks` *(self)* | GET | `getStudentContext()` *(self: identity)* | `student.exams` / `student.marks` |
| `holistic` *(self)* | GET | `getStudentContext()` *(self: identity)* | `student.holistic` |
| `reports` *(self: report)* | GET | `getStudentContext()` *(self: identity)* | `student.report` |
| `timetable`, `calendar` *(self)* | GET | `getStudentContext()` *(self: identity)* | `student.timetable` / `student.calendar` |
| `assignments`, `assignments/[id]/submit` | GET, POST | `auth()` | `student.assignments` |
| `live-classes`, `workshops`, `certificates` | GET | `auth()` | `student.live-classes` / `.workshops` / `.certificates` |
| `advice` | GET, POST | `auth()` | `student.advice` |
| `feedback` | GET | `auth()` | `student.feedback` |
| `health`, `health/doctor-consultations` (+ diet-plans, lab-reports) | GET, POST | `auth()` | `student.health` |
| `reminders` | GET | `auth()` | `student.reminders` |
| `notifications` | GET, POST | `getStudentIdentity()` | badge map (per-feature booleans) |
| `access-grants`, `access-grants/[id]` | GET, POST, DELETE | `getStudentIdentity()` | always-allowed (self-tracking) |

**Feature keys** (mirror `feature-routes.ts` + `subscription.ts`):
- **Always-allowed:** `student.dashboard`, `student.profile`,
  `student.subscription`, `student.articles`, `student.bmi`, `student.courses`.
- **Plan-gated:** `student.attendance`, `student.exams`, `student.marks`,
  `student.report`, `student.holistic`, `student.timetable`, `student.calendar`,
  `student.assignments`, `student.live-classes`, `student.workshops`,
  `student.certificates`, `student.advice`, `student.feedback`, `student.health`,
  `student.reminders`.

### Source selection (enrolled vs self) — how the app picks
- `session.user.enrollment_id` is resolved at login. If **null** → independent
  student → call `/api/student/self/*` (which use `getStudentIdentity()`).
- If set → enrolled → call non-self routes (which use `getStudentContext()`).
- **Enrollment-history override:** pass `?enrollment_id=X` on enrolled routes; the
  backend verifies it belongs to the student. The **enrollment switcher** (a single
  student's own past/present enrollments — *not* the §5a account switcher) persists
  the chosen enrollment and threads it as this query param (Q5).
- `notifications` accepts `?source=self` or `?enrollment_id=X` to scope the
  badge stream; the new `/feed` endpoint should follow the same convention.

### Provenance & write rules
- **Two origins:** school records (`erp_*`, "School records" / "Filled by
  <teacher>") and self-tracked (`student_self_*`, "Filled by <contributor>").
  Every academic card carries a provenance badge.
- **Read-only academic classes:** attendance, marks/exams, timetable, holistic —
  the app never POSTs these.
- **Allowed writes:** BMI, advice requests, health consultation booking,
  assignment submission, contributor grants, course enrol/purchase, profile,
  subscription, device registration, notification prefs, change-password.

### API envelope
`app/lib/api-client.ts` returns `ApiResponse<T> = { data?, error?, message? }`;
non-OK → `error` set; network failure → `{ error: "Network error. Please try
again." }`; no retry in the client. The RN client mirrors this and adds
Bearer + single-flight 401 refresh + retry/offline banner.

---

## 9a. Audience & voice — dual-audience copy (student **and** parent)

The app is **not** student-only and **not** parent-only. The **same account** is
read by two audiences: the **student** (their own data) and a **parent/guardian**.

**The core constraint:** under the §5a Instagram-style multi-account model, a
parent **logs into the child's existing student account** — there is **no separate
parent identity**, so the **server cannot tell who is holding the phone**. Audience
is therefore a **client-side, local hint**, never a server fact.

### Strategy — neutral by default (the rule)
1. **Neutral by default — for ALL copy.** Every user-facing string is written to
   work for both audiences with **no variant**. The app ships **100% neutral**;
   `viewerRole` is *not required* for it to read correctly. The technique that makes
   this possible:
   - **Name-first, never possessive.** Use the student's first name instead of
     "your" / "your child's": "**Aarav's** report card", "**Aarav's** attendance
     dipped this week", "Ask a consultant about **Aarav**". This reads naturally to
     *both* the student and the parent and removes the audience fork entirely.
   - **Functional labels & actions are inherently neutral** (`Attendance`,
     `Timetable`, `Exams & Marks`, `Add`, `Save`, empty/error states).
   - When a name doesn't fit, fall back to **audience-agnostic** phrasing
     ("Today's classes", "Recent activity") — never to "you"-assumes-student or
     "your child"-assumes-parent.
2. **`viewerRole` variants — OPTIONAL, deferrable polish (not v1).** A `student` |
   `guardian` local hint *may* later tailor a handful of purely relational strings
   (greetings, nudges). It is an **enhancement on top of** complete neutral copy,
   never a dependency — if `viewerRole` is unset/skipped, neutral always wins. Do
   **not** build the app assuming it exists.
3. **Source labels stay orthogonal.** Enrolled-vs-self provenance ("Class 6 ·
   2025–26" vs "Self-tracked", "Filled by R. Thomas") is a separate axis from
   audience — don't conflate them.

### Examples
The **Neutral column is what ships.** The variant columns are illustrative of the
*optional* later polish only — they are never required.

| Context | Neutral (ships) | *opt.* `student` | *opt.* `guardian` |
|---|---|---|---|
| Home greeting | "Hi, Aarav 👋" | "Hi, Aarav 👋" | "Aarav's day" |
| Insight card | "Aarav's attendance dipped this week" | "Your attendance dipped this week" | *(same as neutral)* |
| Report card title | "Aarav's report card" | "Your report card" | *(same as neutral)* |
| Ask-consultant CTA | "Ask a consultant about Aarav" | "Ask a consultant" | *(same as neutral)* |
| BMI empty state | "No BMI entries yet — add one" | *(same)* | *(same)* |
| Attendance label | "Attendance" | *(same)* | *(same)* |

### Voice principles
- **Neutral is the default and the rule.** Write every string to work for both
  audiences with no variant. Audience-specific copy is the rare exception, never
  the starting point.
- **Name-first, not possessive-first.** Default to the student's first name; avoid
  "your child" (alienates the student) and avoid assuming "you = student"
  (alienates the parent).
- **No hardcoded user-facing strings in components.** Centralise everything in one
  **copy module** (`src/lib/copy.ts` / lightweight i18n) keyed by string id. Each id
  resolves to a neutral string by default; an id *may* optionally carry
  `viewerRole` variants. This doubles as the seam for future **localization**
  (e.g. Hindi).
- **`viewerRole` is device-local and optional**, stored per account alongside the
  token; it is **never sent to the backend** (consistent with §5a — no server-side
  parent identity) and has **zero** effect on data access or plan-gating. Unset →
  neutral.

### Build implications
- **v1 ships fully neutral copy** — no `viewerRole` work is required to launch.
- `src/lib/copy.ts`: id-keyed dictionary; each id is a neutral string by default,
  with an **optional** `{ student, guardian }` variant map. `useCopy()` returns the
  neutral string unless an active-account `viewerRole` + a variant both exist.
- Lint/convention: no string literals in JSX for user-facing text.
- *(Optional, later)* onboarding / add-account "Who's using this account?"
  (Student / Parent-guardian / skip) → sets the local `viewerRole`.

---

## 10. Project structure (app repo)

```
ww-student-app/
├── app/                  # expo-router routes (see §7)
├── src/
│   ├── api/              # client.ts (Bearer + refresh), endpoints/, types/
│   ├── auth/            # multi-session token store (secure-store), AuthContext, viewerRole, guards
│   ├── components/      # StatTile, TrendChart, Donut, ProgressRing, ProvenanceBadge, LockGate
│   ├── features/        # screen-level composition (home, insights, attendance, …)
│   ├── theme/           # tokens (navy/gold/Inter), spacing, typography
│   └── lib/             # query client, formatters, zod schemas, copy.ts (dual-audience §9a)
├── assets/
├── app.config.ts         # Expo config + API_BASE_URL env
├── eas.json              # EAS Build profiles
├── plan.md               # this file
└── package.json
```

---

## 11. Cross-cutting concerns
- **Error/empty/loading states** for every query (Query `isLoading`/`isError`).
- **Network resilience** — mirror web `api-client` "Network error" fallback;
  retry + offline banner.
- **Auth expiry UX** — silent single-flight refresh, then graceful re-login
  without losing the current screen intent.
- **Plan-gating UX** — lock/upsell state from `features[]`; deep-link to
  Subscription. Never call a gated endpoint we know is locked.
- **Accessibility** — dynamic type, contrast on navy/gold, screen-reader labels
  on charts.
- **Analytics/telemetry** — track daily-open + activity-feed engagement (the
  north-star metric).
- **Store compliance** — privacy policy URL, data-safety form (Play), Razorpay/IAP
  policy check. ⚠️ **No in-app account deletion (Q9)** — Apple Guideline 5.1.1(v)
  requires it for apps with account creation; flagged as a likely iOS review
  rejection to revisit before submission.
- **Environments** — staging vs prod base URL; feature-flag the (+) writes.

---

## 12. Phased roadmap

**Phase 0 — Foundations**
Expo scaffold, expo-router, theme tokens, API client w/ Bearer + refresh, secure
token store, TanStack Query provider, CI/EAS.

**Phase 1 — Auth (backend + app)**
Backend: extract claim helpers (§6.1.4); `/api/auth/mobile/{login,refresh,logout}`;
**bearer seam in `auth-utils` (§6.2)**; `student_refresh_tokens`. App: Welcome,
Login, OTP signup, password reset, **multi-account switcher (§5a)**, onboarding,
auth gate.

**Phase 2 — Core read screens**
Home (2), Insights (3) **+ new `/insights` endpoint**, Attendance (4),
Exams & Marks (5), Report Card (7), Timetable, Calendar — enrolled + self
variants, provenance, plan-gating.

**Phase 3 — Retention + write surfaces**
**Activity feed (8) + new `/feed` endpoint**, Health & Wellness (6) incl. BMI log
& consultation booking, Advice & Feedback (9), Assignments (list + submit),
the (+) quick actions, Profile & Contributors (10) incl. invite/grant.

**Phase 4 — Learning, settings, push & store**
Courses/Learning + à-la-carte purchase via **Razorpay native (Q4)**, Certificates,
Live classes, Workshops, Articles, Reminders, Search, Settings (+ notif prefs
endpoint), Account & Security (+ change-pw/devices endpoints), **OS push send
pipeline + device-token registration (Q6)**, plan upsell states, accessibility,
analytics, store submission (⚠️ no account-deletion — Q9 iOS risk).

**Phase 5 / Later (needs product decision)**
Guardian account model (deferred — Instagram-style multi-account in Phase 1 covers
the parent use case, §5a/Q1), offline caching, deep links.

---

## 13. Decisions / risks (Q1–Q9 all resolved)

- **Q1 — Multi-child accounts → Instagram-style multi-account (§5a).** A parent
  adds each sibling's existing student account and switches client-side; accounts
  stay logged in until each refresh token expires. **No guardian identity, no
  per-route authorization rework.** Only backend impact: `student_devices`
  many-to-many (§6.3 item 10). Guardian model deferred.
- **Q2 — OTP email delivery → wired.** The shared email service is live; signup/
  reset over OTP are safe to rely on in v1. No blocker.
- **Q3 — Bearer integration → `getSession(req)` helper** (§6.2). Both
  `getStudentContext`/`getStudentIdentity` are the only consumers, so one change
  covers all routes and keeps `session.user` shape identical. Work item:
  **add a `request` param to `getStudentIdentity()`** and thread it into callers.
- **Q4 — Payments → Razorpay native SDK** for subscriptions *and* à-la-carte
  courses (no web deep-link). Backend `/order` + `/verify` already exist; verify
  store IAP policy treats education payments as out-of-IAP.
- **Q5 — Source switching → `?enrollment_id=` contract.** Query param on enrolled
  routes, `getStudentIdentity()` (no param) for self. Closed by a single
  `EnrollmentContext` source-of-truth that auto-appends the param to every enrolled
  query and folds it into the TanStack Query cache key.
- **Q6 — OS push → in-scope for v1** (not deferred). `/feed` covers in-app
  retention; device-token registration (§6.3 item 10) **plus** the server send
  pipeline (§6.3 item 11, Expo Push/FCM/APNs) both ship in Phase 4.
- **Q7 — Activity feed → build `/api/student/feed`** aggregating events across
  `erp_*` / `student_self_*` with read/unread + pagination. **Spec the event model
  first** (it also drives push, Q6) — the core retention loop depends on it.
- **Q8 — Insights → build the `/api/student/insights` aggregate endpoint** (not
  client compose). One round-trip; server owns the "insight of the day" logic.
- **Q9 — Account deletion → not building it.** No `/account/delete` endpoint or
  in-app delete UI. ⚠️ **Compliance risk:** Apple Guideline 5.1.1(v) requires in-app
  deletion for apps with account creation — likely iOS review rejection. Tracked in
  §11 / Phase 4 store-prep; revisit before submission.

---

## 14. Reference index
- Mocks: `mocks/students/mobile/index.html` (10 screens), `mocks/students/web/`
- Backend app: `ww-student-dashboard/` (Next.js 16, NextAuth v5, pg, Razorpay)
- Auth core (private claim helpers): `ww-student-dashboard/app/lib/auth.ts`
- **Per-route auth helpers:** `ww-student-dashboard/app/lib/auth-utils.ts`
  (`getStudentContext`, `getStudentIdentity`) — the Bearer seam
- Plan-gating: `ww-student-dashboard/app/lib/feature-routes.ts`,
  `app/lib/subscription.ts` (ALWAYS_ALLOWED set)
- Web API client to mirror: `ww-student-dashboard/app/lib/api-client.ts`
- Razorpay flow: `app/api/student/subscription/{order,verify}`,
  `app/api/student/courses/{order,verify}`, `app/lib/razorpay.ts`
- Account flows: `Login_and_Account_Flows.txt`
- Design tokens: `ww-student-dashboard/app/globals.css`

> **Note on `/notifications` vs `/feed`:** `GET /api/student/notifications`
> returns a per-feature **badge map** for tab dots, not a timeline. The mock-8
> activity feed needs the **new `/api/student/feed`** endpoint (§6.9 / Q7).
