# WiserWits — Student Mobile App

React Native / Expo companion app for the existing `ww-student-dashboard` backend.
See [`plan.md`](./plan.md) for architecture and [`execution.md`](./execution.md)
for the phased build.

## Status
**Phase 0 (Foundations) — complete.** Scaffold, theme tokens, dual-audience copy
module, API client (Bearer + 401 refresh + offline), multi-session token store,
TanStack Query provider, env wiring, EAS profiles.

## Stack
Expo SDK 55 · expo-router · React 19.2 / RN 0.83 · TanStack Query · TypeScript.
Styling: StyleSheet + brand tokens (`src/theme`).
(Pinned to SDK 55 for Expo Go compatibility; 56 is too new for the store Expo Go.)

## Getting started
```bash
npm install
cp .env.example .env.local   # set EXPO_PUBLIC_API_BASE_URL
npm run start                # then press i / a / w
npm run typecheck            # tsc --noEmit
```

## Layout (plan §10)
```
app/                 expo-router routes (Phase 1+ adds (auth)/(tabs))
src/
  api/               client.ts (Bearer + refresh), types.ts
  auth/              token-store.ts (multi-session, §5a)
  components/        shared UI (Phase 2+)
  features/          screen composition (Phase 2+)
  theme/             brand tokens (navy/gold/Inter)
  lib/               env, query-client, copy (dual-audience §9a)
app.config.ts        Expo config + API_BASE_URL via extra
eas.json             build profiles (development/staging/production)
```

## Environments
`EXPO_PUBLIC_API_BASE_URL` flows: EAS profile / `.env.local` → `app.config.ts`
(`extra.apiBaseUrl`) → `src/lib/env.ts`.

Profiles (`eas.json`):

| Profile | API base | Android output | Update channel |
|---|---|---|---|
| `development` | `http://localhost:3000` | APK (dev client) | `development` |
| `staging` | `https://dev.app.wiserwits.com` | APK | `staging` |
| `production` | *not set yet* | AAB (Play Store) | `production` |

`production` still points at a placeholder domain; `app.config.ts` throws on a
release build until it is replaced with the real HTTPS host.

## Releasing (APK + OTA)

Build the installable APK once per **native** change. The `staging` profile
points the app at `https://dev.app.wiserwits.com` and emits an `.apk`:

```bash
npm run build:staging        # eas build -p android --profile staging
```

Ship JS/UI changes to already-installed APKs without a reinstall:

```bash
npm run update:staging -- -m "what changed"
```

> **Do not run bare `eas update`.** Unlike `eas build` (which runs on EAS and
> gets its env from the eas.json profile), `eas update` bundles **locally**, so
> Expo loads `.env.local` — and this repo's `.env.local` holds a personal
> **ngrok** URL. That URL would be baked into the bundle and pushed to every
> installed staging APK, pointing it at a dead tunnel. The `update:staging`
> script sets `EXPO_PUBLIC_API_BASE_URL` inline, which `@expo/env` will not
> overwrite, so the dev host always wins.

Installed apps fetch the new bundle on launch and apply it on the **next**
launch (expo-updates default), so a tester sees the change on their second
open.

A **new APK is required** (an update cannot carry these) whenever:
- a package with native code is added or removed,
- the Expo SDK is upgraded,
- native fields in `app.config.ts` change — permissions, plugins, icon, splash,
  `package`/`bundleIdentifier`,
- the app `version` is bumped,
- the `scripts` block in `package.json` changes (`packageJson:scripts` is a
  fingerprint source — leave it alone once an APK is out).

`runtimeVersion` uses the `fingerprint` policy, so any of the above shifts the
fingerprint automatically and an incompatible update simply will not be served
to an older binary — silently. Before pushing an update, confirm the runtime
version still matches the APK you shipped:

```bash
npm run fingerprint:staging  # hash must equal the build's Runtime Version
```

### Troubleshooting: "Runtime version mismatch" build failure

If a build dies in the **Configure expo-updates** phase with a local-vs-EAS
runtime version mismatch, check what `.gitignore` excludes. EAS CLI uses
`.gitignore` (or `.easignore`, if present) to decide which files to upload, and
`eas.json` is a fingerprint input — so listing `eas.json` in `.gitignore` keeps
it off the builder, EAS fingerprints a project without it, and the hash diverges
from the one the CLI computed locally. Keep `eas.json` committed and un-ignored.

A `bareNativeDir` entry for `android/` in the fingerprint diff is a red herring:
EAS generates that directory during prebuild, it hashes to `null`, and it does
not affect the resulting runtime version.
