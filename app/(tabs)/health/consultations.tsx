import { ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import { useConsultations } from "@/api/hooks";
import { Button } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { ConsultationsSection } from "@/features/health/sections";
import { colors, spacing } from "@/theme";

/**
 * Consultations screen — "Book consultation" (opens the booking modal) + list.
 *
 * See labs.tsx: QueryView rather than `query.data ?? []`, so a failed or
 * plan-locked fetch shows an error/upsell instead of masquerading as "no
 * consultations yet".
 */
export default function ConsultationsScreen() {
  const router = useRouter();
  const result = useConsultations();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <Button label="Schedule Consultation" onPress={() => router.push("/book-consultation")} />
      <QueryView result={result} feature="student.health" loadingLabel="Loading consultations…">
        {(rows) => <ConsultationsSection rows={rows} />}
      </QueryView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
