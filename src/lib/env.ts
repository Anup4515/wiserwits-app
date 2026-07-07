import Constants from "expo-constants";

/**
 * Runtime environment (plan §4, §10). `apiBaseUrl` comes from app.config.ts
 * `extra.apiBaseUrl`, which is populated from `EXPO_PUBLIC_API_BASE_URL` per EAS
 * build profile (staging vs prod). Falls back to the public env var, then local.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };

const rawBaseUrl =
  extra.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

export const env = {
  // Strip any trailing slash so `${apiBaseUrl}${path}` (path starts with "/")
  // never produces a double slash — several profile URLs are written with a
  // trailing "/" and Next would 404 on `//api/...`.
  apiBaseUrl: rawBaseUrl.replace(/\/+$/, ""),
} as const;
