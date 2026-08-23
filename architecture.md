# Architecture — `ww-student-app`

WiserWits student mobile app (Expo / React Native). This document describes **only what exists in this repository**. The backend lives in a separate repo (referenced in code comments as `ww-student-dashboard`) and is **not** part of this codebase; anything server-side is marked accordingly.

Generated from a read of the working tree at `/Users/anupsharma/qcpl/code/ww/ww-student-app` (branch `master`).

---

## 1. Tech Stack

### Core

| Concern | What's used | Evidence |
|---|---|---|
| Framework | Expo SDK `^55.0.27` + React Native `0.83.6` | `package.json` |
| UI runtime | React `19.2.0`, React DOM `19.2.0`, `react-native-web ~0.21.0` (web target enabled) | `package.json`, `app.config.ts` → `web.output: "static"` |
| Language | TypeScript `~5.9.2`, `strict: true`, extends `expo/tsconfig.base` | `tsconfig.json` |
| Package manager | **npm** — `package-lock.json` is the only lockfile present (no `yarn.lock`, `pnpm-lock.yaml`, or `bun.lockb`) | repo root |
| Entry point | `expo-router/entry` | `package.json` → `main` |
| Build/release | EAS Build with `development` / `staging` / `production` profiles | `eas.json` |
| Compiler | React Compiler **enabled** via `experiments.reactCompiler: true` | `app.config.ts` |
| Typed routes | Enabled via `experiments.typedRoutes: true` (generates `.expo/types/router.d.ts`) | `app.config.ts` |

Scripts: `start`, `android`, `ios`, `web`, `typecheck` (`tsc --noEmit`), `lint` (`expo lint`).

### Navigation / Routing

- **`expo-router ~55.0.16`** — file-based routing over React Navigation (`react-native-screens`, `react-native-safe-area-context`).
- Route groups: `app/(auth)` (unauthenticated) and `app/(tabs)` (authenticated), plus ~30 root-level stack screens.
- Navigators in use: root `<Stack>` (`app/_layout.tsx`), `<Tabs>` (`app/(tabs)/_layout.tsx`), nested `<Stack>` for academics (`app/(tabs)/academics/_layout.tsx`), auth `<Stack>` (`app/(auth)/_layout.tsx`).
- Modal presentation (`presentation: "modal"`) for: `account-switcher`, `add-account`, `quick-actions`, `log-bmi`, `book-consultation`, `ask-advice`, `invite-contributor`.
- Dynamic routes: `app/course/[slug].tsx`, `app/article/[slug].tsx`.
- `unstable_settings = { initialRouteName: "index" }` anchors the academics stack so deep-pushed sub-screens always have a back route.
- Deep-link scheme: `wiserwits` (`app.config.ts`).

### State Management

There is **no** Redux / Zustand / MobX / Jotai / Recoil.

- **Server state** → TanStack Query (`@tanstack/react-query ^5.101.2`).
- **Global client state** → two React Contexts only:
  - `AuthProvider` (`src/auth/AuthContext.tsx`) — status, active user, account list, active student id.
  - `EnrollmentProvider` (`src/features/enrollment/EnrollmentContext.tsx`) — `source` (`enrolled` | `self`) and the `enrollmentId` history override.
- **Local screen state** → `useState` throughout.

### Networking

- **`fetch`** (React Native global) wrapped in a hand-rolled client at `src/api/client.ts`. **No Axios, no GraphQL/Apollo, no SWR.**
- Exposed as `api.get / post / upload / patch / delete`.
- Envelope contract: `{ data?, error?, message? }` (`src/api/types.ts` — mirrors the web `api-client.ts`).
- The client **never throws**; it returns the envelope. The query/mutation layer converts `{ error }` into a thrown `Error` so TanStack can surface it.
- Auth endpoints are an exception: they return payloads **flat** (not under `data`), typed as `Flat<T>` in `src/api/auth.ts`.

### Forms & Validation Libraries

- **`react-hook-form ^7.80.0` and `zod ^4.4.3` are declared in `package.json` but are NOT imported anywhere in `app/` or `src/`.** All forms are uncontrolled-by-hand: `useState` + imperative checks. See §4.
- No Formik, no Yup.

### Storage

| Layer | Implementation |
|---|---|
| Token/session storage | `expo-secure-store ~55.0.15` (iOS Keychain / Android Keystore) via `src/auth/secure-storage.ts` |
| Web fallback | `localStorage` (SecureStore has no web implementation — explicitly documented as dev/Expo-web only) |
| File cache | `expo-file-system/legacy` → `FileSystem.cacheDirectory` for downloads (`src/lib/download.ts`) |
| AsyncStorage / MMKV / SQLite / WatermelonDB / Realm | **Not Found** — none are dependencies or imports |

Storage keys (`src/auth/token-store.ts`):
```
ww.accounts             -> { activeStudentId, accounts: [{ studentId, name }] }
ww.session.<studentId>  -> { accessToken, refreshToken, user, viewerRole? }
```
Split per-account because SecureStore has a small per-key size limit.

### Other notable libraries

- `react-native-svg 15.15.3` — powers the hand-built charts in `src/components/charts.tsx` (`ProgressRing`, `Donut`, `TrendChart`, `BarRow`).
- `@expo/vector-icons ^15.0.2` (Ionicons) — the only icon set.
- `expo-linear-gradient` — hero/gradient surfaces.
- `expo-image` — used in `profile-edit`, `courses`, `course/[slug]`.
- `expo-image-picker` — profile photo selection.
- `expo-sharing` + `expo-file-system` — download-and-share for certificates/reports/course files.
- `expo-device` — device name sent with login.
- `expo-constants` — reads `extra.apiBaseUrl`.
- `react-native-gesture-handler` — `GestureHandlerRootView` at the root.
- `react-native-razorpay ^3.0.0` — payments, **lazily `require`d** (see §5).

### Declared but unused dependencies

Verified by grep across `app/` and `src/` — these appear in `package.json` but have **no import site**:

`react-hook-form`, `zod`, `react-native-gifted-charts`, `expo-notifications` (only referenced in a TODO comment in `app/onboarding.tsx`), `expo-linking` (screens use React Native's own `Linking`), `expo-font`, `expo-system-ui`, `react-native-reanimated` / `react-native-worklets` (no direct import; present as transitive peer requirements of expo-router/gesture-handler).

---

## 2. Architecture

### Folder structure

```
ww-student-app/
├── app.config.ts              # Dynamic Expo config; API base URL + release guard
├── eas.json                   # EAS build profiles (dev / staging / production)
├── .env.example / .env.local  # EXPO_PUBLIC_API_BASE_URL
├── tsconfig.json              # strict; path aliases @/* -> ./src/*, @/assets/*
│
├── app/                       # expo-router file-based routes (50 .tsx files)
│   ├── _layout.tsx            # Providers + auth gate + root Stack
│   ├── index.tsx              # Splash / initial redirect
│   ├── onboarding.tsx
│   ├── (auth)/                # welcome, login, signup, reset-password
│   ├── (tabs)/
│   │   ├── _layout.tsx        # 5-slot tab bar (Home, Insights, +, Academics, Profile)
│   │   ├── index.tsx          # Home
│   │   ├── insights.tsx
│   │   ├── create.tsx         # placeholder; tabPress intercepted -> /quick-actions
│   │   ├── profile.tsx
│   │   └── academics/         # hub + attendance, exams, marks, report,
│   │                          #   holistic, timetable, calendar
│   ├── course/[slug].tsx
│   ├── article/[slug].tsx
│   └── <~30 root screens>     # feed, health, advice, assignments, contributors,
│                              # subscription, courses, certificates, live-classes,
│                              # workshops, articles, reminders, feedback, search,
│                              # account-security, profile-details, profile-edit,
│                              # explore-all, help, quick-actions, log-bmi,
│                              # book-consultation, ask-advice, invite-contributor,
│                              # account-switcher, add-account
│
├── src/
│   ├── api/
│   │   ├── client.ts          # fetch wrapper: Bearer, envelope, 401 refresh+retry
│   │   ├── auth.ts            # login/refresh/logout + OTP signup & reset
│   │   ├── query.ts           # useApiQuery, useSourceQuery, withParams
│   │   ├── mutations.ts       # useApiMutation (+ invalidation)
│   │   ├── hooks.ts           # ~45 per-screen data hooks (the app's data API)
│   │   ├── types.ts           # ApiResponse, SessionUser, TokenPair, LoginResponse
│   │   └── student-types.ts   # ~600 lines of response DTOs
│   ├── auth/
│   │   ├── AuthContext.tsx    # session lifecycle, multi-account
│   │   ├── token-store.ts     # multi-session token store over secure-storage
│   │   └── secure-storage.ts  # SecureStore (native) / localStorage (web)
│   ├── components/
│   │   ├── ui.tsx             # Button, Field, FormError, Card, Brand, Avatar, Pill
│   │   ├── data-ui.tsx        # StatTile, SourceBadge, ProvenanceBadge, LockGate,
│   │   │                      #   LoadingState, ErrorState, EmptyState, SectionHeader
│   │   ├── charts.tsx         # SVG ProgressRing / Donut / TrendChart / BarRow
│   │   ├── QueryView.tsx      # lock → loading → error → data render boundary
│   │   ├── AuthScaffold.tsx
│   │   ├── NotificationBell.tsx
│   │   └── Placeholder.tsx
│   ├── features/
│   │   ├── auth/LoginForm.tsx
│   │   └── enrollment/        # EnrollmentContext, EnrollmentSwitcher,
│   │                          #   useSessionMonths (useSelectedEnrollment,
│   │                          #   useSessionMonthBounds, useBoundedMonth)
│   ├── lib/
│   │   ├── env.ts             # apiBaseUrl resolution + trailing-slash strip
│   │   ├── query-client.ts    # QueryClient defaults
│   │   ├── features.ts        # plan-gating mirror (FEATURE keys, hasFeature,
│   │   │                      #   isFeatureLocked, ALWAYS_ALLOWED)
│   │   ├── copy.ts            # dual-audience (student/guardian) copy dictionary
│   │   ├── format.ts          # date/number formatters
│   │   ├── explore.ts         # Explore launcher tile catalog
│   │   ├── download.ts        # authenticated download + OS share sheet
│   │   ├── razorpay.ts        # lazy native-module wrapper
│   │   └── analytics.ts       # track() seam (dev console only today)
│   └── theme/                 # tokens.ts (palette, colors, gradients, spacing,
│                              #   radius, shadow, fonts, typography) + index.ts
│
├── assets/
├── store/                     # play-data-safety.md, privacy-policy.md
└── plan.md, execution.md, PHASE-0-1-SUMMARY.md, PHASE-4-SUMMARY.md, README.md
```

### Feature/module organization

The codebase is organized **by layer**, not by feature, with one exception:

- `src/features/` holds only two modules — `auth` (the shared `LoginForm`) and `enrollment` (context + switcher + month hooks). Everything else is layered: routes in `app/`, data hooks in `src/api/hooks.ts`, shared UI in `src/components/`, cross-cutting utilities in `src/lib/`.
- `src/api/hooks.ts` (550 lines) is the de-facto feature registry: a named hook per screen (`useAttendance`, `useHealth`, `useCourses`, `useSubmitAssignment`, …). Screens import only the hook, never a path or the raw client — **except** the two payment flows (see §5).

### The source-split abstraction (central architectural idea)

Every academic screen must read from one of two backends depending on the student:

- **`enrolled`** — student has `enrollment_id != null`; reads school-ERP-backed routes (`/api/student/attendance`, …).
- **`self`** — independent/self-tracked student; reads `/api/student/self/*` routes.

`useSourceQuery` (`src/api/query.ts`) encapsulates all of it:

1. Resolves `source` from `EnrollmentContext`.
2. Calls `build(source)` to get the source-specific path + params.
3. Threads `?enrollment_id=` onto enrolled routes when a class-history override is active.
4. Composes the cache key as `[key, activeStudentId, source, enrollmentId|null, ...keyExtra]`.
5. Sets `enabled = !locked && activeStudentId != null` so a known plan-locked endpoint is never called.

Returns `{ query, source, locked }`, which `<QueryView>` renders as lock → loading → error → data.

Where enrolled and self return different shapes (reports, timetable, calendar, marks, holistic), the hook's type is a **union** and the screen narrows on `source`.

### Providers, contexts, hooks, services, API layer

**Provider tree** (`app/_layout.tsx`):
```
GestureHandlerRootView
└── SafeAreaProvider
    └── QueryClientProvider (queryClient)
        └── AuthProvider
            └── EnrollmentProvider
                ├── StatusBar
                └── RootNavigator (Stack + auth gate)
```

**Contexts:** `AuthContext` (`useAuth`) and `EnrollmentContext` (`useEnrollment`). Both throw if consumed outside their provider.

**Hook layers:**
1. `useApiQuery(key, path, enabled)` — raw query; unwraps `{ data }`, throws on `{ error }`.
2. `useSourceQuery(opts)` — source-aware + gated + account-scoped (above).
3. `useApiMutation(opts)` — write helper; unwraps, throws, invalidates key roots on success.
4. Per-screen hooks in `src/api/hooks.ts`.
5. Enrollment helpers: `useSelectedEnrollment`, `useSessionMonthBounds`, `useBoundedMonth` (month stepper clamped to the academic session).

**"Services"** — there is no `services/` directory. The equivalents are the `src/lib/*` modules (`download`, `razorpay`, `analytics`, `env`, `features`) and `src/api/auth.ts`.

**API surface reached by the client** (all literals found in the tree):

*Auth (flat responses):* `/api/auth/mobile/login`, `/api/auth/mobile/refresh`, `/api/auth/mobile/logout[?all=true]`, `/api/auth/signup/{request-otp,verify-otp,complete}`, `/api/auth/reset-password/{request-otp,verify-otp,complete}`

*Student (enveloped):* `/api/student/` + `dashboard`, `insights`, `feed`, `enrollments`, `profile`, `profile/image`, `attendance`, `exams`, `marks`, `reports`, `holistic`, `timetable`, `calendar`, `assignments`, `assignments/[id]/submit`, `advice`, `feedback`, `health`, `health/doctor-consultations`, `health/diet-plans`, `health/lab-reports`, `bmi`, `bmi/[id]`, `access-grants`, `access-grants/[id]`, `subscription`, `subscription/order`, `subscription/verify`, `courses`, `courses/[slug]`, `courses/[slug]/reviews`, `courses/order`, `courses/verify`, `certificates`, `live-classes`, `workshops`, `articles`, `articles/[slug]`, `reminders`, `account/change-password`

*Self routes:* `/api/student/self/` + `attendance`, `exams`, `exam-marks`, `report`, `holistic`, `timetable`, `calendar`

### Authentication flow and token management

**Model:** JWT access token + rotating refresh token, **multi-account** (Instagram-style — several students, e.g. siblings, on one device; switching is purely client-side with no server round-trip).

**Sign-in:**
```
LoginForm → useAuth().signIn(email, password)
          → POST /api/auth/mobile/login { email, password, deviceName }
          → { accessToken, refreshToken, user }        (flat, not enveloped)
          → addSession(user, tokens)                    // writes ww.session.<id>, sets active
          → track("login") → reload() → status: "authenticated"
```

**Route gate** (`app/_layout.tsx`): a `useEffect` on `useAuth().status` + `useSegments()` — `unauthenticated` and not in `(auth)` → `router.replace("/(auth)/welcome")`; `authenticated` and in `(auth)` → `router.replace("/(tabs)")`. `app/index.tsx` additionally renders a `<Redirect>` to avoid a flash on cold start.

**Token attachment** (`src/api/client.ts`): every request resolves the **currently active** `studentId`, loads its session, and sets `Authorization: Bearer <accessToken>` unless `auth: false`.

**Refresh on 401 — the notable part:**
- On a `401` with auth attached, the client refreshes **once** and retries the original request.
- Refreshes are **single-flight, keyed by `studentId`** (`Map<number, Promise<TokenPair|null>>`), not globally. Each request is bound to the account that was active when it was *issued*, so a mid-flight account switch can never make the retry go out with a sibling's token or return the wrong student's data.
- Session is dropped **only** on a definitive `401`/`403` from the refresh endpoint. A `5xx`, a malformed 2xx body, or a network failure keeps the tokens and surfaces an error — a deploy blip must not sign users out.
- Rotated tokens are persisted via `updateTokens(studentId, …)`.

**Session claims** (`SessionUser`): `student_id`, `enrollment_id`, `class_section_id`, `school_id`, `role`, `name`, `email`, `profile_image`, `features[]`, `course_ids[]`, `plan_id`, `plan_name`, `plan_expires_at`.

**Sign-out variants:**
- `signOut()` — active account only; best-effort server revoke (`POST /logout`) then local `removeSession`; other accounts stay signed in.
- `removeAccount(id)` — reads **that account's own** refresh token (not the active one) so a non-active sibling is genuinely revoked server-side.
- `signOutAll()` — `POST /logout?all=true` then `clearAll()`.

Server-side revocations are fire-and-forget (`void … .catch(() => {})`); local state is cleared regardless.

**`refreshSession()`** — forces a token+claims rotation without re-login. Used after a subscription purchase so newly granted `features[]` unlock gated screens immediately.

**OTP flows:** signup and password reset are three-step (`request-otp` → `verify-otp` → ticket → `complete`), all via `auth: false` calls.

---

## 3. Caching

### Client-side cache

**TanStack Query v5** is the only cache. Configuration is entirely in `src/lib/query-client.ts`:

```ts
queries: {
  retry: 1,
  staleTime: 60 * 1000,        // 1 minute
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
}
mutations: { retry: 0 }
```

**These are the only cache settings in the codebase.** A repo-wide grep for `staleTime`, `gcTime`, `cacheTime`, `refetchInterval`, `persist`, `onMutate`, `setQueryData` returns **exactly one hit** — the `staleTime` line above.

| Aspect | Status |
|---|---|
| `staleTime` | 60 s, global; **no per-query override anywhere** |
| `gcTime` / `cacheTime` | Not set → TanStack v5 default of 5 minutes |
| Retry | Queries: 1 retry. Mutations: 0 |
| Background refetch | On window/app focus and on reconnect (global defaults) |
| Polling / `refetchInterval` | **Not Found** — no polling anywhere |
| Persistence (offline cache) | **Not Found** — no `persistQueryClient`, no AsyncStorage/MMKV persister. Cache is in-memory and dies with the process |
| Optimistic updates | **Not Found** — no `onMutate`, no `setQueryData`, no rollback |
| Manual refetch | Pull-to-refresh via `<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />` on **25 screens** |
| Suspense / `useSuspenseQuery` | **Not Found** |
| Infinite queries / pagination | **Not Found** — no `useInfiniteQuery` |

### Cache key strategy

Keys always include the active account, so siblings never share cached data:

```
useApiQuery:    [<name>, activeStudentId, ...extras]
useSourceQuery: [<name>, activeStudentId, source, enrollmentId|null, ...keyExtra]
```

Because the key changes on account switch and on class-history switch, both act as automatic cache partitions rather than requiring an explicit clear.

### Invalidation

Declarative, via `useApiMutation({ invalidate: [...] })`. Roots are prefix-matched by TanStack, so `["assignments"]` refreshes every `["assignments", <anyStudentId>, …]` entry. Observed mappings:

| Mutation | Invalidates |
|---|---|
| `useSubmitAssignment` | `assignments`, `feed` |
| `useLogBmi` | `health`, `dashboard`, `feed` |
| `useDeleteBmi` | `health`, `dashboard` |
| `useBookConsultation` | `consultations`, `health`, `feed` |
| `useAskAdvice` | `advice`, `feed` |
| `useInviteContributor` / `useRevokeContributor` | `contributors` |
| `useMarkFeedRead` | `feed` |
| `useUpdateProfile` / `useUploadProfileImage` | `profile`, `dashboard` |
| `useSubmitCourseReview` | `course-reviews` |
| `useEnrollCourse` | `courses`, `course`, `dashboard` |
| `useChangePassword` | *(none)* |

Cache sharing is used deliberately: `NotificationBell` calls `useFeed()`, the same hook the Feed screen uses, so the unread badge and the list share one cache entry and stay in sync.

### Server-side caching

**Cannot be determined from the client codebase.** The backend is a separate repository. No `Cache-Control`, `ETag`, or revalidation headers are set or read anywhere in this app; responses are consumed as-is.

### HTTP-level caching

None beyond whatever the platform `fetch` does by default. No custom request de-duplication outside TanStack, and no HTTP cache directives are sent.

---

## 4. Validation

### Form validation approach: **manual, imperative, per-screen**

Despite `react-hook-form` and `zod` being installed, **neither is imported anywhere**. Every form follows the same hand-rolled pattern:

```tsx
const [value, setValue] = useState("");
const [localError, setLocalError] = useState<string | null>(null);

const submit = () => {
  setLocalError(null);
  if (<check fails>) { setLocalError("<message>"); return; }
  mutation.mutate(payload, { onSuccess: … });
};

<FormError message={mutation.error?.message ?? localError} />
```

`FormError` (`src/components/ui.tsx`) is the shared error banner; `Field` is the shared labeled input.

### Observed client-side rules

| Screen | Validation |
|---|---|
| `src/features/auth/LoginForm.tsx` | Non-empty email + password |
| `app/(auth)/signup.tsx` | All name/email fields non-empty; password ≥ 8 chars |
| `app/(auth)/reset-password.tsx` | Email non-empty; password ≥ 8 chars |
| `app/account-security.tsx` | Current password required; new ≥ 6 chars; confirm must match; new ≠ current |
| `app/log-bmi.tsx` | Height finite and 50–250 cm; weight finite and 10–300 kg; live BMI preview |
| `app/invite-contributor.tsx` | Email non-empty and contains `@`; at least one scope selected |

Note the **inconsistency**: signup/reset require ≥ 8 characters, change-password requires ≥ 6. Email "validation" is `includes("@")` — no regex, no library.

There is **no** schema, no shared validator module, no field-level/on-blur validation, and no typed parsing of API responses at runtime — `student-types.ts` is compile-time TypeScript only, and responses are cast (`res.data as T`) without verification.

### Client-side vs server-side

- **Client** — the checks above only. Purely a UX affordance.
- **Server** — authoritative. Every write returns `{ error: "…" }` on rejection; `useApiMutation` throws it and screens render it through the same `FormError`. The client's ownership/permission checks are explicitly deferred to the server (e.g. `useDeleteBmi`: "Ownership is enforced server-side"). **Specific server-side rules cannot be determined from the client codebase.**

### Plan gating as a second validation axis

`src/lib/features.ts` mirrors the backend's feature keys so the app can render a lock/upsell **without** calling an endpoint it knows is locked:

- `ALWAYS_ALLOWED` — `student.{dashboard, profile, subscription, articles, bmi, courses}`.
- `FEATURE` — 15 plan-gated keys (attendance, exams, marks, report, holistic, timetable, calendar, assignments, live-classes, workshops, certificates, advice, feedback, health, reminders).
- `isFeatureLocked(user, key)` returns `false` for **non-enrolled** students — self-tracked students hit ungated `/self/*` routes and are never locked out of their own data.

The file states plainly that the source of truth stays server-side, and that a `403 { error: "plan_required" }` degrades to the same upsell.

---

## 5. Performance & Security

### Performance

**What exists:**

- **React Compiler is enabled** (`experiments.reactCompiler: true`), which auto-memoizes components/hooks at build time. This is the stated reason manual memoization is nearly absent.
- **Query-level caching** — 60 s `staleTime` prevents refetch storms on navigation; shared cache keys mean e.g. `useFeed()` serves both the bell badge and the Feed screen from one fetch.
- **Fetch avoidance on locked features** — `useSourceQuery` sets `enabled: false` for plan-locked resources, so no request is made at all.
- **Lazy native module load** — `react-native-razorpay` is `require`d inside a try/catch and cached (`src/lib/razorpay.ts`), because a static import constructs a `NativeEventEmitter` at module load and crashes Expo Go. `isRazorpayAvailable()` lets the subscription screen degrade to a notice instead of crashing.
- **Custom SVG charts** instead of a chart library (`src/components/charts.tsx`) — the comment cites control over the design and avoiding empty-data runtime surprises. (`react-native-gifted-charts` is installed but unused.)
- **Resumable downloads with progress** — `FileSystem.createDownloadResumable` with an `onProgress` 0–1 callback for large files (`src/lib/download.ts`).
- **Month-range clamping** (`useBoundedMonth`) prevents fetching months outside the academic session that would only return empty data.
- **Safe-area-aware tab bar** sized off `useSafeAreaInsets()` for Android edge-to-edge.

**What does not exist (verified by grep):**

| Technique | Status |
|---|---|
| `FlatList` / `SectionList` / `FlashList` | **Not Found — zero usages.** All 41 list-rendering screens use `ScrollView` with `.map()`. No virtualization, no `getItemLayout`, no `keyExtractor`, no windowing |
| `React.lazy` / `Suspense` | **Not Found** |
| `React.memo` | **Not Found** |
| `useMemo` | 3 files only (`app/profile-edit.tsx`, `AuthContext.tsx`, `EnrollmentContext.tsx`) |
| `useCallback` | 2 files only (`AuthContext.tsx`, `EnrollmentContext.tsx`) |
| `InteractionManager` / deferred work | **Not Found** |
| Pagination / infinite scroll | **Not Found** — every list endpoint returns a full array |
| Image caching config | **Not Found** — `expo-image` used in 3 files with no explicit cache policy |
| Hermes / bundle-splitting config | **Not Found** as explicit config (Expo defaults apply) |

The `ScrollView`-everywhere choice is the most significant scalability risk in the client: list length is bounded only by what the API returns.

### Error handling

- **Network layer** — `apiRequest` never throws. Transport failures return `{ error: "Network error. Please try again." }`; non-JSON responses become `{ error: "Unexpected server response" }`.
- **Query layer** — `{ error }` is converted to a thrown `Error` so TanStack populates `isError` / `error`.
- **UI layer** — `<QueryView>` renders the four states uniformly (`LockGate` → `LoadingState` → `ErrorState` with a retry button → data). `ErrorState` shows the server message or a generic fallback.
- **Form layer** — `<FormError message={mutation.error?.message ?? localError} />`.
- **Imperative flows** — `Alert.alert(...)` for payments (`subscription.tsx`, `courses.tsx`), downloads, and external-link failures. `Linking.canOpenURL()` is checked before `openURL`.
- **Analytics** — `track()` is wrapped in try/catch and swallows: "analytics must not break a flow."
- **No React error boundary** — a repo-wide grep for `ErrorBoundary` / `componentDidCatch` / expo-router's `ErrorBoundary` export returns nothing. **An uncaught render error will crash to the red screen / native crash.**
- **No crash reporting** — no Sentry, Bugsnag, or Crashlytics dependency.

### Security

**Token storage**
- Native: `expo-secure-store` → iOS Keychain / Android Keystore.
- Web: `localStorage`, explicitly documented as dev/Expo-web only ("production auth runs on native where tokens are stored securely"). This is a real exposure if the web target is ever shipped.

**Token handling**
- Tokens live only in SecureStore and are read per-request — no in-memory global token, no interceptor holding state.
- Refresh rotation: both access and refresh tokens are replaced on every refresh.
- Session drop is conservative — only on `401`/`403` from `/refresh` (§2).
- Per-account single-flight refresh prevents cross-account token leakage on concurrent 401s.

**Bearer-token scoping on downloads** — `src/lib/download.ts` attaches `Authorization` **only** when the URL starts with `env.apiBaseUrl`, deliberately avoiding leaking the token to a third-party CDN hosting the file.

**Filename sanitization** — downloaded filenames are stripped to `[^\w.\-]` before hitting the cache directory.

**Environment configuration**
```
EXPO_PUBLIC_API_BASE_URL
  → app.config.ts (extra.apiBaseUrl)
  → src/lib/env.ts (trailing slashes stripped)
  → src/api/client.ts
```
- `eas.json` sets it per profile: dev `http://localhost:3000`, staging `https://staging.wiserwits.example/`, production `https://app.wiserwits.example/`. **Both staging and production still point at `.example` placeholder hosts.**
- `app.config.ts` contains a **release guard**: when `EAS_BUILD_PROFILE` is `staging` or `production`, the build **throws** if the URL is non-HTTPS or still matches `.example`. So the placeholders above will fail an EAS build rather than ship — but they also mean no real backend host is committed to this repo.
- `.env.local` exists locally; `.gitignore` excludes `.env*.local`, `*.jks`, `*.p8`, `*.p12`, `*.key`, `*.pem`, `*.mobileprovision`.
- `EXPO_PUBLIC_*` variables are inlined into the JS bundle by Expo — appropriate here, since only a base URL is stored. **No API keys, secrets, or Razorpay keys are committed.** The Razorpay `key_id` is fetched at runtime from `/api/student/subscription/order`.

**Payments** — order → native checkout → verify:
```
POST /api/student/subscription/order  → { key_id, order_id, amount, currency, plan_id, prefill }
RazorpayCheckout.open(options)        → { razorpay_payment_id, razorpay_order_id, razorpay_signature }
POST /api/student/subscription/verify → server verifies the signature
track("plan_purchased") → refreshSession() → new features[] unlock gated screens
```
Signature verification is server-side; the client never computes or holds a secret. The same pattern is repeated for course purchases (`/api/student/courses/order` + `/verify`). These two screens (`subscription.tsx`, `courses.tsx`) are the **only** places that call `api.*` directly instead of going through a hook.

**Privacy / data-minimization**
- `viewerRole` (`student` | `guardian`) is device-local, stored in the session blob, and "never leaves the device."
- `src/lib/analytics.ts` restricts events to 5 coarse names (`app_open`, `login`, `feed_opened`, `plan_purchased`, `course_acquired`) with scalar props only — explicitly "never free-text or personal data (that would change the Play Data Safety answers)."
- `deliver()` is a **console log in dev and a no-op in production** — no analytics sink is wired. Marked `TODO(analytics)`.
- `store/play-data-safety.md` and `store/privacy-policy.md` exist for store submission.

**Not Found:** certificate pinning, jailbreak/root detection, biometric auth (`expo-local-authentication`), app-level encryption beyond SecureStore, screenshot prevention, request signing, rate limiting, obfuscation.

**Testing/CI:** **Not Found** — no test files, no test runner dependency, no `.github/` workflows. The only automated checks are `npm run typecheck` and `npm run lint`.

---

## 6. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ UI COMPONENTS                                                               │
│ src/components/  ui.tsx (Button, Field, FormError, Card, Avatar, Pill)      │
│                  data-ui.tsx (StatTile, SourceBadge, LockGate, Loading/     │
│                               Error/EmptyState)                             │
│                  charts.tsx (SVG ProgressRing, Donut, TrendChart, BarRow)   │
│                  QueryView.tsx  ← lock → loading → error → data boundary    │
│ src/theme/       design tokens                                              │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ rendered by
┌────────────────────────────────▼────────────────────────────────────────────┐
│ NAVIGATION — expo-router (file-based, typedRoutes)                          │
│                                                                             │
│  app/_layout.tsx  ── AUTH GATE ──────────────────────────────────┐          │
│    GestureHandlerRootView → SafeAreaProvider → QueryClientProvider│          │
│      → AuthProvider → EnrollmentProvider → RootNavigator          │          │
│                                                                   │          │
│    status === "unauthenticated" ──────────► app/(auth)/ Stack     │          │
│         welcome · login · signup · reset-password                 │          │
│    status === "authenticated"   ──────────► app/(tabs)/ Tabs      │          │
│         Home · Insights · (+)modal · Academics(Stack) · Profile   │          │
│         + ~30 root Stack screens & modals                         │          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────────┐
│ SCREENS — app/**/*.tsx (50 route files)                                     │
│  • useState for local form state (no RHF/Zod)                               │
│  • ScrollView + .map() for lists (no FlatList)                              │
│  • <RefreshControl> pull-to-refresh on 25 screens                           │
│  • <QueryView result={…}> wraps every read                                  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ calls
┌────────────────────────────────▼────────────────────────────────────────────┐
│ HOOKS — src/api/hooks.ts (~45 hooks)                                        │
│   reads : useDashboard, useAttendance, useExams, useMarks, useReports,      │
│           useHolistic, useTimetable, useCalendar, useHealth, useFeed,       │
│           useCourses, useArticles, useSubscription, useProfile, …           │
│   writes: useLogBmi, useSubmitAssignment, useAskAdvice, useEnrollCourse,    │
│           useInviteContributor, useChangePassword, useUpdateProfile, …      │
│                                                                             │
│   context hooks: useAuth()        (src/auth/AuthContext)                    │
│                  useEnrollment()  (src/features/enrollment)                 │
│                  useBoundedMonth() (session-clamped month stepper)          │
└──────────┬───────────────────────────────────────┬──────────────────────────┘
           │                                       │
┌──────────▼───────────────────────┐   ┌───────────▼─────────────────────────┐
│ QUERY LAYER — src/api/query.ts   │   │ MUTATION LAYER — src/api/mutations  │
│  useApiQuery(key, path, enabled) │   │  useApiMutation({ method, path,     │
│  useSourceQuery({...})           │   │      body, invalidate, onSuccess }) │
│   ├ resolve source enrolled|self │   │   ├ unwrap { data } / throw { error }│
│   ├ thread ?enrollment_id=       │   │   └ qc.invalidateQueries(roots)     │
│   ├ key = [name, studentId,      │   └───────────┬─────────────────────────┘
│   │        source, enrollmentId] │               │
│   └ enabled = !locked            │               │
└──────────┬───────────────────────┘               │
           │                                       │
┌──────────▼───────────────────────────────────────▼──────────────────────────┐
│ CACHE — TanStack Query (src/lib/query-client.ts)                            │
│  staleTime 60s · retry 1 · refetchOnFocus · refetchOnReconnect              │
│  gcTime = v5 default 5min · in-memory only (no persistence)                 │
│  no polling · no optimistic updates                                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ cache miss / stale / mutate
┌────────────────────────────────▼────────────────────────────────────────────┐
│ SERVICES / CROSS-CUTTING — src/lib/                                         │
│  features.ts  plan-gate mirror (isFeatureLocked → skip the fetch entirely)  │
│  env.ts       apiBaseUrl resolution        analytics.ts  track() seam       │
│  razorpay.ts  lazy native checkout          download.ts  auth'd file fetch  │
│  format.ts · copy.ts · explore.ts                                           │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────────┐
│ API LAYER — src/api/client.ts  (fetch wrapper — no Axios)                   │
│                                                                             │
│  api.get/post/patch/delete/upload(path, body)                               │
│    1. studentId = getActiveStudentId()          ← binds request to account  │
│    2. Authorization: Bearer <accessToken>                                   │
│       Content-Type: application/json  (skipped for FormData uploads)        │
│       ngrok-skip-browser-warning: true                                      │
│    3. on 401 → refreshTokensFor(studentId)  ── single-flight PER ACCOUNT    │
│              → POST /api/auth/mobile/refresh → rotate → retry ONCE          │
│              → drop session only on 401/403 (never on 5xx/offline)          │
│    4. return { data? , error? , message? }   ← never throws                 │
│                                                                             │
│  src/api/auth.ts — login / refresh / logout / OTP signup / OTP reset        │
│                    (flat responses, auth:false)                             │
└──────────┬───────────────────────────────────────┬──────────────────────────┘
           │ reads/writes tokens                   │ HTTPS
┌──────────▼───────────────────────┐   ┌───────────▼─────────────────────────┐
│ SECURE STORAGE                   │   │ BACKEND  (separate repo —           │
│ src/auth/token-store.ts          │   │           `ww-student-dashboard`)   │
│   ww.accounts                    │   │                                     │
│   ww.session.<studentId>         │   │  /api/auth/mobile/*                 │
│ src/auth/secure-storage.ts       │   │  /api/auth/{signup,reset-password}/*│
│   native → expo-secure-store     │   │  /api/student/*        (enrolled)   │
│            (Keychain/Keystore)   │   │  /api/student/self/*   (independent)│
│   web    → localStorage (dev)    │   │                                     │
└──────────────────────────────────┘   │  Envelope: { data?, error?, message?}│
                                       │  Plan gating + ownership enforced   │
┌──────────────────────────────────┐   │  server-side (authoritative)        │
│ EXTERNAL                         │   │                                     │
│ Razorpay native SDK              │◄──┤  order → checkout → verify          │
│ (lazily required)                │   │  Server-side caching: UNKNOWN       │
└──────────────────────────────────┘   └─────────────────────────────────────┘
```

### Request lifecycle (concrete example — Attendance)

```
1. app/(tabs)/academics/attendance.tsx
       const { month } = useBoundedMonth({ capToday: true })
       const result = useAttendance(month)

2. useAttendance → useSourceQuery({ key: "attendance",
                                    feature: FEATURE.attendance,
                                    keyExtra: [month], build })

3. gate      isFeatureLocked(user, "student.attendance")
             → enrolled + missing claim ? locked=true, enabled=false → <LockGate/>
             → self-tracked student      ? never locked

4. resolve   source === "enrolled"
               path   /api/student/attendance
               params { month, enrollment_id? }
             source === "self"
               path   /api/student/self/attendance
               params { month }

5. key       ["attendance", 42, "enrolled", 118, "2026-07"]

6. cache     fresh (<60s) → return cached, no network
             stale        → return cached + background refetch

7. network   api.get(path)
               Bearer <token for student 42>
               401 → single-flight refresh for 42 → retry once
               transport failure → { error: "Network error. Please try again." }

8. unwrap    { data } → returned;  { error } → thrown as Error

9. render    <QueryView result={result} feature="student.attendance">
               {(data, source) => <AttendanceView … />}
             </QueryView>
             locked → LockGate | isLoading → LoadingState
             isError → ErrorState + retry | else → children(data, source)
```

---

## Summary of gaps found

| Area | Finding |
|---|---|
| Lists | Zero `FlatList` usages — every list is a `ScrollView` + `.map()`, unvirtualized |
| Validation | `zod` and `react-hook-form` installed but never imported; all validation is ad-hoc, with inconsistent password rules (≥8 vs ≥6) |
| Error boundaries | None — an uncaught render error crashes the app |
| Crash reporting | None |
| Offline | No cache persistence; app is fully online-dependent after a cold start |
| Push notifications | `expo-notifications` installed, never wired (TODO in `app/onboarding.tsx`) |
| Analytics | `track()` seam exists but `deliver()` is a no-op in production |
| Tests / CI | None |
| Config | `eas.json` staging & production still hold `.example` placeholder hosts (the `app.config.ts` guard will fail those builds) |
| Unused deps | `react-hook-form`, `zod`, `react-native-gifted-charts`, `expo-notifications`, `expo-linking`, `expo-font`, `expo-system-ui` |

## Explicitly undeterminable from this repository

- Server-side caching strategy, TTLs, CDN, or revalidation behaviour.
- Backend framework, database, and route implementations (comments imply a Next.js app at `ww-student-dashboard`, but that code is not here).
- Server-side validation rules and error taxonomy (only the `{ error: string }` shape and the `plan_required` code are observable).
- Access/refresh token TTLs and JWT signing algorithm (a 30-day refresh expiry is mentioned in a comment in `src/auth/AuthContext.tsx`, but is not enforced or verifiable client-side).
- Razorpay signature verification logic, webhook handling, and subscription state machine.
- Push notification infrastructure.
- Real production/staging API hostnames.
