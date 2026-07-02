import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { LoginForm } from "@/features/auth/LoginForm";
import { colors, spacing, typography } from "@/theme";

/**
 * Add another student account to this device (§5a). Same sign-in form; on
 * success the new account is added AND made active, then we return to the
 * switcher. Top-level (not in (auth)) so authenticated users can reach it.
 */
export default function AddAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.h1}>Add an account</Text>
      <Text style={styles.sub}>
        Sign in to another student account (e.g. a sibling). You can switch between
        them anytime.
      </Text>
      <View style={{ height: spacing.lg }} />
      <LoginForm submitLabel="Add account" onSuccess={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.card },
  container: { padding: spacing.xl },
  h1: { ...typography.h1, color: colors.ink },
  sub: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
