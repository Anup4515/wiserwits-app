import { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useFeed, useMarkFeedRead } from "@/api/hooks";
import { Card } from "@/components/ui";
import { EmptyState, LoadingState, ErrorState } from "@/components/data-ui";
import { track } from "@/lib/analytics";
import { hrefForCategory } from "@/lib/notification-routes";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { FeedCategory, FeedItem } from "@/api/student-types";

/**
 * Activity feed (mock 8, Phase 3) — the daily-open hook. `/feed` is cursor-
 * paginated (25 per page); older pages load as the student scrolls. Items are
 * grouped by calendar day. Opening the screen marks the whole feed read (the
 * watermark bump clears unread dots on next fetch).
 *
 * A FlatList of DAY GROUPS rather than of rows: it keeps the existing "day
 * label + one Card of rows" design exactly as-is while still virtualising (a
 * year of feed is ~365 mounted groups instead of thousands of rows). Days hold
 * a handful of items each, so per-group mounting is cheap.
 */
export default function FeedScreen() {
  const { query } = useFeed();
  const markRead = useMarkFeedRead();

  // Flatten every loaded page before grouping, so a day that straddles a page
  // boundary still renders as one group rather than two.
  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data]
  );
  const groups = useMemo(() => groupByDay(items), [items]);

  // Mark read once per visit, after the first successful load, so the unread
  // dots stay visible while the student is actually looking at them.
  const marked = useRef(false);
  const hasUnread = items.some((i) => i.unread);
  useEffect(() => {
    if (!marked.current && hasUnread) {
      marked.current = true;
      markRead.mutate();
    }
  }, [hasUnread, markRead]);

  // Retention signal (Phase 4.10): one feed-open event per screen visit.
  const opened = useRef(false);
  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      track("feed_opened");
    }
  }, []);

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.pad}
      data={groups}
      keyExtractor={(g) => g.key}
      renderItem={({ item: g }) => (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.dayLabel}>{g.label}</Text>
          <Card style={{ gap: spacing.md }}>
            {g.items.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
          </Card>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
        />
      }
      // Pull the next page a little before the bottom so scrolling stays smooth.
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      }}
      ListEmptyComponent={
        <Card>
          <EmptyState
            icon="notifications-outline"
            title="Nothing new yet"
            subtitle="Marks, attendance, feedback and shared plans will show up here as they happen."
          />
        </Card>
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.navy} />
          </View>
        ) : null
      }
    />
  );
}

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
  reminder: { name: "alarm-outline", tint: colors.amberBg, fg: colors.amber },
  holistic: { name: "sparkles-outline", tint: palette.accent100, fg: palette.accent600 },
  timetable: { name: "time-outline", tint: palette.primary50, fg: colors.navy },
  calendar: { name: "calendar-number-outline", tint: colors.blueBg, fg: colors.blue },
  live_class: { name: "videocam-outline", tint: palette.accent100, fg: palette.accent600 },
  workshop: { name: "easel-outline", tint: colors.greenBg, fg: colors.green },
  certificate: { name: "ribbon-outline", tint: palette.primary50, fg: colors.navy },
};

// Fallback for a category outside the known union (the feed is fed by
// student_events emitted from a SEPARATE repo, so an unknown category must not
// crash the row).
const DEFAULT_ICON = { name: "notifications-outline" as const, tint: palette.primary50, fg: colors.navy };

function FeedRow({ item }: { item: FeedItem }) {
  const router = useRouter();
  const ic = ICON[item.category] ?? DEFAULT_ICON;
  return (
    <Pressable
      onPress={() => router.push(hrefForCategory(item.category))}
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
  // No `gap` here — FlatList spaces rows via ItemSeparatorComponent, and a gap
  // on the content container would double the spacing between day groups.
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  footer: { paddingVertical: spacing.lg, alignItems: "center" },
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
