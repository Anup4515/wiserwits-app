import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, typography, shadow } from "@/theme";
import { TileIcon, type TileIconName } from "@/components/icons/tile-icon";
import { useAuth } from "@/auth/AuthContext";
import { FEATURE, isFeatureLocked } from "@/lib/features";

/**
 * The "+" quick-actions sheet. A single tap from the tab bar into any of the
 * student's write flows. Because this is itself a modal, we `router.replace`
 * into the target so the action sheet is swapped out for the flow rather than
 * stacking behind it.
 *
 * Plan-gated actions (advice/health/assignments) mirror the screen-level lock:
 * for an enrolled student without the feature we show a lock and route to
 * `/subscription` instead of into a flow the backend would just reject. Actions
 * with no `feature` (Log BMI — always-allowed; Invite contributor — ungated)
 * are always open.
 */
interface Action {
  icon: TileIconName;
  label: string;
  subtitle: string;
  href: Href;
  /** Plan feature this action needs; omit for always-allowed/ungated actions. */
  feature?: string;
  /** Only for independent students — hidden when the student has an active
   * enrollment (their records come from the school, not contributors). */
  selfOnly?: boolean;
}

const ACTIONS: Action[] = [
  {
    icon: "bmi",
    label: "Log BMI",
    subtitle: "Record a new height & weight reading",
    href: "/log-bmi",
  },
  {
    icon: "ask-consultant",
    label: "Ask Consultant",
    subtitle: "Send a question to the consultant",
    href: "/ask-advice",
    feature: FEATURE.advice,
  },
  {
    icon: "consultation",
    label: "Schedule Consultation",
    subtitle: "Schedule a doctor consultation",
    href: "/book-consultation",
    feature: FEATURE.health,
  },
  {
    icon: "assignments",
    label: "Submit an assignment",
    subtitle: "Mark an assignment as done",
    href: "/assignments",
    feature: FEATURE.assignments,
  },
  {
    icon: "contributors",
    label: "Invite a contributor",
    subtitle: "Let a parent or tutor help fill in data",
    href: "/invite-contributor",
    selfOnly: true,
  },
];

export default function QuickActionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.heading}>Quick actions</Text>
      <Text style={styles.subheading}>What would you like to do?</Text>

      <View style={{ height: spacing.md }} />

      {ACTIONS.filter((a) => !(a.selfOnly && user?.enrollment_id != null)).map((a) => {
        const locked = a.feature ? isFeatureLocked(user, a.feature) : false;
        return (
          <Pressable
            key={a.label}
            onPress={() => router.replace(locked ? "/subscription" : a.href)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled: false }}
            accessibilityLabel={locked ? `${a.label} — locked, view plans` : a.label}
          >
            <View style={styles.icon}>
              <TileIcon name={a.icon} size={30} muted={locked} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, locked && styles.textLocked]}>{a.label}</Text>
              <Text style={styles.rowSub}>
                {locked ? "Part of a plan — tap to upgrade" : a.subtitle}
              </Text>
            </View>
            <Ionicons
              name={locked ? "lock-closed" : "chevron-forward"}
              size={locked ? 18 : 20}
              color={locked ? colors.gold : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  heading: { ...typography.h1, color: colors.ink },
  subheading: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },

  row: {
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
  pressed: { opacity: 0.85 },
  // Neutral plate — the 3D artwork carries the colour (see tile-icon).
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { ...typography.h2, fontSize: 15, color: colors.ink },
  textLocked: { color: colors.textMuted },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
