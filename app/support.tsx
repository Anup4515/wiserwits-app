import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

import { Card } from "@/components/ui";
import { colors, spacing, typography, radius } from "@/theme";
import { FAQS } from "@/lib/support-faqs";

const SUPPORT_EMAIL = "support@wiserwits.com";

async function openLink(url: string, fallback?: string) {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (ok) {
    await Linking.openURL(url);
    return;
  }
  if (fallback) {
    await Linking.openURL(fallback).catch(() => {
      Alert.alert("Can't open", "This link can't be opened on your device.");
    });
    return;
  }
  Alert.alert("Can't open", "This link can't be opened on your device.");
}

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Reset password", icon: "key-outline", href: "/account-security" },
  { label: "Manage plan", icon: "card-outline", href: "/subscription" },
  { label: "My tickets", icon: "chatbox-ellipses-outline", href: "/support/tickets" },
];

type LegalRow = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const LEGAL_ROWS: LegalRow[] = [
  { label: "Privacy Policy", icon: "shield-checkmark-outline" },
  { label: "Terms of Service", icon: "document-text-outline" },
  { label: "Rate the app", icon: "star-outline" },
];

export default function Support() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "0.1.0";
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const suggested = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return FAQS.slice(0, 4);
    return FAQS.filter(
      (f) =>
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query) ||
        f.category.toLowerCase().includes(query),
    ).slice(0, 6);
  }, [q]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search help articles"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {q.length > 0 ? (
          <Pressable onPress={() => setQ("")} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <SectionHeader title={q ? "Matching articles" : "Popular questions"} />
      <Card style={styles.listCard}>
        {suggested.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No matches. Try different keywords or contact us below.</Text>
          </View>
        ) : (
          suggested.map((f, i) => {
            const isOpen = expandedId === f.id;
            return (
              <View key={f.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  style={styles.row}
                  onPress={() => setExpandedId(isOpen ? null : f.id)}
                  accessibilityRole="button"
                  accessibilityLabel={f.question}
                  accessibilityState={{ expanded: isOpen }}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={20}
                    color={colors.navy}
                    style={styles.rowIcon}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel} numberOfLines={2}>
                      {f.question}
                    </Text>
                    <Text style={styles.rowMeta}>{f.category}</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
                {isOpen ? (
                  <View style={styles.answerWrap}>
                    <Text style={styles.answerText}>{f.answer}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </Card>

      <SectionHeader title="Quick actions" />
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}
            onPress={() => router.push(a.href as never)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <Ionicons name={a.icon} size={22} color={colors.navy} />
            <Text style={styles.actionLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Contact us" />
      <Card style={styles.listCard}>
        <ContactRow
          icon="chatbubbles-outline"
          label="Send a message"
          sub="Fill a short form — we reply within 24 hours"
          onPress={() => router.push("/support/contact")}
        />
        <View style={styles.divider} />
        <ContactRow
          icon="mail-outline"
          label="Email support"
          sub={SUPPORT_EMAIL}
          onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
        />
      </Card>

      <SectionHeader title="Legal & about" />
      <Card style={styles.listCard}>
        {LEGAL_ROWS.map((row, i) => (
          <View key={row.label}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.row} accessibilityRole="text" accessibilityLabel={row.label}>
              <Ionicons name={row.icon} size={20} color={colors.textMuted} style={styles.rowIcon} />
              <Text style={[styles.rowLabel, styles.rowLabelDisabled]}>{row.label}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Text style={styles.version}>WiserWits v{version}</Text>
    </ScrollView>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ContactRow({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={colors.navy} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowMeta}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    paddingVertical: 0,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  sectionTitle: { ...typography.label, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionAction: { ...typography.label, color: colors.navy, fontWeight: "700" },

  listCard: { padding: 0, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowIcon: { width: 24, textAlign: "center" },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...typography.body, color: colors.ink, fontWeight: "600" },
  rowLabelDisabled: { color: colors.textMuted, flex: 1 },
  rowMeta: { ...typography.caption, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg },

  emptyRow: { padding: spacing.lg },
  emptyText: { ...typography.body, color: colors.textMuted },

  answerWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: 0,
    paddingLeft: spacing.lg + 24 + spacing.md,
  },
  answerText: { ...typography.body, color: colors.textMuted, lineHeight: 22 },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  actionTile: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 84,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  actionLabel: { ...typography.label, color: colors.ink, textAlign: "center" },
  pressed: { opacity: 0.7 },

  version: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
});
