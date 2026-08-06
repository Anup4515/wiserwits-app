import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useWorkshops } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card, Button, Pill } from "@/components/ui";
import { EmptyState, SectionHeader } from "@/components/data-ui";
import { mediumDate, isPastDate } from "@/lib/format";
import { colors, spacing, typography } from "@/theme";
import type { WorkshopRow } from "@/api/student-types";

/**
 * Workshops (Phase 4.7). Lists the student's workshops split into Upcoming vs
 * Past (workshops carry only a date, so the split is date-based). Upcoming shows
 * soonest-first with a one-tap "Join"; past shows most-recent-first, marked
 * "Ended" with no Join (the event is over). Broadcast workshops (student_id NULL)
 * are included by the API.
 */

async function openLink(url: string) {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (ok) await Linking.openURL(url);
  else Alert.alert("Can't open", "This link can't be opened on your device.");
}

/** ms since epoch for sorting; NaN-safe (unparseable dates sort last). */
function ts(iso: string): number {
  const n = new Date(iso).getTime();
  return Number.isNaN(n) ? -Infinity : n;
}

export default function WorkshopsScreen() {
  const result = useWorkshops();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} loadingLabel="Loading workshops…">
        {(data) => {
          if (data.length === 0) {
            return (
              <EmptyState
                icon="easel-outline"
                title="No workshops yet"
                subtitle="Upcoming workshops will appear here."
              />
            );
          }

          const upcoming = data
            .filter((w) => !isPastDate(w.start_date))
            .sort((a, b) => ts(a.start_date) - ts(b.start_date)); // soonest first
          const past = data
            .filter((w) => isPastDate(w.start_date))
            .sort((a, b) => ts(b.start_date) - ts(a.start_date)); // most recent first

          return (
            <>
              {upcoming.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="Upcoming" />
                  {upcoming.map((row) => (
                    <WorkshopCard key={row.id} row={row} past={false} />
                  ))}
                </View>
              ) : null}

              {past.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="Past" />
                  {past.map((row) => (
                    <WorkshopCard key={row.id} row={row} past />
                  ))}
                </View>
              ) : null}
            </>
          );
        }}
      </QueryView>
    </ScrollView>
  );
}

function WorkshopCard({ row, past }: { row: WorkshopRow; past: boolean }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <Text style={styles.title}>{row.title}</Text>
        {past ? <Pill label="Ended" tone="navy" /> : null}
      </View>

      {row.description ? (
        <Text style={styles.desc} numberOfLines={3}>
          {row.description}
        </Text>
      ) : null}

      <View style={styles.meta}>
        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
        <Text style={styles.metaText}>{mediumDate(row.start_date)}</Text>
      </View>

      {!past && row.join_link ? (
        <Button
          label="Join"
          onPress={() => {
            if (row.join_link) openLink(row.join_link);
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
