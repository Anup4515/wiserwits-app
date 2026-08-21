import { useEffect } from "react";
import { AppState, Platform, View, type AppStateStatus } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import { colors } from "@/theme";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { EnrollmentProvider } from "@/features/enrollment/EnrollmentContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { track } from "@/lib/analytics";

/**
 * Root layout (plan §7). Wires global providers and the AUTH GATE:
 * unauthenticated -> (auth), authenticated -> (tabs).
 */
function RootNavigator() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // One-shot app-open event (Phase 4.10 analytics).
  useEffect(() => {
    track("app_open");
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    const inAuth = segments[0] === "(auth)";
    if (status === "unauthenticated" && !inAuth) {
      router.replace("/(auth)/welcome");
    } else if (status === "authenticated" && inAuth) {
      router.replace("/(tabs)");
    }
  }, [status, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen
        name="account-switcher"
        options={{ presentation: "modal", title: "Accounts" }}
      />
      <Stack.Screen
        name="add-account"
        options={{ presentation: "modal", title: "Add account" }}
      />

      {/* Phase 3 — retention + write surfaces */}
      <Stack.Screen name="feed" options={{ title: "Activity" }} />
      <Stack.Screen name="advice" options={{ title: "Advice & Feedback" }} />
      <Stack.Screen name="assignments" options={{ title: "Assignments" }} />
      <Stack.Screen name="contributors" options={{ title: "Contributors" }} />
      <Stack.Screen name="subscription" options={{ title: "Plans & Subscription" }} />

      {/* Phase 4 — learning, content, settings */}
      <Stack.Screen name="courses" options={{ title: "Courses" }} />
      <Stack.Screen name="course/[slug]" options={{ title: "Course" }} />
      <Stack.Screen name="certificates" options={{ title: "Certificates" }} />
      <Stack.Screen name="live-classes" options={{ title: "Live classes" }} />
      <Stack.Screen name="workshops" options={{ title: "Workshops" }} />
      <Stack.Screen name="articles" options={{ title: "Learn" }} />
      <Stack.Screen name="article/[slug]" options={{ title: "Article" }} />
      <Stack.Screen name="reminders" options={{ title: "Reminders" }} />
      <Stack.Screen name="feedback" options={{ title: "Consultant feedback" }} />
      <Stack.Screen name="search" options={{ title: "Search" }} />
      <Stack.Screen name="account-security" options={{ title: "Account & Security" }} />
      <Stack.Screen name="profile-details" options={{ title: "Profile" }} />
      <Stack.Screen name="profile-edit" options={{ title: "Edit profile" }} />
      <Stack.Screen name="explore-all" options={{ title: "Explore" }} />
      <Stack.Screen name="help" options={{ title: "Help & Legal" }} />

      <Stack.Screen
        name="quick-actions"
        options={{ presentation: "modal", title: "Quick actions" }}
      />
      <Stack.Screen
        name="log-bmi"
        options={{ presentation: "modal", title: "Log BMI" }}
      />
      <Stack.Screen
        name="book-consultation"
        options={{ presentation: "modal", title: "Schedule Consultation" }}
      />
      <Stack.Screen
        name="ask-advice"
        options={{ presentation: "modal", title: "Ask Consultant" }}
      />
      <Stack.Screen
        name="invite-contributor"
        options={{ presentation: "modal", title: "Invite contributor" }}
      />
    </Stack>
  );
}

/**
 * Bridge React Native's AppState into TanStack Query's focusManager. Without
 * this, `refetchOnWindowFocus` is a no-op on native (there's no browser window),
 * so the feed/badge never refresh when the app returns to the foreground. With
 * it, coming back to a foregrounded app refetches any stale query (staleTime
 * 60s) — including the notification feed — so a teacher/consultant's new
 * activity surfaces on re-open instead of only on manual navigation.
 */
function useAppStateFocus() {
  useEffect(() => {
    function onChange(status: AppStateStatus) {
      // No-op on web (real window focus already works there).
      if (Platform.OS !== "web") focusManager.setFocused(status === "active");
    }
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useAppStateFocus();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* ErrorBoundary sits above the providers + navigator so it also
            survives a throw from a context provider, not just a screen. */}
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <EnrollmentProvider>
                <StatusBar style="light" />
                <View style={{ flex: 1 }}>
                  <RootNavigator />
                  <OfflineBanner />
                </View>
              </EnrollmentProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
