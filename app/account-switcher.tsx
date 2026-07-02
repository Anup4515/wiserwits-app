import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { Button, Avatar } from "@/components/ui";
import { colors, spacing, radius, typography, shadow } from "@/theme";

/**
 * Account switcher (§5a, Instagram-style). Lists the student accounts on this
 * device, switches between them locally, and adds/removes accounts. All stay
 * logged in until their refresh token expires.
 */
export default function AccountSwitcher() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accounts, activeStudentId, switchAccount, removeAccount, signOutAll } =
    useAuth();

  const pick = async (studentId: number) => {
    await switchAccount(studentId);
    router.back();
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.heading}>Your accounts</Text>
      <Text style={styles.subheading}>
        Switch anytime — every account stays signed in.
      </Text>

      <View style={{ height: spacing.md }} />

      {accounts.map((a) => {
        const active = a.studentId === activeStudentId;
        return (
          <View key={a.studentId} style={[styles.item, active && styles.itemActive]}>
            <Pressable style={styles.itemMain} onPress={() => pick(a.studentId)}>
              <Avatar name={a.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.sub}>{active ? "Active" : "Tap to switch"}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => void removeAccount(a.studentId)}
              hitSlop={8}
              style={styles.remove}
            >
              <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        );
      })}

      <View style={{ height: spacing.lg }} />
      <Button
        label="Add account"
        variant="secondary"
        onPress={() => router.push("/add-account")}
      />
      <View style={{ height: spacing.sm }} />
      <Button label="Sign out of all" variant="ghost" onPress={() => void signOutAll()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  heading: { ...typography.h1, color: colors.ink },
  subheading: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  itemActive: { borderColor: colors.gold, borderWidth: 1.5 },
  itemMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { ...typography.h2, fontSize: 15, color: colors.ink },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  remove: { paddingLeft: spacing.sm },
});
