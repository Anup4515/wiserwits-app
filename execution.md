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

## Phase 3 — Retention + write surfaces (Backend + App) — ✅ DONE
> Backend + app both typecheck clean (`tsc --noEmit` = 0 on each). Most Phase 3
> backend already existed (assignments/advice/feedback/health/access-grants); the
> only net-new backend was the feed.
>
> ⚠️ **Design decision (Q7 feed):** built as a **DERIVED** feed, not a stored
> event table. `app/lib/feed.ts` merges recent rows from the existing activity
> tables at read time (same philosophy as `notifications.ts`), day-grouped in the
> app; unread = a single per-student `student_feed_reads` watermark (migration
> `002`, seeded to NOW() so a backlog never floods). A **stored per-event model —
> needed to fan out OS push — is deferred to Phase 4** (Q6); this derived feed is
> the read surface for now. Feed pagination (`?before=` cursor) exists in the API;
> the app renders the first page + pull-to-refresh (infinite scroll TBD).
>
> App infra added: `useApiMutation` (the app's first write path), Phase-3 query +
> mutation hooks, new types. Navigation: a center **"+" tab** opens a
> `/quick-actions` modal; Feed/Health/Advice/Assignments/Contributors are
> top-level routes reachable from Home's Explore grid and Profile.

1. `[B]` ✅ `GET /api/student/feed` + `POST /feed` (mark read) — chronological,
   day-grouped, paginated, read/unread. **Derived** (see note); migration `002`
   `student_feed_reads`.
2. `[A]` ✅ Activity feed (mock 8) → `app/feed.tsx`.
3. `[A]` ✅ Health & Wellness (mock 6): BMI card/trend, consultations, diet, lab reports
   → `app/health.tsx` (+ `log-bmi`, `book-consultation` modals).
4. `[A]` ✅ Advice & Feedback (mock 9) thread → `app/advice.tsx` (GET/POST advice +
   read-only feedback) + `ask-advice` modal.
5. `[A]` ✅ Assignments: list + submit → `app/assignments.tsx` (`POST /assignments/[id]/submit`).
6. `[A]` ✅ (+) quick actions → center "+" tab → `app/quick-actions.tsx`: log BMI, ask
   consultant, book consultation, submit assignment, invite contributor.
7. `[A]` ✅ Profile & Contributors (mock 10): roster + invite/grant/revoke
   (`/access-grants`) → `app/contributors.tsx` (+ `invite-contributor` modal),
   linked from Profile.
   *(Deferred to Phase 4: OS push send pipeline / stored event model; feed
   infinite-scroll; file-upload assignment submission.)*

## Phase 4 — Learning, settings, push & store (Backend + App) — ✅ DONE (2 follow-ups)
> ⚠️ **UPDATE (20 Jul 2026): OS push / notifications (items 1, 2, 3, 9) were
> REMOVED** — all push code, migrations 003–005, the devices/notification-prefs/
> push-tick routes, `app/lib/push.ts`/`expo-push.ts`, the app push client,
> `PushGate`, the Settings screen and the `expo-notifications` plugin are gone.
> The rest of Phase 4 (courses, content screens, search, account & security /
> change-password, store docs) remains.
>
> Both repos typecheck clean (`tsc --noEmit` = 0 each). Two items are
> intentionally left partial (10 a11y sweep, 11 store submission); account
> deletion stays descoped per Q9 (iOS-review risk tracked).

**Backend (ww-student-dashboard):**
1. `[B]` ✅ `POST/GET/DELETE /api/student/devices` + `DELETE /devices/[id]`
   (migration `003_student_push_tokens`, **`UNIQUE (student_id, expo_push_token)`**
   so multi-account devices get push for every added child — §5a). Upsert register.
2. `[B]` ✅ `GET/PATCH /api/student/notification-preferences` (migration
   `004_student_notification_preferences`: master `push_enabled` + academics /
   assignments / feedback / health channels, all-on default, seeded on first read).
3. `[B]` ✅ **OS push send pipeline:** `app/lib/expo-push.ts` (thin Expo Push HTTP
   client, mirrors `email.ts`) + `app/lib/push.ts` (reuses the derived feed's
   SOURCES; 48h window; per-channel prefs; **idempotency ledger**
   `005_student_push_deliveries`, ON CONFLICT DO NOTHING + RETURNING; dead-token
   cleanup on `DeviceNotRegistered`) driven by `GET /api/cron/push-tick`
   (`CRON_SECRET`-auth, registered in `vercel.json`, */15m).
4. `[B]` ✅ `POST /api/student/account/change-password` (bcrypt cost-10 on
   `students.password`, verifies current, keeps the current session valid).

**App (ww-student-app):**
5. `[A]` ✅ Courses / Learning → `app/courses.tsx` (enrolled + catalog, free enrol
   via `POST /courses`, à-la-carte purchase via `/courses/order` → Razorpay → `/courses/verify`)
   + `app/course/[slug].tsx` (videos/documents, enrolled-only).
6. `[A]` ✅ Subscription & Plans → `app/subscription.tsx` (unchanged from before;
   the à-la-carte flow mirrors it). *(Backend `/subscription`, `/order`, `/verify`
   already existed.)*
7. `[A]` ✅ Certificates, Live classes, Workshops, Articles (+ `article/[slug]`),
   Reminders, Feedback screens (all `QueryView` read screens against existing routes).
8. `[A]` ✅ Search (`app/search.tsx`, client-side over courses+articles),
   Settings (`app/settings.tsx`, notif prefs + OS-permission prompt),
   Account & Security (`app/account-security.tsx`, change password + device list),
   Help/Legal (`app/help.tsx`). All linked from Profile (+ a header search button).
9. `[A]` ✅ Push client → `src/lib/push.ts` (permission, `getExpoPushTokenAsync`,
   register per active account, unregister on sign-out) + `src/components/PushGate.tsx`
   (re-register on account switch, deep-link on notification tap) + onboarding now
   fires the real OS prompt. `expo-notifications` added to `app.config.ts` plugins.
10. `[A]` 🟡 Analytics → `src/lib/analytics.ts` (provider-agnostic `track()` stub;
    wired: app_open, login, push_registered, feed_opened, plan_purchased,
    course_acquired). Plan-upsell states already live via `LockGate`.
    **Follow-up:** point `analytics.deliver()` at a real sink; a full accessibility
    sweep (labels/roles across all screens) is still pending.
11. `[A/B]` 🟡 Store prep → `store/privacy-policy.md` + `store/play-data-safety.md`
    (DRAFTs for legal/product review). **Follow-up:** host the policy, fill the
    store consoles, and submit. ⚠️ **Risk unchanged:** no in-app account deletion
    (Q9) — likely iOS App Review rejection [Guideline 5.1.1(v)]; the store-prep
    doc lists the two ways to resolve it before submission.

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
