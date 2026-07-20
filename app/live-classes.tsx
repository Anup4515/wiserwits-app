import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useLiveClasses } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card, Button, Pill } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";
import type { LiveClassRow } from "@/api/student-types";

/**
 * Live classes (Phase 4.7). Lists the student's scheduled/live/past classes with
 * a status pill and time; a "Join" action opens the meeting link for upcoming or
 * live sessions, and a "Recording" action opens the replay once available.
 */

async function openLink(url: string) {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (ok) await Linking.openURL(url);
  else Alert.alert("Can't open", "This link can't be opened on your device.");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const h = d.getHours();
  const m = d.getMinutes();
  const hour12 = ((h + 11) % 12) + 1;
  const time = `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${time}`;
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
        {(data) =>
          data.length === 0 ? (
            <EmptyState
              icon="videocam-outline"
              title="No live classes yet"
              subtitle="Scheduled classes will appear here."
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {data.map((row) => (
                <LiveClassCard key={row.id} row={row} />
              ))}
            </View>
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function LiveClassCard({ row }: { row: LiveClassRow }) {
  const canJoin =
    (row.status === "scheduled" || row.status === "live") && !!row.join_link;
  const canWatch = !canJoin && !!row.recording_url;

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <Text style={styles.title}>{row.title}</Text>
        <Pill label={STATUS_LABEL[row.status]} tone={STATUS_TONE[row.status]} />
      </View>

      {row.description ? (
        <Text style={styles.desc} numberOfLines={2}>
          {row.description}
        </Text>
      ) : null}

      <View style={styles.meta}>
        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
        <Text style={styles.metaText}>{prettyDateTime(row.start_time)}</Text>
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
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

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
