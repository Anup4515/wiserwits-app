import { ScrollView, StyleSheet, RefreshControl } from "react-native";

import { useLabReports } from "@/api/hooks";
import { LabReportsSection } from "@/features/health/sections";
import { colors, spacing } from "@/theme";

/** Lab reports screen — reports shared by the consultant. */
export default function LabReportsScreen() {
  const { query } = useLabReports();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <LabReportsSection rows={query.data ?? []} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
