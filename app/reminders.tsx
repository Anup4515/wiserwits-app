import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useReminders } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";
import type { ReminderRow } from "@/api/student-types";

/**
 * Reminders (Phase 4.7). Lists the student's upcoming reminders, leading with the
 * appointment date so the next thing they need to show up for is unmissable.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function RemindersScreen() {
  const result = useReminders();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} loadingLabel="Loading reminders…">
        {(data) =>
          data.length === 0 ? (
            <EmptyState
              icon="alarm-outline"
              title="No reminders yet"
              subtitle="Your reminders will appear here."
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {data.map((row) => (
                <ReminderCard key={row.id} row={row} />
              ))}
            </View>
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function ReminderCard({ row }: { row: ReminderRow }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.dateRow}>
        <Ionicons name="alarm-outline" size={16} color={colors.navy} />
        <Text style={styles.date}>{prettyDate(row.appointment_date)}</Text>
      </View>

      <Text style={styles.title}>{row.title}</Text>

      {row.description ? (
        <Text style={styles.desc} numberOfLines={3}>
          {row.description}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  dateRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  date: { ...typography.h2, color: colors.navy },
  title: { ...typography.h2, color: colors.ink },
  desc: { ...typography.body, color: colors.textMuted },
});
