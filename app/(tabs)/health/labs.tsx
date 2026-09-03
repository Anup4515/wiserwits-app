import { ScrollView, StyleSheet, RefreshControl } from "react-native";

import { useLabReports } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { LabReportsSection } from "@/features/health/sections";
import { colors, spacing } from "@/theme";

/**
 * Lab reports screen — reports shared by the consultant.
 *
 * Wrapped in QueryView (like every other read screen) rather than rendering
 * `query.data ?? []`: that fallback made a failed request — offline, a 5xx, or
 * the plan-locked 403 — render the section's "No lab reports shared" empty
 * state, so a student read a broken fetch as "the consultant hasn't sent
 * anything", with no error and no retry. QueryView shows the spinner, the
 * error+retry, and the plan upsell in their own right; the empty state now
 * means genuinely empty.
 */
export default function LabReportsScreen() {
  const result = useLabReports();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} feature="student.health" loadingLabel="Loading lab reports…">
        {(rows) => <LabReportsSection rows={rows} />}
      </QueryView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
