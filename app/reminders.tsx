import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useReminders } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { downloadAndSave, resolveFileUrl } from "@/lib/download";
import { REMINDER_TYPE_META as TYPE_META, formatReminderWhen as formatWhen } from "@/lib/reminders";
import { colors, spacing, radius, typography } from "@/theme";
import type { ReminderRow } from "@/api/student-types";

/**
 * Reminders (unified agenda). One `/api/student/reminders` call returns the
 * student's consultant reminders (appointments / tests), live classes,
 * workshops, assignments (due) and consultations, already filtered (no
 * cancelled / submitted), bucketed into Today / Upcoming / Past. Each row
 * deep-links to its source screen — except consultant reminders, which have no
 * screen of their own and show their note + attachment inline.
 */

const BUCKETS = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
] as const;

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
              subtitle="Consultant reminders, classes, workshops, assignments and consultations will show up here."
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
  const meta = TYPE_META[row.type] ?? TYPE_META.appointment;
  const href = meta.href;
  const fileUrl = resolveFileUrl(row.attachment);

  const card = (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: meta.tint }]}>
        <Ionicons name={meta.icon} size={20} color={meta.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{row.title}</Text>
        <Text style={styles.sub} numberOfLines={href ? 1 : 3}>
          {meta.label}
          {row.subtitle ? ` · ${row.subtitle}` : ""}
        </Text>
        {fileUrl ? <AttachmentButton url={fileUrl} /> : null}
      </View>
      <Text style={styles.when}>{formatWhen(row.when)}</Text>
    </Card>
  );

  if (!href) return card;
  return (
    <Pressable onPress={() => router.push(href)} style={({ pressed }) => pressed && { opacity: 0.9 }}>
      {card}
    </Pressable>
  );
}

function AttachmentButton({ url }: { url: string }) {
  const [busy, setBusy] = useState(false);
  const ext = url.split("?")[0].match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? "";
  return (
    <Pressable
      disabled={busy}
      hitSlop={6}
      onPress={async () => {
        setBusy(true);
        try {
          await downloadAndSave(url, `reminder-attachment${ext}`);
        } finally {
          setBusy(false);
        }
      }}
      style={({ pressed }) => [styles.attach, (pressed || busy) && { opacity: 0.7 }]}
    >
      <Ionicons name="attach-outline" size={14} color={colors.info} />
      <Text style={styles.attachText}>{busy ? "Downloading…" : "View attachment"}</Text>
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
  attach: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs, alignSelf: "flex-start" },
  attachText: { ...typography.caption, color: colors.info, fontWeight: "700" },
});
