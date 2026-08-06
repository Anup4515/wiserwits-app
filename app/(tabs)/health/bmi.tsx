import { ScrollView, StyleSheet, RefreshControl } from "react-native";

import { useHealth } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { BmiCard, BmiHistory } from "@/features/health/sections";
import { colors, spacing } from "@/theme";

/**
 * BMI screen — latest reading + trend + full reading history (with delete).
 * "Log BMI" opens the quick-action modal. Driven by the `/health` overview call.
 */
export default function BmiScreen() {
  const result = useHealth();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} feature="student.health">
        {(data) => (
          <>
            <BmiCard data={data} />
            {data.bmi_records.length > 0 ? <BmiHistory records={data.bmi_records} /> : null}
          </>
        )}
      </QueryView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
