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
