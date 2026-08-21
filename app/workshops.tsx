import { View, StyleSheet, ScrollView, RefreshControl, Linking, Alert } from "react-native";

import { useWorkshops } from "@/api/hooks";
import { QueryListView } from "@/components/QueryView";
import { Pill } from "@/components/ui";
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
import { mediumDate, isPastDate } from "@/lib/format";
import { colors, spacing } from "@/theme";
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
      <QueryListView loadMoreLabel="Load more workshops" result={result} loadingLabel="Loading workshops…">
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
                <View style={groupStyle}>
                  <SectionHeader title="Upcoming" />
                  {upcoming.map((row, i) => (
                    <WorkshopCard key={row.id} row={row} past={false} next={i === 0} />
                  ))}
                </View>
              ) : null}

              {past.length > 0 ? (
                <View style={groupStyle}>
                  <SectionHeader title="Past" />
                  {past.map((row) => (
                    <WorkshopCard key={row.id} row={row} past />
                  ))}
                </View>
              ) : null}
            </>
          );
        }}
      </QueryListView>
    </ScrollView>
  );
}

function WorkshopCard({ row, past, next = false }: { row: WorkshopRow; past: boolean; next?: boolean }) {
  return (
    <ListCard>
      <CardHead
        left={<DateChip iso={row.start_date} />}
        title={row.title}
        meta={[{ icon: "calendar-outline", text: mediumDate(row.start_date) }]}
        right={<IconTile icon="easel-outline" tone={past ? "navy" : "gold"} />}
      />

      {row.description ? <CardDescription text={row.description} /> : null}

      <CardFooter
        left={
          <>
            {next ? <Pill label="Next" tone="gold" /> : null}
            <Pill label={past ? "Ended" : "Upcoming"} tone={past ? "navy" : "blue"} />
          </>
        }
        right={
          !past && row.join_link ? (
            <CardAction
              icon="videocam-outline"
              label="Join"
              tone="gold"
              onPress={() => {
                if (row.join_link) openLink(row.join_link);
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
