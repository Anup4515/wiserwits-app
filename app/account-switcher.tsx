import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { Button, Avatar } from "@/components/ui";
import { colors, spacing, radius, typography, shadow } from "@/theme";

/**
 * Account switcher (§5a, Instagram-style). Lists the student accounts on this
 * device and switches between them locally. Signing out is a deliberate
 * two-step flow: tap "Sign out" to enter selection mode, tick the accounts to
 * remove, then confirm — no accidental one-tap removal. All accounts stay
 * logged in until they're explicitly signed out (or their refresh token
 * expires).
 */
export default function AccountSwitcher() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accounts, activeStudentId, switchAccount, removeAccount } = useAuth();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const pick = async (studentId: number) => {
    await switchAccount(studentId);
    router.back();
  };

  const enterSelect = () => {
    setSelected(new Set());
    setSelectMode(true);
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggle = (studentId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const allSelected =
    accounts.length > 0 && selected.size === accounts.length;

  const toggleAll = () => {
    setSelected(
      allSelected ? new Set() : new Set(accounts.map((a) => a.studentId))
    );
  };

  const confirmSignOut = async () => {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    try {
      // Remove each selected account (revokes its token server-side + clears it
      // locally). If the active one is included, removeSession re-picks another;
      // if every account is removed, the auth gate redirects to welcome.
      for (const id of selected) {
        await removeAccount(id);
      }
    } finally {
      setBusy(false);
      setSelectMode(false);
      setSelected(new Set());
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>
            {selectMode ? "Sign out" : "Your accounts"}
          </Text>
          <Text style={styles.subheading}>
            {selectMode
              ? "Select accounts to sign out, then confirm."
              : "Switch anytime — every account stays signed in."}
          </Text>
        </View>
        {selectMode && accounts.length > 1 ? (
          <Pressable onPress={toggleAll} hitSlop={8} disabled={busy}>
            <Text style={styles.selectAll}>
              {allSelected ? "Clear" : "Select all"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ height: spacing.md }} />

      {accounts.map((a) => {
        const active = a.studentId === activeStudentId;
        const isSelected = selected.has(a.studentId);
        return (
          <Pressable
            key={a.studentId}
            onPress={() =>
              selectMode ? toggle(a.studentId) : pick(a.studentId)
            }
            disabled={busy}
            accessibilityRole={selectMode ? "checkbox" : "button"}
            accessibilityState={
              selectMode ? { checked: isSelected } : { selected: active }
            }
            style={[
              styles.item,
              active && !selectMode && styles.itemActive,
              isSelected && styles.itemSelected,
            ]}
          >
            <Avatar name={a.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{a.name}</Text>
              <Text style={styles.sub}>
                {selectMode
                  ? active
                    ? "Active account"
                    : "Signed in"
                  : active
                    ? "Active"
                    : "Tap to switch"}
              </Text>
            </View>
            {selectMode ? (
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={isSelected ? colors.red : colors.textMuted}
              />
            ) : active ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            ) : null}
          </Pressable>
        );
      })}

      <View style={{ height: spacing.lg }} />

      {selectMode ? (
        <>
          <DestructiveButton
            label={
              selected.size > 0
                ? `Sign out ${selected.size} account${selected.size > 1 ? "s" : ""}`
                : "Sign out"
            }
            onPress={confirmSignOut}
            disabled={selected.size === 0 || busy}
          />
          <View style={{ height: spacing.sm }} />
          <Button label="Cancel" variant="ghost" onPress={cancelSelect} />
        </>
      ) : (
        <>
          <Button
            label="Add account"
            variant="secondary"
            onPress={() => router.push("/add-account")}
          />
          <View style={{ height: spacing.sm }} />
          <Button label="Sign out" variant="ghost" onPress={enterSelect} />
        </>
      )}
    </ScrollView>
  );
}

/** Red confirm CTA for the destructive sign-out action. */
function DestructiveButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.danger,
        disabled && styles.dangerDim,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.dangerLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  heading: { ...typography.h1, color: colors.ink },
  subheading: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  selectAll: { ...typography.body, color: colors.red, fontWeight: "700", marginTop: spacing.xs },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  itemActive: { borderColor: colors.gold, borderWidth: 1.5 },
  itemSelected: { borderColor: colors.red, borderWidth: 1.5, backgroundColor: colors.redBg },
  name: { ...typography.h2, fontSize: 15, color: colors.ink },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  danger: {
    backgroundColor: colors.red,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerDim: { opacity: 0.5 },
  dangerLabel: { ...typography.h2, fontSize: 15, color: colors.textInverse ?? "#ffffff" },
  pressed: { opacity: 0.85 },
});
