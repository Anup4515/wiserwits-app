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

/**
 * Root layout (plan §7). Wires global providers and the AUTH GATE:
 * unauthenticated -> (auth), authenticated -> (tabs).
 */
function RootNavigator() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
