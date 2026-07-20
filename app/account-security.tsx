import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useChangePassword } from "@/api/hooks";
import { Card, Button, Field, FormError } from "@/components/ui";
import { SectionHeader } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";

/**
 * Account & Security (Phase 4.8): change password.
 *
 * NOTE (Phase 4.11 / Q9): in-app account DELETION is intentionally not built —
 * the product decision (Q9) is to omit it. This is a known iOS App Review risk
 * (Guideline 5.1.1(v) requires in-app deletion for apps with account creation)
 * and must be revisited before store submission.
 */
export default function AccountSecurityScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <SectionHeader title="Change password" />
      <ChangePasswordCard />

      <SectionHeader title="Delete account" />
      <Card style={styles.deleteCard}>
        <View style={styles.deleteHead}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={styles.deleteTitle}>Need to delete your account?</Text>
        </View>
        <Text style={styles.deleteBody}>
          To request account deletion, contact support at support@wiserwits.com. We&apos;ll
          remove your account and associated data.
        </Text>
      </Card>
    </ScrollView>
  );
}

// ── Change password ──────────────────────────────────────────────────────────
function ChangePasswordCard() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!current) return setError("Enter your current password.");
    if (next.length < 6) return setError("New password must be at least 6 characters.");
    if (next !== confirm) return setError("New passwords don't match.");
    if (next === current) return setError("New password must be different from the current one.");

    change.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          setCurrent("");
          setNext("");
          setConfirm("");
          Alert.alert("Password updated", "Your password has been changed.");
        },
        onError: (err) => setError(err.message),
      },
    );
  }

  return (
    <Card style={styles.formCard}>
      <Field
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
        icon="lock-closed-outline"
        placeholder="••••••••"
      />
      <Field
        label="New password"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoCapitalize="none"
        icon="key-outline"
        placeholder="At least 6 characters"
      />
      <Field
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        icon="key-outline"
        placeholder="Re-enter new password"
      />
      <FormError message={error} />
      <Button
        label={change.isPending ? "Saving…" : "Update password"}
        onPress={submit}
        loading={change.isPending}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  formCard: { gap: spacing.md },

  deleteCard: { gap: spacing.sm, backgroundColor: colors.card },
  deleteHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  deleteTitle: { ...typography.label, color: colors.ink, fontWeight: "700" },
  deleteBody: { ...typography.caption, color: colors.textMuted },
});
