import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Dynamic Expo config (plan §4, §10).
 *
 * API_BASE_URL is supplied per-environment via `EXPO_PUBLIC_API_BASE_URL`
 * (staging vs prod) and surfaced to the app through `extra.apiBaseUrl`, read in
 * `src/lib/env.ts`. EAS build profiles (eas.json) set the value per profile.
 */
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

// Fail the build early if a release profile still has a missing/placeholder or
// non-HTTPS backend URL — a broken API base must never ship silently. EAS sets
// EAS_BUILD_PROFILE during `eas build`.
const profile = process.env.EAS_BUILD_PROFILE;
if (profile === "production" || profile === "staging") {
  const bad =
    !/^https:\/\//.test(API_BASE_URL) || /\.example(?:[:/]|$)/.test(API_BASE_URL);
  if (bad) {
    throw new Error(
      `[app.config] "${profile}" build needs a real HTTPS EXPO_PUBLIC_API_BASE_URL ` +
        `(got "${API_BASE_URL}"). Set it in eas.json → build.${profile}.env.`
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "WiserWits",
  slug: "ww-student-app",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "wiserwits",
  userInterfaceStyle: "automatic",

  // OTA updates (EAS Update). The "fingerprint" policy hashes the native side
  // of the app, so a JS-only update can never land on a binary it is
  // incompatible with: any native change (new native module, Expo SDK bump, or
  // an edit to the native fields below — permissions, icon, splash, plugins)
  // shifts the fingerprint and needs a fresh build instead of an update.
  runtimeVersion: { policy: "fingerprint" },
  updates: {
    url: "https://u.expo.dev/efa95fb0-3825-4931-90cc-2d5f4331286b",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.wiserwits.studentapp",
  },
  android: {
    package: "com.wiserwits.studentapp",
    adaptiveIcon: {
      // White background so the navy "W" reads clearly; the foreground logo is
      // padded on white too, so background + foreground blend seamlessly.
      backgroundColor: "#ffffff",
      foregroundImage: "./assets/images/android-icon-foreground.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sharing",
    "@react-native-community/datetimepicker",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow WiserWits to access your photos to set a profile picture.",
      },
    ],
    [
      "expo-splash-screen",
      {
        // White splash so the WiserWits logo (navy W) is visible, matching the
        // app icon.
        backgroundColor: "#ffffff",
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiBaseUrl: API_BASE_URL,
    // EAS project id (from `eas init`). Read by push registration via
    // Constants.expoConfig.extra.eas.projectId (getExpoPushTokenAsync).
    eas: {
      projectId: "efa95fb0-3825-4931-90cc-2d5f4331286b",
    },
  },
});
