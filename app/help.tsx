/** Help & Legal (Phase 4.8) — static links to policies, support, and app version. */
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { colors, spacing, typography } from "@/theme";
import { Card } from "@/components/ui";

async function openLink(url: string) {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (ok) await Linking.openURL(url);
  else Alert.alert("Can't open", "This link can't be opened on your device.");
}

type Row = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  url: string;
};

const ROWS: Row[] = [
  { label: "Privacy Policy", icon: "shield-checkmark-outline", url: "https://wiserwits.com/privacy" },
  { label: "Terms of Service", icon: "document-text-outline", url: "https://wiserwits.com/terms" },
  { label: "Contact support", icon: "mail-outline", url: "mailto:support@wiserwits.com" },
  { label: "Rate the app", icon: "star-outline", url: "https://wiserwits.com/app" },
];

export default function Help() {
  const version = Constants.expoConfig?.version ?? "0.1.0";

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <Card style={styles.card}>
        {ROWS.map((row, i) => (
          <View key={row.label}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              style={styles.row}
              onPress={() => openLink(row.url)}
              accessibilityRole="button"
              accessibilityLabel={row.label}
            >
              <Ionicons name={row.icon} size={20} color={colors.navy} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Text style={styles.version}>WiserWits v{version}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { padding: 0, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowIcon: { width: 24, textAlign: "center" },
  rowLabel: { ...typography.body, color: colors.ink, flex: 1, fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg },
  version: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
});
