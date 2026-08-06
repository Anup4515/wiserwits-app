import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useCertificates } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card, Button } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";
import type { CertificateRow } from "@/api/student-types";

/**
 * Certificates (Phase 4.7). Lists the student's issued certificates newest-first;
 * each row shows its title and issued date with a one-tap "View" that opens the
 * certificate's file URL when one is available.
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

export default function CertificatesScreen() {
  const result = useCertificates();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} loadingLabel="Loading certificates…">
        {(data) =>
          data.length === 0 ? (
            <EmptyState
              icon="ribbon-outline"
              title="No certificates yet"
              subtitle="Certificates will appear here."
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {data.map((row) => (
                <CertificateCard key={row.id} row={row} />
              ))}
            </View>
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function CertificateCard({ row }: { row: CertificateRow }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <View style={styles.ic}>
          <Ionicons name="ribbon-outline" size={18} color={colors.gold} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.title}>{row.title}</Text>
          <Text style={styles.meta}>Issued {prettyDate(row.created_at)}</Text>
        </View>
      </View>

      {row.file_url ? (
        <Button
          label="View"
          variant="secondary"
          onPress={() => {
            if (row.file_url) openLink(row.file_url);
          }}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ic: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.amberBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headText: { flex: 1, gap: 2 },
  title: { ...typography.h2, color: colors.ink },
  meta: { ...typography.label, color: colors.textMuted },
});
