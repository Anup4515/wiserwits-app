import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useFeed, useMarkFeedRead } from "@/api/hooks";
import { Card } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { EmptyState } from "@/components/data-ui";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { FeedCategory, FeedData, FeedItem } from "@/api/student-types";

/**
 * Activity feed (mock 8, Phase 3) — the daily-open hook. One `/feed` call
 * returns a merged, newest-first list of what happened across the student's
 * school/self data; we group it by calendar day. Opening the screen marks the
 * whole feed read (the watermark bump clears unread dots on next fetch).
 */
export default function FeedScreen() {
  const result = useFeed();
  const { query } = result;
  const markRead = useMarkFeedRead();

  // Mark read once per visit, after the first successful load, so the unread
  // dots stay visible while the student is actually looking at them.
  const marked = useRef(false);
  const hasUnread = query.data?.items.some((i) => i.unread) ?? false;
  useEffect(() => {
    if (!marked.current && hasUnread) {
      marked.current = true;
      markRead.mutate();
    }
  }, [hasUnread, markRead]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result}>{(data) => <FeedBody data={data} />}</QueryView>
    </ScrollView>
  );
}

function FeedBody({ data }: { data: FeedData }) {
  if (data.items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="notifications-outline"
          title="Nothing new yet"
          subtitle="Marks, attendance, feedback and shared plans will show up here as they happen."
        />
      </Card>
    );
  }

  const groups = groupByDay(data.items);
  return (
    <>
      {groups.map((g) => (
        <View key={g.key} style={{ gap: spacing.sm }}>
          <Text style={styles.dayLabel}>{g.label}</Text>
          <Card style={{ gap: spacing.md }}>
            {g.items.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
          </Card>
        </View>
      ))}
    </>
  );
}

const ROUTE: Record<FeedCategory, Href> = {
  assignment: "/assignments",
  advice: "/advice",
  feedback: "/advice",
  consultation: "/health",
  diet: "/health",
  lab: "/health",
  report: "/(tabs)/academics/report",
  marks: "/(tabs)/academics/exams",
  attendance: "/(tabs)/academics/attendance",
};

const ICON: Record<FeedCategory, { name: keyof typeof Ionicons.glyphMap; tint: string; fg: string }> = {
  assignment: { name: "clipboard-outline", tint: colors.blueBg, fg: colors.blue },
  advice: { name: "chatbubble-ellipses-outline", tint: palette.accent100, fg: palette.accent600 },
  feedback: { name: "chatbox-ellipses-outline", tint: colors.blueBg, fg: colors.blue },
  consultation: { name: "medkit-outline", tint: colors.greenBg, fg: colors.green },
  diet: { name: "nutrition-outline", tint: colors.greenBg, fg: colors.green },
  lab: { name: "flask-outline", tint: colors.amberBg, fg: colors.amber },
  report: { name: "document-text-outline", tint: palette.primary50, fg: colors.navy },
  marks: { name: "reader-outline", tint: colors.blueBg, fg: colors.blue },
  attendance: { name: "calendar-outline", tint: colors.greenBg, fg: colors.green },
};

function FeedRow({ item }: { item: FeedItem }) {
  const router = useRouter();
  const ic = ICON[item.category];
  return (
    <Pressable
      onPress={() => router.push(ROUTE[item.category])}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.rowIc, { backgroundColor: ic.tint }]}>
        <Ionicons name={ic.name} size={17} color={ic.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          {item.unread ? <View style={styles.dot} /> : null}
        </View>
        {item.body ? <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text> : null}
      </View>
      <Text style={styles.rowTime}>{timeLabel(item.ts)}</Text>
    </Pressable>
  );
}

// ── day grouping ─────────────────────────────────────────────────────────────
interface DayGroup {
  key: string;
  label: string;
  items: FeedItem[];
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByDay(items: FeedItem[]): DayGroup[] {
  const today = ymd(new Date());
  const yest = ymd(new Date(Date.now() - 86400000));
  const order: string[] = [];
  const map = new Map<string, FeedItem[]>();
  for (const item of items) {
    const key = ymd(new Date(item.ts));
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(item);
  }
  return order.map((key) => ({
    key,
    label: key === today ? "Today" : key === yest ? "Yesterday" : prettyDay(key),
    items: map.get(key)!,
  }));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${suffix}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  dayLabel: { ...typography.label, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },

  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowIc: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  rowHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowTitle: { ...typography.label, color: colors.ink, fontSize: 13.5, flexShrink: 1 },
  rowBody: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  rowTime: { ...typography.caption, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
});
