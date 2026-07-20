import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import { colors } from "@/theme";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { EnrollmentProvider } from "@/features/enrollment/EnrollmentContext";
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
      <Stack.Screen name="health" options={{ title: "Health & Wellness" }} />
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
        options={{ presentation: "modal", title: "Book consultation" }}
      />
      <Stack.Screen
        name="ask-advice"
        options={{ presentation: "modal", title: "Ask a consultant" }}
      />
      <Stack.Screen
        name="invite-contributor"
        options={{ presentation: "modal", title: "Invite contributor" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <EnrollmentProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </EnrollmentProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
