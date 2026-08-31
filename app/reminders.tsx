import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";

import { useReminders } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { ReminderRow, ReminderType } from "@/api/student-types";

/**
 * Reminders (unified agenda). One `/api/student/reminders` call returns the
 * student's live classes, workshops, assignments (due) and consultations,
 * already filtered (no cancelled / submitted), bucketed into Today / Upcoming /
 * Past. Each row deep-links to its source screen.
 */

const BUCKETS = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
] as const;

const TYPE_META: Record<
  ReminderType,
  { icon: keyof typeof Ionicons.glyphMap; href: Href; label: string; tint: string; fg: string }
> = {
  consultation: { icon: "medkit-outline", href: "/(tabs)/health/consultations", label: "Consultation", tint: colors.greenBg, fg: colors.green },
  live_class: { icon: "videocam-outline", href: "/live-classes", label: "Live class", tint: colors.blueBg, fg: colors.blue },
  workshop: { icon: "easel-outline", href: "/workshops", label: "Workshop", tint: palette.accent100, fg: palette.accent600 },
  assignment: { icon: "clipboard-outline", href: "/assignments", label: "Assignment", tint: colors.amberBg, fg: colors.amber },
};

/** "Thu, 2 Jul · 3:30 PM" (IST) for a datetime, or "Thu, 2 Jul" for a date. */
function formatWhen(when: string): string {
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return when;
  const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  if (!when.includes("T")) return dateStr;
  const timeStr = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  return `${dateStr} · ${timeStr}`;
}

export default function RemindersScreen() {
  const result = useReminders();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
    >
      <QueryView result={result} loadingLabel="Loading reminders…">
        {(data) =>
          data.length === 0 ? (
            <EmptyState
              icon="alarm-outline"
              title="No reminders yet"
              subtitle="Your classes, workshops, assignments and consultations will show up here."
            />
          ) : (
            <View style={{ gap: spacing.lg }}>
              {BUCKETS.map(({ key, label }) => {
                const rows = data.filter((r) => r.bucket === key);
                if (rows.length === 0) return null;
                return (
                  <View key={key} style={{ gap: spacing.sm }}>
                    <Text style={styles.sectionLabel}>{label}</Text>
                    {rows.map((row) => (
                      <ReminderCard key={row.id} row={row} />
                    ))}
                  </View>
                );
              })}
            </View>
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function ReminderCard({ row }: { row: ReminderRow }) {
  const router = useRouter();
  const meta = TYPE_META[row.type];
  return (
    <Pressable onPress={() => router.push(meta.href)} style={({ pressed }) => pressed && { opacity: 0.9 }}>
      <Card style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: meta.tint }]}>
          <Ionicons name={meta.icon} size={20} color={meta.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{row.title}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {meta.label}
            {row.subtitle ? ` · ${row.subtitle}` : ""}
          </Text>
        </View>
        <Text style={styles.when}>{formatWhen(row.when)}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  sectionLabel: { ...typography.label, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4, paddingHorizontal: spacing.xs },

  card: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  title: { ...typography.h2, fontSize: 15, color: colors.ink },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  when: { ...typography.caption, color: colors.textMuted, textAlign: "right", flexShrink: 0 },
});
