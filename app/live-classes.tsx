import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useLiveClasses } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card, Button, Pill } from "@/components/ui";
import { EmptyState, SectionHeader } from "@/components/data-ui";
import { dateTime, isPastDate } from "@/lib/format";
import { colors, spacing, typography } from "@/theme";
import type { LiveClassRow } from "@/api/student-types";

/**
 * Live classes (Phase 4.7). Grouped Live → Upcoming → Past so the most relevant
 * class is on top: any live-now class is pinned first, then scheduled classes
 * soonest-first, then completed/cancelled most-recent-first. "Join" shows only
 * for live/scheduled classes with a link; past classes offer their recording (or
 * nothing), never a dead "Join".
 */

async function openLink(url: string) {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (ok) await Linking.openURL(url);
  else Alert.alert("Can't open", "This link can't be opened on your device.");
}

/** ms since epoch for sorting; NaN-safe (unparseable times sort last). */
function ts(iso: string): number {
  const n = new Date(iso).getTime();
  return Number.isNaN(n) ? -Infinity : n;
}

/**
 * Which section a class belongs to. Date-aware because the stored status isn't
 * reliably transitioned: a class left as 'scheduled' whose start date has passed
 * is really over, so it drops to "past" (and loses its Join) instead of sitting
 * forever in Upcoming. 'live' always wins; completed/cancelled are always past.
 */
function phaseOf(c: LiveClassRow): "live" | "upcoming" | "past" {
  if (c.status === "live") return "live";
  if (c.status === "scheduled" && !isPastDate(c.start_time)) return "upcoming";
  return "past";
}

type PillTone = "green" | "amber" | "red" | "blue" | "navy" | "gold";
const STATUS_TONE: Record<LiveClassRow["status"], PillTone> = {
  live: "red",
  scheduled: "blue",
  completed: "green",
  cancelled: "navy",
};
const STATUS_LABEL: Record<LiveClassRow["status"], string> = {
  live: "Live",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function LiveClassesScreen() {
  const result = useLiveClasses();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} loadingLabel="Loading live classes…">
        {(data) => {
          if (data.length === 0) {
            return (
              <EmptyState
                icon="videocam-outline"
                title="No live classes yet"
                subtitle="Scheduled classes will appear here."
              />
            );
          }

          // Group by date-aware phase, then time-order within each group.
          const live = data
            .filter((c) => phaseOf(c) === "live")
            .sort((a, b) => ts(a.start_time) - ts(b.start_time));
          const upcoming = data
            .filter((c) => phaseOf(c) === "upcoming")
            .sort((a, b) => ts(a.start_time) - ts(b.start_time)); // soonest first
          const past = data
            .filter((c) => phaseOf(c) === "past")
            .sort((a, b) => ts(b.start_time) - ts(a.start_time)); // most recent first

          return (
            <>
              {live.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="Live now" />
                  {live.map((row) => <LiveClassCard key={row.id} row={row} ended={false} />)}
                </View>
              ) : null}

              {upcoming.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="Upcoming" />
                  {upcoming.map((row) => <LiveClassCard key={row.id} row={row} ended={false} />)}
                </View>
              ) : null}

              {past.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="Past" />
                  {past.map((row) => <LiveClassCard key={row.id} row={row} ended />)}
                </View>
              ) : null}
            </>
          );
        }}
      </QueryView>
    </ScrollView>
  );
}

function LiveClassCard({ row, ended }: { row: LiveClassRow; ended: boolean }) {
  const canJoin =
    !ended && (row.status === "scheduled" || row.status === "live") && !!row.join_link;
  const canWatch = !canJoin && !!row.recording_url;

  // A class left as 'scheduled' but past its date reads as "Ended", not
  // "Scheduled" — the stored status is stale. Completed/cancelled keep theirs.
  const label = ended && row.status === "scheduled" ? "Ended" : STATUS_LABEL[row.status];
  const tone: PillTone = ended && row.status === "scheduled" ? "navy" : STATUS_TONE[row.status];

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <Text style={styles.title}>{row.title}</Text>
        <Pill label={label} tone={tone} />
      </View>

      {row.description ? (
        <Text style={styles.desc} numberOfLines={2}>
          {row.description}
        </Text>
      ) : null}

      <View style={styles.meta}>
        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
        <Text style={styles.metaText}>{dateTime(row.start_time)}</Text>
      </View>

      {canJoin ? (
        <Button
          label="Join"
          onPress={() => {
            if (row.join_link) openLink(row.join_link);
          }}
        />
      ) : canWatch ? (
        <Button
          label="Recording"
          variant="secondary"
          onPress={() => {
            if (row.recording_url) openLink(row.recording_url);
          }}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  section: { gap: spacing.md },

  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { ...typography.h2, color: colors.ink, flex: 1 },
  desc: { ...typography.body, color: colors.textMuted },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { ...typography.label, color: colors.textMuted },
});
