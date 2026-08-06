import { ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import { useConsultations } from "@/api/hooks";
import { Button } from "@/components/ui";
import { ConsultationsSection } from "@/features/health/sections";
import { colors, spacing } from "@/theme";

/** Consultations screen — "Book consultation" (opens the booking modal) + list. */
export default function ConsultationsScreen() {
  const router = useRouter();
  const { query } = useConsultations();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <Button label="Schedule Consultation" onPress={() => router.push("/book-consultation")} />
      <ConsultationsSection rows={query.data ?? []} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
