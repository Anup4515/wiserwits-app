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
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.wiserwits.studentapp",
  },
  android: {
    package: "com.wiserwits.studentapp",
    adaptiveIcon: {
      backgroundColor: "#1A2658",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
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
        backgroundColor: "#1A2658",
        image: "./assets/images/splash-icon.png",
        imageWidth: 96,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiBaseUrl: API_BASE_URL,
  },
});
