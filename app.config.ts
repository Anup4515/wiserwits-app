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
