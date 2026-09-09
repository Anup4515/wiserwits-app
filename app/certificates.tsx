import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useCertificates } from "@/api/hooks";
import { downloadAndSave, resolveFileUrl } from "@/lib/download";
import { QueryListView } from "@/components/QueryView";
import { Card, Button } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";
import type { CertificateRow } from "@/api/student-types";

/**
 * Certificates (Phase 4.7). Lists the student's issued certificates newest-first;
 * each row shows its title and issued date with a one-tap download.
 *
 * `file_url` is a BARE storage relPath from the API, so it goes through
 * `resolveFileUrl()` and then `downloadAndSave()`, which attaches the Bearer
 * token /api/files requires. It used to go straight to `Linking.openURL`, which
 * could only ever answer "this link can't be opened" — and handing the resolved
 * URL to the device browser wouldn't work either, since that carries no token
 * and /api/files would 401. The web dashboard works because the browser sends
 * its session cookie; the app has to attach the token itself.
 */

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
      <QueryListView loadMoreLabel="Load older certificates" result={result} loadingLabel="Loading certificates…">
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
      </QueryListView>
    </ScrollView>
  );
}

function CertificateCard({ row }: { row: CertificateRow }) {
  const [downloading, setDownloading] = useState(false);
  const fileUrl = resolveFileUrl(row.file_url);

  async function download() {
    if (!fileUrl) return;
    setDownloading(true);
    // The consultant can attach a PDF *or* an image (.pdf/.jpg/.jpeg/.png/
    // .webp), so keep the stored file's own extension — naming a JPEG ".pdf"
    // hands the share sheet to a PDF viewer that then can't open it.
    const ext = row.file_url?.split("?")[0].match(/\.[a-z0-9]+$/i)?.[0] ?? "";
    await downloadAndSave(fileUrl, `${row.title || "certificate"}${ext.toLowerCase()}`);
    setDownloading(false);
  }

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

      {fileUrl ? (
        <Button
          label={downloading ? "Downloading…" : "Download"}
          variant="secondary"
          onPress={download}
          loading={downloading}
          disabled={downloading}
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
