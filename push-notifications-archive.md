# Push Notifications — ARCHIVE & Re-Implementation Guide

**Status:** Push notifications were BUILT and WORKING, then **removed from the live
plan** (only in-app notifications — the mobile feed + the web dashboard panel —
are kept). This file is the complete record so push can be brought back later by
copy-pasting from here.

**What was removed:** the Expo/FCM push delivery — the `student_push_tokens` table,
the `pushed_at` column usage, the fan-out worker, the register/unregister
endpoints, and the app-side registration/listeners.

**What stays (normal notifications):** the `student_events` outbox, the **mobile
feed** (`/api/student/feed` → `buildFeed`), and the **web dashboard panel + dots**
(`/api/student/notifications/list`, `NotificationsProvider`). Those read the same
events with `channels` including `feed` / `web`; they never needed push.

> Supersedes the earlier `push-notifications-setup.md` (that was the live runbook).

---

## 1. Phases (where push sat in the overall plan)

Full plan is in `notifications-push-design.md`. Push was **Phase 3**:

| Phase | What | Push involved? |
|---|---|---|
| 0 | Event outbox `student_events` + emission from all writer dashboards | writes `channels` incl. `push` |
| 1 | Web dashboard panel + per-page dots | no |
| 2 | Mobile feed backed by events + shared read-state | no |
| **3** | **Mobile push (Expo → FCM/APNs)** | **YES — this file** |
| 4 | Real-time web (SSE) — optional | no |

Push is a **consumer** of the outbox: an event with `push` in its `channels` gets
delivered to the device; the same event also feeds the in-app feed + web panel.

---

## 2. End-to-end flow

```
 WRITE (admin/partner dashboards)          BACKEND (ww-student-dashboard)
 consultant shares diet / school posts marks
   emitStudentEvent() → student_events      push-worker (every 10s, gated by
     (channels incl 'push', pushed_at NULL)   PUSH_WORKER_ENABLED):
                                              1. atomic claim of unsent push events
 APP (ww-student-app)                            (pushed_at NULL AND 'push'=ANY(channels),
   login → registerForPush()                     FOR UPDATE SKIP LOCKED → set pushed_at)
     → permission + Expo push token          2. look up student_push_tokens
     → POST /api/student/push/register        3. POST exp.host/--/api/v2/push/send
       (stored in student_push_tokens)                 │
   received → refresh feed                            ▼
   tapped   → deep-link (category)             Expo Push → FCM (Android) / APNs (iOS)
                                                        │
                                                        ▼   📱 lock-screen notification
```

**Steps 3–4 and 10–12 of the classic Expo+FCM diagram are done BY EXPO**, not our
code: getting the FCM token and mapping Expo-token↔FCM-token, and the actual
FCM/APNs delivery. Our code does: register token, store it, claim events, send to Expo.

**Which categories pushed** (via `channels`): diet, lab, advice, consultation,
certificate, reminder, assignment, feedback, live_class, workshop (consultant side)
+ marks, report (partner side) = **12 push**. `attendance`, `holistic` were
`{feed,web}` (no push, anti-spam). `timetable`, `calendar` weren't emitting.

---

## 3. Setup — commands we ran (Android; iOS notes inline)

> App commands run in `ww-student-app/`.

```bash
# EAS project
npm i -g eas-cli
eas login
eas init          # prints a project id → add to app.config.ts (dynamic config can't auto-write)

# Dev client (required for a developmentClient build)
npx expo install expo-dev-client

# Build (Android) — real device only; push doesn't work in Expo Go / simulators
eas build --profile development --platform android
#   "Generate a new Android Keystore?" → Y

# iOS (when needed)
#   eas credentials  → iOS → set up an APNs key
#   eas build --profile development --platform ios
```

### Firebase / FCM (Android delivery) — one-time
1. Firebase console → project **`wiser-wits-app`** → Add app → **Android**, package **`com.wiserwits.studentapp`**.
2. Download **`google-services.json`** → place in `ww-student-app/` root, link via `app.config.ts` (`android.googleServicesFile`). *(Skip the console's "add Gradle plugin" step — managed Expo does it.)*
3. Firebase → ⚙️ Project settings → **Service accounts** → **Generate new private key** → download `…firebase-adminsdk-….json` (the **FCM V1 key**, a SECRET, ≠ google-services.json).
4. Upload it to EAS:
   ```bash
   eas credentials
   #  → Android → development → Google Service Account
   #  → "Set up a Google Service Account Key for Push Notifications (FCM V1)"
   #  → path to the …firebase-adminsdk-….json
   ```

### Config values used
| Thing | Value |
|---|---|
| EAS project id | `efa95fb0-3825-4931-90cc-2d5f4331286b` |
| Android package | `com.wiserwits.studentapp` |
| Firebase project | `wiser-wits-app` |
| FCM sender id | `692784509069` |
| Worker flag (backend) | `PUSH_WORKER_ENABLED=true` |
| API URL (device) | `EXPO_PUBLIC_API_BASE_URL` in `.env.local` (ngrok https in dev) |

---

## 4. Run + test (dev)

```bash
# ww-student-dashboard — backend + worker
PUSH_WORKER_ENABLED=true npm run dev        # log: [push-worker] started (scan every 10s)

# tunnel so the phone reaches the backend (localhost won't work on a device)
ngrok http 3000                             # put the https URL in ww-student-app/.env.local:
                                            #   EXPO_PUBLIC_API_BASE_URL=https://<sub>.ngrok-free.dev

# ww-student-app — Metro (dev client reads .env.local at runtime; no rebuild on URL change)
npx expo start --dev-client
```
Phone: open the dev-build app → connect to Metro → **log in** → **Allow** notifications
→ token registers. Test via [expo.dev/notifications](https://expo.dev/notifications)
(paste the `ExponentPushToken[…]`), or trigger a real push category (e.g. share a diet plan).

**The dev-build APK stays installed** — only re-`eas build` when NATIVE config
changes (plugins/permissions/package/google-services/native deps). JS/TS changes
hot-reload via Metro.

---

## 5. Source code (backend — `ww-student-dashboard`)

### `migrations/006_student_push_tokens.sql`
```sql
CREATE TABLE IF NOT EXISTS student_push_tokens (
  id              BIGSERIAL   PRIMARY KEY,
  student_id      BIGINT      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  expo_push_token TEXT        NOT NULL UNIQUE,   -- "ExponentPushToken[xxxx]"
  platform        TEXT,                          -- ios | android
  device_label    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled_at     TIMESTAMPTZ                     -- set when Expo reports the token dead / on logout
);
ALTER TABLE student_push_tokens ADD COLUMN IF NOT EXISTS platform     TEXT;
ALTER TABLE student_push_tokens ADD COLUMN IF NOT EXISTS device_label TEXT;
ALTER TABLE student_push_tokens ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE student_push_tokens ADD COLUMN IF NOT EXISTS disabled_at  TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS student_push_tokens_expo_push_token_key
  ON student_push_tokens (expo_push_token);
CREATE INDEX IF NOT EXISTS idx_student_push_tokens_student
  ON student_push_tokens (student_id) WHERE disabled_at IS NULL;
```
> The `pushed_at TIMESTAMPTZ` column + the `idx_student_events_unpushed` partial
> index live in `003_student_events.sql`. Keep the column when re-adding (or add
> it back with `ALTER TABLE student_events ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;`).

### `app/api/student/push/register/route.ts`
```ts
import { NextResponse } from "next/server"
import { getStudentIdentity, isIdentityError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

// POST /api/student/push/register { token, platform?, deviceName? }
export async function POST(request: Request) {
  const id = await getStudentIdentity(request)
  if (isIdentityError(id)) return id

  let body: { token?: string; platform?: string; deviceName?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const token = (body.token ?? "").trim()
  if (!/^Expo(nent)?PushToken\[/.test(token)) {
    return NextResponse.json({ error: "Invalid Expo push token" }, { status: 400 })
  }
  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : null
  const deviceLabel = (body.deviceName ?? "").trim().slice(0, 120) || null

  await executeQuery(
    `INSERT INTO student_push_tokens (student_id, expo_push_token, platform, device_label)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (expo_push_token) DO UPDATE
       SET student_id   = EXCLUDED.student_id,
           platform     = COALESCE(EXCLUDED.platform, student_push_tokens.platform),
           device_label = COALESCE(EXCLUDED.device_label, student_push_tokens.device_label),
           last_seen_at = now(),
           disabled_at  = NULL`,
    [id.studentId, token, platform, deviceLabel]
  )
  return NextResponse.json({ ok: true })
}
```

### `app/api/student/push/unregister/route.ts`
```ts
import { NextResponse } from "next/server"
import { getStudentIdentity, isIdentityError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

// POST /api/student/push/unregister { token } — disable this device's token on logout.
export async function POST(request: Request) {
  const id = await getStudentIdentity(request)
  if (isIdentityError(id)) return id
  let body: { token?: string }
  try { body = await request.json() } catch { return NextResponse.json({ ok: true }) }
  const token = (body.token ?? "").trim()
  if (token) {
    await executeQuery(
      `UPDATE student_push_tokens SET disabled_at = now()
        WHERE expo_push_token = ? AND student_id = ? AND disabled_at IS NULL`,
      [token, id.studentId]
    )
  }
  return NextResponse.json({ ok: true })
}
```

### `app/lib/push.ts`
```ts
import { executeQuery } from "@/app/lib/db"

const EXPO_SEND = "https://exp.host/--/api/v2/push/send"
const CHUNK = 100

export interface ExpoMessage {
  to: string; title: string; body?: string
  data?: Record<string, unknown>; sound?: "default"; channelId?: string
}
interface ExpoTicket { status?: "ok" | "error"; message?: string; details?: { error?: string } }

export async function sendExpoPush(messages: ExpoMessage[]): Promise<void> {
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK)
    let tickets: ExpoTicket[] = []
    try {
      const res = await fetch(EXPO_SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
        body: JSON.stringify(chunk),
      })
      const json = (await res.json()) as { data?: ExpoTicket[] }
      tickets = Array.isArray(json?.data) ? json.data : []
    } catch (err) {
      console.error("[push] Expo send failed:", err instanceof Error ? err.message : err); continue
    }
    const dead: string[] = []
    tickets.forEach((t, idx) => {
      if (t?.status === "error" && t?.details?.error === "DeviceNotRegistered") dead.push(chunk[idx].to)
    })
    if (dead.length > 0) {
      const ph = dead.map(() => "?").join(",")
      await executeQuery(`UPDATE student_push_tokens SET disabled_at = now() WHERE expo_push_token IN (${ph})`, dead)
        .catch((err) => console.error("[push] token prune failed:", err))
    }
  }
}
```

### `app/lib/push-worker.ts`
```ts
import { executeQuery } from "@/app/lib/db"
import { sendExpoPush, type ExpoMessage } from "@/app/lib/push"

interface ClaimedEvent { id: number; student_id: number; category: string; ref_id: number | null; title: string; body: string | null }
const SCAN_INTERVAL_MS = 10_000
const BATCH = 200

async function tick(): Promise<void> {
  const claimed = await executeQuery<ClaimedEvent[]>(
    `UPDATE student_events SET pushed_at = now()
      WHERE id IN (
        SELECT id FROM student_events
         WHERE pushed_at IS NULL AND 'push' = ANY (channels)
         ORDER BY created_at LIMIT ${BATCH} FOR UPDATE SKIP LOCKED)
     RETURNING id, student_id, category, ref_id, title, body`
  )
  if (claimed.length === 0) return
  const studentIds = [...new Set(claimed.map((e) => e.student_id))]
  const ph = studentIds.map(() => "?").join(",")
  const tokens = await executeQuery<{ student_id: number; expo_push_token: string }[]>(
    `SELECT student_id, expo_push_token FROM student_push_tokens WHERE student_id IN (${ph}) AND disabled_at IS NULL`,
    studentIds
  )
  const byStudent = new Map<number, string[]>()
  for (const t of tokens) { const a = byStudent.get(t.student_id) ?? []; a.push(t.expo_push_token); byStudent.set(t.student_id, a) }
  const messages: ExpoMessage[] = []
  for (const e of claimed) for (const token of byStudent.get(e.student_id) ?? []) {
    messages.push({ to: token, title: e.title, body: e.body ?? undefined, sound: "default", channelId: "default",
      data: { category: e.category, ref_id: e.ref_id, event_id: e.id } })
  }
  if (messages.length > 0) await sendExpoPush(messages)
}

let started = false
export function startPushWorker(): void {
  if (started) return
  started = true
  setInterval(() => { tick().catch((err) => console.error("[push-worker] tick failed:", err instanceof Error ? err.message : err)) }, SCAN_INTERVAL_MS)
  console.log(`[push-worker] started (scan every ${SCAN_INTERVAL_MS / 1000}s)`)
}
```

### `instrumentation.ts` — worker start block (inside `register()`, after migrations)
```ts
  if (process.env.PUSH_WORKER_ENABLED === "true") {
    try {
      const { startPushWorker } = await import("./app/lib/push-worker")
      startPushWorker()
    } catch (err) {
      console.error("[instrumentation] push worker failed to start:", err instanceof Error ? err.message : err)
    }
  }
```

---

## 6. Source code (app — `ww-student-app`)

### `src/features/push/registration.ts`
```ts
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "@/api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default", importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const granted = existing.granted ? true : (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;
  const projectId = resolveProjectId();
  if (!projectId) { console.warn("[push] no EAS projectId — skipping token registration (needs an EAS build)"); return; }
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = token;
    await api.post("/api/student/push/register", { token, platform: Platform.OS, deviceName: Device.deviceName });
  } catch (err) {
    console.warn("[push] registration failed:", err instanceof Error ? err.message : err);
  }
}

export async function unregisterCurrentPushToken(): Promise<void> {
  if (!currentToken) return;
  try { await api.post("/api/student/push/unregister", { token: currentToken }); } catch {}
  currentToken = null;
}
```

### `src/features/push/usePushNotifications.ts`
```ts
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { hrefForCategory } from "@/lib/notification-routes";
import { registerForPush } from "./registration";

export function usePushNotifications(): void {
  const { status } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (status !== "authenticated") return;
    void registerForPush();
    const received = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    });
    const responded = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as { category?: string } | undefined;
      router.push(hrefForCategory(data?.category));
    });
    return () => { received.remove(); responded.remove(); };
  }, [status, router, queryClient]);
}
```

### `src/lib/notification-routes.ts`  — **KEEP THIS** (the feed screen uses it too)
```ts
import type { Href } from "expo-router";
import type { FeedCategory } from "@/api/student-types";

export const CATEGORY_HREF: Record<FeedCategory, Href> = {
  assignment: "/assignments", advice: "/advice", feedback: "/advice",
  consultation: "/(tabs)/health/consultations", diet: "/(tabs)/health/diet", lab: "/(tabs)/health/labs",
  report: "/(tabs)/academics/report", marks: "/(tabs)/academics/exams", attendance: "/(tabs)/academics/attendance",
  reminder: "/reminders", holistic: "/(tabs)/academics/holistic", timetable: "/(tabs)/academics/timetable",
  calendar: "/(tabs)/academics/calendar", live_class: "/live-classes", workshop: "/workshops", certificate: "/certificates",
};
export function hrefForCategory(category: string | undefined | null): Href {
  if (category && category in CATEGORY_HREF) return CATEGORY_HREF[category as FeedCategory];
  return "/feed";
}
```

### Config edits (app)
`app.config.ts`:
```ts
android: {
  package: "com.wiserwits.studentapp",
  googleServicesFile: "./google-services.json",   // ← push (Android FCM)
  adaptiveIcon: { /* … */ },
  predictiveBackGestureEnabled: false,
},
plugins: [
  // …existing…
  ["expo-notifications", { color: "#1A2658" }],    // ← push
],
extra: {
  apiBaseUrl: API_BASE_URL,
  eas: { projectId: "efa95fb0-3825-4931-90cc-2d5f4331286b" },  // ← push (EAS)
},
```
`app/_layout.tsx` (in `RootNavigator`):
```ts
import { usePushNotifications } from "@/features/push/usePushNotifications";
// …
function RootNavigator() {
  // …
  usePushNotifications();   // ← push (mounted once at root)
  // …
}
```
`src/auth/AuthContext.tsx` (in `signOut` and `signOutAll`, before clearing the session):
```ts
import { unregisterCurrentPushToken } from "@/features/push/registration";
// …
await unregisterCurrentPushToken().catch(() => {});
```
Dependency: `expo-dev-client` (`npx expo install expo-dev-client`).
Also present: `expo-notifications`, `expo-device`, `expo-constants` (already deps).

---

## 7. To RE-ADD push later — checklist
1. Recreate the 5 backend files (§5) + the `instrumentation.ts` block. Ensure `student_events.pushed_at` exists (in migration 003; re-add via `ALTER TABLE … ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ` if it was dropped) and re-add `migrations/006_student_push_tokens.sql`.
2. Recreate the 2 app files (§6): `registration.ts`, `usePushNotifications.ts`. (`notification-routes.ts` should still exist — it's shared with the feed.)
3. Re-apply the config edits (§6): app.config plugin + `googleServicesFile` + `extra.eas.projectId`; `_layout.tsx` mount; AuthContext unregister; `npx expo install expo-dev-client`.
4. Ensure emitted events include `push` in `channels` for the categories you want pushed (default `{push,feed,web}`; `attendance`/`holistic` were `{feed,web}`).
5. Firebase + EAS credentials (§3) — google-services.json + FCM V1 key (still uploaded on the EAS project unless you removed it).
6. `eas build --profile development --platform android` → install → run with `PUSH_WORKER_ENABLED=true`.

## 8. What the REMOVAL takes out (the delta)
**Backend:** delete `app/api/student/push/`, `app/lib/push.ts`, `app/lib/push-worker.ts`, the instrumentation block; drop table `student_push_tokens`; drop column `student_events.pushed_at` (+ its `idx_student_events_unpushed` index); stop putting `push` in `channels` (default → `{feed,web}`).
**App:** delete `src/features/push/`; remove `usePushNotifications()` from `_layout.tsx`; remove the unregister calls from AuthContext; remove the `expo-notifications` plugin + `googleServicesFile` + `extra.eas.projectId` from app.config; optionally `expo-dev-client` / `expo-notifications` deps. **Keep** `src/lib/notification-routes.ts` (feed uses it).
**Unchanged (normal notifications):** `student_events` (minus pushed_at), the feed (`feed.ts`, `/api/student/feed`), the web panel (`/api/student/notifications/list`, `NotificationsProvider`, `DashboardLayout` bell), and `channels` `feed`/`web`.
