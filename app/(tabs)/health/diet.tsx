import { ScrollView, StyleSheet, RefreshControl } from "react-native";

import { useDietPlans } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { DietPlansSection } from "@/features/health/sections";
import { colors, spacing } from "@/theme";

/**
 * Diet plans screen — plans shared by the consultant (download each).
 *
 * See labs.tsx: QueryView rather than `query.data ?? []`, so a failed or
 * plan-locked fetch shows an error/upsell instead of masquerading as "no plans
 * shared".
 */
export default function DietPlansScreen() {
  const result = useDietPlans();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} feature="student.health" loadingLabel="Loading diet plans…">
        {(rows) => <DietPlansSection rows={rows} />}
      </QueryView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
