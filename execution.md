# WiserWits — Student Mobile App · Execution Plan

> Build checklist derived from [`plan.md`](./plan.md). Phases are ordered by
> dependency; check items off as you go. **Backend** = work in
> `ww-student-dashboard`; **App** = work in `ww-student-app`.
>
> Legend: `[B]` backend (`ww-student-dashboard`) · `[A]` app (`ww-student-app`).
> All open questions (Q1–Q9) are resolved — see the decisions block at the bottom.

---

## Phase 0 — Foundations (App) — ✅ DONE
> Expo SDK 55 (React 19.2 / RN 0.83, expo-router). `tsc --noEmit` clean,
> `expo config` resolves, `expo install --check` green. (Pinned to SDK 55, not the
> newer 56, because the public Play Store Expo Go doesn't yet support 56.)
> Razorpay SDK installed but is a native module — wire its config plugin + dev
> build in Phase 4 (not usable in Expo Go).

1. `[A]` Scaffold Expo app (TypeScript, expo-router), set up `app/` + `src/` per plan §10.
2. `[A]` Add deps: TanStack Query, `react-hook-form` + `zod`, `expo-secure-store`,
   charts lib, `@expo/vector-icons`, NativeWind (or StyleSheet + tokens),
   **Razorpay RN SDK** (Q4 → native checkout), `expo-notifications` (Q6 → push).
3. `[A]` Theme layer: brand tokens (navy `#1A2658`, gold `#F0C227`, Inter), spacing, typography.
3a. `[A]` **Copy module (`src/lib/copy.ts`) — neutral by default (§9a):** id-keyed
    strings, all written **neutral** (name-first, works for student *and* parent);
    `useCopy()` hook. `{ student, guardian }` variants are **optional/deferred** —
    ships 100% neutral, no `viewerRole` needed. No user-facing literals in JSX. (i18n-ready.)
4. `[A]` API client (`src/api/client.ts`): `fetch` wrapper, `ApiResponse<T>` envelope,
   Bearer header, single-flight 401 refresh, network/offline handling.
5. `[A]` `API_BASE_URL` via Expo env (staging/prod); TanStack Query provider.
6. `[A]` CI + EAS Build profiles (`eas.json`, `app.config.ts`).

## Phase 1 — Auth / login system (Backend + App) — ✅ DONE
> Backend + app both typecheck clean; jose sign/verify roundtrip validated against
> the real `AUTH_SECRET` (tamper + audience checks pass). Full HTTP smoke test
> still pending a running backend + Postgres.
>
> ⚠️ **Plan correction (Q3/§6.2):** the seam was NOT "just the two `auth-utils`
> helpers" — **29 student routes call `auth()` directly**. `getSession()` was made
> to read the Bearer from `next/headers()` when no request is passed, so all 29 were
> converted `auth()` → `getSession()` with **no signature changes**. Web cookie flow
> is preserved (falls back to `auth()` when no Bearer). CORS added on the mobile auth
> routes; `/api/student/*` CORS only matters for the Expo **web** build (follow-up).

**Backend (the cookies → tokens switch, plan §5–§6.2):**
1. `[B]` Extract `resolveActiveEnrollment` + `resolvePlanState` out of `auth.ts`
   into `app/lib/session-claims.ts` (export, single implementation).
2. `[B]` `app/lib/mobile-token.ts`: sign/verify access JWT with `jose` + `AUTH_SECRET`;
   opaque refresh-token gen + `sha256` hashing.
3. `[B]` Migration: `student_refresh_tokens` (id, student_id, token_hash, expires_at,
   revoked_at, created_at).
4. `[B]` `POST /api/auth/mobile/login` — reuse `authorize()` logic, issue tokens, rate-limit.
5. `[B]` `POST /api/auth/mobile/refresh` — validate + rotate, re-run `resolvePlanState`.
6. `[B]` `POST /api/auth/mobile/logout` — revoke refresh token (+ `?all=true`).
7. `[B]` Bearer seam (Q3 → `getSession(req)` helper): add `getSession(req)`, swap both
   `auth-utils` helpers to it, **add `request` param to `getStudentIdentity()`** and
   thread to callers.
8. `[B]` CORS: allow `Authorization` header + `OPTIONS` preflight.
9. `[B]` Smoke-test: hit an existing `/api/student/*` route with a Bearer token.

**App:**
10. `[A]` **Multi-session** secure token store (array of `{studentId, name, tokens}`
    + `activeStudentId`) + `AuthContext` + root auth gate (`_layout.tsx`). No backend
    change — `student_refresh_tokens` already keys by student_id.
11. `[A]` Screens: Welcome, Login, OTP signup, password reset (reuse existing OTP endpoints).
12. `[A]` **Account switcher (§5a, Instagram-style):** add account / switch between
    siblings, per-account independent refresh; accounts stay logged in until each
    refresh token expires.
13. `[A]` Onboarding (first-run): notification opt-in. *(Optional/deferred: a
    `viewerRole` prompt — Student / Parent-guardian / skip → neutral, §9a — device-local,
    never sent to backend. Not needed for launch since copy ships neutral.)*

## Phase 2 — Core read screens (Backend + App) — ✅ DONE
> App `tsc --noEmit` clean; the full expo-router bundle builds (Hermes, HTTP 200)
> with every new screen included. Backend `/insights` route is tsc-clean and
> modeled on the proven `/dashboard` SQL (same tables/columns) — a live HTTP
> smoke test is still pending a running backend + Postgres.
>
> Notes: the enrolled academic route *bodies* don't currently call the plan-gate
> helpers (`gateApiFeature`), so gating is enforced **client-side** from the
> `features[]` claim (forward-compatible with a future `403 plan_required`); the
> ungated `/self/*` routes are never locked. Charts are custom `react-native-svg`
> (ring/donut/sparkline/bars) rather than a chart lib, for empty-data safety.

1. `[B]` ✅ `GET /api/student/insights` aggregate endpoint (Q8): overall grade ring,
   attendance trend series, holistic bars, strengths/focus, "insight of the day".
   Handles enrolled (`erp_*`) + self (`student_self_*`); honours `?enrollment_id=`.
2. `[A]` ✅ Shared components: StatTile, TrendChart, Donut, ProgressRing, ProvenanceBadge,
   LockGate (+ SourceBadge, MonthStepper, SectionHeader, Loading/Error/Empty states, QueryView).
3. `[A]` ✅ **Source/enrollment context (Q5 → `?enrollment_id=` contract):** single
   `EnrollmentContext` source-of-truth; `useSourceQuery` auto-appends `?enrollment_id=`
   to enrolled queries and folds source+override+active-account into the cache key;
   routes to `/self/*` when `enrollment_id` is null; resets override on account switch.
4. `[A]` ✅ Home (mock 2) → `/dashboard` (school + self bodies, today's classes, recent marks).
5. `[A]` ✅ Insights (mock 3) → new `/insights` (rings, trend, holistic bars, strengths/focus).
6. `[A]` ✅ Attendance (4), Exams & Marks (5, list → marks detail), Report Card (7,
   enrolled cards + self live summary) — enrolled + self variants, provenance.
7. `[A]` ✅ Timetable (day selector), Calendar (month-scoped) — enrolled + self variants.
8. `[A]` ✅ Plan-gating: `LockGate`/upsell from `features[]`; gated queries are disabled
   (never call a known-locked endpoint). Academics hub shows per-row lock hints.

## Phase 3 — Retention + write surfaces (Backend + App)
1. `[B]` `GET /api/student/feed` (Q7 → build per spec) — chronological, day-grouped,
   paginated activity feed with read/unread (the daily-open hook). Define the event
   model (new marks, attendance marked, report published, advice replied, …) +
   unread storage; this event model also drives push (Phase 4, Q6).
2. `[A]` Activity feed (mock 8) → new `/feed` (replaces badge-map assumption).
3. `[A]` Health & Wellness (mock 6): BMI card/trend, consultations, diet, lab reports.
4. `[A]` Advice & Feedback (mock 9) thread → `/advice` (GET/POST) + `/feedback`.
5. `[A]` Assignments: list + submit (`POST /assignments/[id]/submit`).
6. `[A]` (+) quick actions: log BMI, ask consultant, book consultation, submit assignment, invite contributor.
7. `[A]` Profile & Contributors (mock 10): roster + invite/grant (`/access-grants`).

## Phase 4 — Learning, settings, push & store (Backend + App)
**Backend:**
1. `[B]` `POST /api/student/devices` + `DELETE /devices/:id` (+ `student_devices`
   table, **many-to-many: `UNIQUE (student_id, expo_push_token)`** so multi-account
   devices get push for every added child — §5a).
2. `[B]` `GET/PATCH /api/student/notification-preferences` (+ table).
3. `[B]` **OS push send pipeline (Q6 → in-scope, not deferred):** send service over
   Expo Push (→ FCM/APNs); fire on the Phase 3 feed event model, fan out to the
   student's registered devices, respecting notification-preferences. Idempotent +
   token-cleanup on receipts (drop dead tokens).
4. `[B]` `POST /api/student/account/change-password` (or confirm reset flow covers it).

**App:**
5. `[A]` Courses / Learning: catalog, enrol, à-la-carte purchase (`/courses`, `/order`,
   `/verify`) via **Razorpay native SDK** (Q4).
6. `[A]` Subscription & Plans → `/subscription` + `/order` + `/verify` via **Razorpay
   native SDK** (Q4 — no web deep-link).
7. `[A]` Certificates, Live classes, Workshops, Articles, Reminders, Feedback screens.
8. `[A]` Search, Settings (notif prefs), Account & Security (change pw, devices), Help/Legal.
9. `[A]` Push client (`expo-notifications`): permission prompt, register token →
   `/devices` (per active account), handle foreground/background receipt + deep-link.
10. `[A]` Accessibility pass, analytics (daily-open + feed engagement), plan upsell states.
11. `[A/B]` Store prep: privacy policy, Play data-safety form, submit.
    ⚠️ **Risk:** no in-app account deletion (Q9) — likely iOS App Review rejection
    [Guideline 5.1.1(v)]; revisit before submission.

## Phase 5 / Later (needs product decision)
- Guardian account model (separate parent identity + authorization layer) —
  deferred; **not needed** given Instagram-style multi-account (Phase 1, §5a).
- Offline caching, deep links.
- *(OS push send pipeline moved into Phase 4 per Q6.)*

---

## Open questions — all resolved (decisions baked into phases above)
- **Q1** Multi-child → **Instagram-style multi-account** (Phase 1, §5a). Client-side
  multi-session switch; only backend impact is many-to-many `student_devices`.
- **Q2** OTP email delivery → **wired** — signup/reset are safe to rely on; no blocker.
- **Q3** Bearer seam → **`getSession(req)` helper** (Phase 1.7).
- **Q4** Payments → **Razorpay native SDK** for subscriptions *and* à-la-carte
  courses (Phase 4.6–4.7); no web deep-link.
- **Q5** Source switching → **`?enrollment_id=` contract** via a single
  `EnrollmentContext` + auto-appended cache key (Phase 2.3).
- **Q6** Push send pipeline → **in-scope now** (Phase 4.3), not deferred.
- **Q7** Activity feed → **build `/feed`** with its event model (Phase 3.1); the same
  event model drives push (Phase 4.3).
- **Q8** Insights → **build the `/insights` aggregate endpoint** (Phase 2.1).
- **Q9** Account deletion → **not building it** (no `/account/delete` endpoint, no
  in-app delete UI). ⚠️ **Compliance risk:** Apple Guideline 5.1.1(v) requires
  in-app deletion for apps with account creation — likely iOS review rejection.
  Tracked as a Phase 4 store-prep risk; revisit before submission.

## Cross-cutting (apply throughout — plan §11)
Loading/empty/error states per query · network resilience + offline banner ·
silent single-flight refresh · provenance badges · dual-audience copy · a11y ·
analytics · staging/prod envs.
