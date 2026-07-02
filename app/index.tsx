import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";

import { colors, spacing, typography } from "@/theme";
import { useAuth } from "@/auth/AuthContext";

/**
 * Entry splash. The root auth gate redirects once status is known; this also
 * resolves the initial route directly to avoid a flash.
 */
export default function Index() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>W</Text>
        </View>
        <Text style={styles.brand}>WiserWits</Text>
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <Redirect href={status === "authenticated" ? "/(tabs)" : "/(auth)/welcome"} />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
    gap: spacing.md,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.navy, fontSize: 32, fontWeight: "800" },
  brand: { color: colors.textInverse, ...typography.display },
});
