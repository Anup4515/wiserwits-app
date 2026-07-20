import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useWorkshops } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card, Button } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";
import type { WorkshopRow } from "@/api/student-types";

/**
 * Workshops (Phase 4.7). Lists the student's workshops with their start date and
 * a one-tap "Join" that opens the workshop link when one has been shared.
 */

async function openLink(url: string) {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (ok) await Linking.openURL(url);
  else Alert.alert("Can't open", "This link can't be opened on your device.");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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
        {(data) =>
          data.length === 0 ? (
            <EmptyState
              icon="easel-outline"
              title="No workshops yet"
              subtitle="Upcoming workshops will appear here."
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {data.map((row) => (
                <WorkshopCard key={row.id} row={row} />
              ))}
            </View>
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function WorkshopCard({ row }: { row: WorkshopRow }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={styles.title}>{row.title}</Text>

      {row.description ? (
        <Text style={styles.desc} numberOfLines={3}>
          {row.description}
        </Text>
      ) : null}

      <View style={styles.meta}>
        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
        <Text style={styles.metaText}>{prettyDate(row.start_date)}</Text>
      </View>

      {row.join_link ? (
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
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  title: { ...typography.h2, color: colors.ink },
  desc: { ...typography.body, color: colors.textMuted },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { ...typography.label, color: colors.textMuted },
});
