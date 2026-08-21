import { View, StyleSheet, ScrollView, RefreshControl, Linking, Alert } from "react-native";

import { useLiveClasses } from "@/api/hooks";
import { QueryListView } from "@/components/QueryView";
import { Pill, type PillTone } from "@/components/ui";
import {
  ListCard,
  DateChip,
  IconTile,
  CardHead,
  CardFooter,
  CardAction,
  CardDescription,
  groupStyle,
} from "@/components/list-card";
import { EmptyState, SectionHeader } from "@/components/data-ui";
import { dateTime, isPastDate } from "@/lib/format";
import { colors, spacing } from "@/theme";
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
      <QueryListView loadMoreLabel="Load more classes" result={result} loadingLabel="Loading live classes…">
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
                <View style={groupStyle}>
                  <SectionHeader title="Live now" />
                  {live.map((row) => <LiveClassCard key={row.id} row={row} ended={false} />)}
                </View>
              ) : null}

              {upcoming.length > 0 ? (
                <View style={groupStyle}>
                  <SectionHeader title="Upcoming" />
                  {upcoming.map((row) => <LiveClassCard key={row.id} row={row} ended={false} />)}
                </View>
              ) : null}

              {past.length > 0 ? (
                <View style={groupStyle}>
                  <SectionHeader title="Past" />
                  {past.map((row) => <LiveClassCard key={row.id} row={row} ended />)}
                </View>
              ) : null}
            </>
          );
        }}
      </QueryListView>
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
    // A class that is live right now is the one row worth acting on.
    <ListCard>
      <CardHead
        left={<DateChip iso={row.start_time} />}
        title={row.title}
        meta={[{ icon: "time-outline", text: dateTime(row.start_time) }]}
        right={<IconTile icon="videocam-outline" tone={tone} />}
      />

      {row.description ? <CardDescription text={row.description} numberOfLines={2} /> : null}

      <CardFooter
        left={<Pill label={label} tone={tone} />}
        right={
          canJoin ? (
            <CardAction
              icon="videocam-outline"
              label="Join"
              tone="gold"
              onPress={() => {
                if (row.join_link) openLink(row.join_link);
              }}
            />
          ) : canWatch ? (
            <CardAction
              icon="play-circle-outline"
              label="Recording"
              onPress={() => {
                if (row.recording_url) openLink(row.recording_url);
              }}
            />
          ) : null
        }
      />
    </ListCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
