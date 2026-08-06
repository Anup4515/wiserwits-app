import { ScrollView, StyleSheet, RefreshControl } from "react-native";

import { useDietPlans } from "@/api/hooks";
import { DietPlansSection } from "@/features/health/sections";
import { colors, spacing } from "@/theme";

/** Diet plans screen — plans shared by the consultant (download each). */
export default function DietPlansScreen() {
  const { query } = useDietPlans();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <DietPlansSection rows={query.data ?? []} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
