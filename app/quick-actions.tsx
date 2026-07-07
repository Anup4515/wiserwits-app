import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, palette, spacing, radius, typography, shadow } from "@/theme";

/**
 * The "+" quick-actions sheet. A single tap from the tab bar into any of the
 * student's write flows. Because this is itself a modal, we `router.replace`
 * into the target so the action sheet is swapped out for the flow rather than
 * stacking behind it.
 */
interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  fg: string;
  label: string;
  subtitle: string;
  href: Href;
}

const ACTIONS: Action[] = [
  {
    icon: "fitness-outline",
    tint: colors.greenBg,
    fg: colors.green,
    label: "Log BMI",
    subtitle: "Record a new height & weight reading",
    href: "/log-bmi",
  },
  {
    icon: "chatbubble-ellipses-outline",
    tint: palette.accent100,
    fg: palette.accent600,
    label: "Ask a consultant",
    subtitle: "Send a question to your consultant",
    href: "/ask-advice",
  },
  {
    icon: "medkit-outline",
    tint: colors.blueBg,
    fg: colors.blue,
    label: "Book a consultation",
    subtitle: "Schedule a doctor consultation",
    href: "/book-consultation",
  },
  {
    icon: "clipboard-outline",
    tint: palette.primary50,
    fg: colors.navy,
    label: "Submit an assignment",
    subtitle: "Mark an assignment as done",
    href: "/assignments",
  },
  {
    icon: "people-outline",
    tint: colors.amberBg,
    fg: colors.amber,
    label: "Invite a contributor",
    subtitle: "Let a parent or tutor fill your data",
    href: "/invite-contributor",
  },
];

export default function QuickActionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.heading}>Quick actions</Text>
      <Text style={styles.subheading}>What would you like to do?</Text>

      <View style={{ height: spacing.md }} />

      {ACTIONS.map((a) => (
        <Pressable
          key={a.label}
          onPress={() => router.replace(a.href)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={[styles.icon, { backgroundColor: a.tint }]}>
            <Ionicons name={a.icon} size={22} color={a.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{a.label}</Text>
            <Text style={styles.rowSub}>{a.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}
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
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { ...typography.h2, fontSize: 15, color: colors.ink },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
