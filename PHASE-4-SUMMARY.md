# Phase 4 — Implementation Summary

> ⚠️ **UPDATE (20 Jul 2026): the OS push / notification subsystem was REMOVED.**
> Items **4.1 Devices, 4.2 Notification preferences, 4.3 Push pipeline, 4.9 Push
> client** and everything referencing them below (migrations `003`/`004`/`005`,
> `app/lib/push.ts`, `app/lib/expo-push.ts`, `api/student/devices`,
> `api/student/notification-preferences`, `api/cron/push-tick`, the app
> `src/lib/push.ts`, `PushGate`, the Settings screen, the `expo-notifications`
> plugin, and the `push_registered` analytics event) **no longer exist.** The DB
> tables created by 003–005 may still exist in already-migrated databases as
> harmless orphans (drop them manually if desired). Everything else in Phase 4
> (courses, content screens, search, account & security / change-password, store
> docs) is unchanged and still present.

**Scope:** Learning, settings, and store prep — across both repos
(`ww-student-dashboard` backend + `ww-student-app` Expo app).

**Status:** ✅ Implemented. Both repos `tsc --noEmit` = **0 errors**; `expo config`
resolves with the new `expo-notifications` plugin; expo-router typed routes
regenerated so every new screen validates. Two items are intentionally partial
(a11y sweep, store submission) and account deletion stays descoped per Q9 — see
[Remaining](#remaining--follow-ups).

_Last updated: 18 July 2026_

---

## Done — Backend (`ww-student-dashboard`)

Migrations start at `003` (Postgres, `?` placeholders, `IF NOT EXISTS`, tracked
under `service_name='student-dashboard'`).

| Item | Files | Notes |
|---|---|---|
| **4.1 Devices** | `migrations/003_student_push_tokens.sql`, `app/api/student/devices/route.ts` (GET/POST/DELETE), `app/api/student/devices/[id]/route.ts` (DELETE) | `UNIQUE (student_id, expo_push_token)` — multi-account devices get push for every added child (§5a). POST upserts (safe to call every launch). |
| **4.2 Notification preferences** | `migrations/004_student_notification_preferences.sql`, `app/api/student/notification-preferences/route.ts` (GET/PATCH) | Master `push_enabled` + channels `academics / assignments / feedback / health`; all-on default, seeded on first read. |
| **4.3 OS push send pipeline** | `app/lib/expo-push.ts`, `app/lib/push.ts`, `migrations/005_student_push_deliveries.sql`, `app/api/cron/push-tick/route.ts`, `vercel.json` | Thin Expo Push HTTP client (mirrors `email.ts`). Reuses the **derived feed's** SOURCES; 48h window; per-channel prefs; **idempotency ledger** (`ON CONFLICT DO NOTHING` + `RETURNING`); dead-token cleanup on `DeviceNotRegistered`. Cron `*/15m`, `CRON_SECRET`-auth. |
| **4.4 Change password** | `app/api/student/account/change-password/route.ts` | bcrypt cost-10 on `students.password`; verifies current; keeps the current session valid. |
| Config | `.env.example` | Documented `CRON_SECRET` (required) + optional `EXPO_ACCESS_TOKEN`. |

Design note: the push pipeline **claims events before sending** (ledger insert),
so a delivery is attempted at most once — a failed Expo send is not retried
(acceptable because the in-app feed is the durable surface). See "Known
trade-offs".

## Done — App (`ww-student-app`)

| Item | Files |
|---|---|
| **4.5 Courses / Learning** | `app/courses.tsx` (enrolled + catalog, free enrol via `POST /courses`, à-la-carte purchase `/courses/order` → Razorpay → `/courses/verify`), `app/course/[slug].tsx` (videos/documents, enrolled-only) |
| **4.6 Subscription** | `app/subscription.tsx` (pre-existing; the à-la-carte flow mirrors it) |
| **4.7 Content screens** | `app/certificates.tsx`, `app/live-classes.tsx`, `app/workshops.tsx`, `app/articles.tsx` + `app/article/[slug].tsx`, `app/reminders.tsx`, `app/feedback.tsx` |
| **4.8 Search / Settings / Security / Help** | `app/search.tsx`, `app/settings.tsx`, `app/account-security.tsx`, `app/help.tsx` (all linked from `app/(tabs)/profile.tsx` + a header search button) |
| **4.9 Push client** | `src/lib/push.ts` (permission → `getExpoPushTokenAsync` → register per active account; unregister on sign-out), `src/components/PushGate.tsx` (re-register on account switch, deep-link on tap), `app.config.ts` (plugin), `app/onboarding.tsx` (real OS prompt), `src/auth/AuthContext.tsx` (unregister on sign-out) |
| **4.10 Analytics (partial)** | `src/lib/analytics.ts` — provider-agnostic `track()`; wired at `app_open`, `login`, `push_registered`, `feed_opened`, `plan_purchased`, `course_acquired`. Plan-upsell states already live via `LockGate`. |
| Supporting | `src/api/student-types.ts` (+ device/prefs/course/content types), `src/api/hooks.ts` (+ 14 hooks/mutations) |

## Store prep (DRAFTs)

- `store/privacy-policy.md` — drafted from the app's actual data flows.
- `store/play-data-safety.md` — Play Data Safety answers + the account-deletion
  risk and two resolution options.

Both are marked **DRAFT for legal/product review**.

---

## Remaining / follow-ups

### Not runtime-verified (needs a live environment)
- [ ] **Run migrations** `003–005` against a dev database (`npm run migrate`).
- [ ] **End-to-end smoke test** on a dev build (not Expo Go):
  - register a push token → trigger `GET /api/cron/push-tick` → receive + tap the
    notification → confirm deep-link;
  - Razorpay course purchase (`/courses/order` → checkout → `/courses/verify`);
  - change password; add/remove a device in Account & Security.
- [ ] Confirm `EXPO_ACCESS_TOKEN` need (only if Expo "Enhanced Security for Push"
  is enabled) and set `CRON_SECRET` in the deploy env.

### Intentionally partial
- [ ] **4.10 Accessibility sweep** — add `accessibilityRole`/`accessibilityLabel`
  and Dynamic-Type checks across all new screens (only spot-coverage so far).
- [ ] **4.10 Analytics sink** — point `analytics.deliver()` at a real destination
  (e.g. `POST /api/student/analytics` or an Expo-compatible SDK). Events already fire.
- [ ] **4.11 Store submission** — host the privacy policy at a public URL, wire it
  into the listing + `help.tsx`, fill the Play/App Store consoles, submit.

### Descoped (product decision Q9)
- [ ] **In-app account deletion** — NOT built. ⚠️ Likely **iOS App Review
  rejection** (Guideline 5.1.1(v)). Resolve before submission: either add a
  `DELETE /api/student/account` flow + confirmation UI, or link to a web deletion
  flow. Details in `store/play-data-safety.md`.

### Known trade-offs (by design, revisit if needed)
- Push pipeline claims-before-sends → a failed Expo send is not retried.
- `removeAccount` of a **non-active** sibling doesn't server-unregister that
  device token (the api client only carries the active bearer); it expires / is
  pruned on the next dead-token receipt. Sign-out of the active account **does**
  unregister.
- Push cadence is a 15-min cron (not real-time). Idempotent, so cadence is a
  product choice, not a correctness one.

---

## Quick reference — how to extend

- **New screen:** add `app/<name>.tsx` (default export) + register in
  `app/_layout.tsx`; data via a `use*` hook in `src/api/hooks.ts` → `useSourceQuery`;
  render with `QueryView`. After adding routes, regenerate typed routes by booting
  the dev server once (`npx expo start`) so `.expo/types/router.d.ts` updates.
- **New push channel:** add a column to `student_notification_preferences`, map
  the feed category in `app/lib/push.ts` `CATEGORY_CHANNEL`, and add the toggle in
  `app/settings.tsx`.
- **New analytics event:** add to the `AnalyticsEvent` union in `src/lib/analytics.ts`.
