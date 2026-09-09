import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useNotices } from "@/api/hooks";
import { QueryListView } from "@/components/QueryView";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { downloadAndSave, resolveFileUrl } from "@/lib/download";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { NoticeRow } from "@/api/student-types";

/**
 * Notices from the school.
 *
 * The list arrives already filtered by the backend — published, addressed to
 * students, unexpired, and either school-wide or aimed at this student's own
 * class — so nothing is decided here.
 *
 * A notice can carry a PDF. Its `attachment_path` is a bare storage relPath, so
 * it goes through `resolveFileUrl()` and then `downloadAndSave()`, which
 * attaches the student's token: `/api/files/*` is authenticated, and handing the
 * URL to the device browser instead would come back 401.
 */
export default function NoticesScreen() {
  const result = useNotices();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryListView loadMoreLabel="Load older notices" result={result} loadingLabel="Loading notices…">
        {(data) =>
          data.length === 0 ? (
            <EmptyState
              icon="megaphone-outline"
              title="No notices"
              subtitle="Announcements from your school will appear here."
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {data.map((row) => (
                <NoticeCard key={row.id} row={row} />
              ))}
            </View>
          )
        }
      </QueryListView>
    </ScrollView>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function NoticeCard({ row }: { row: NoticeRow }) {
  const [downloading, setDownloading] = useState(false);
  const fileUrl = resolveFileUrl(row.attachment_path);

  async function download() {
    if (!fileUrl) return;
    setDownloading(true);
    await downloadAndSave(fileUrl, row.attachment_name ?? `${row.title}.pdf`);
    setDownloading(false);
  }

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <View style={styles.ic}>
          <Ionicons name="megaphone-outline" size={18} color={palette.accent600} />
        </View>
        <View style={styles.headText}>
          <View style={styles.titleRow}>
            {row.pinned ? <Ionicons name="pin" size={14} color={palette.accent600} /> : null}
            <Text style={styles.title}>{row.title}</Text>
          </View>
          <Text style={styles.meta}>
            {prettyDate(row.published_at ?? row.created_at)}
            {row.posted_by ? ` · ${row.posted_by}` : ""}
          </Text>
        </View>
      </View>

      <Text style={styles.body}>{row.body}</Text>

      {row.expires_at ? (
        <Text style={styles.meta}>Valid till {prettyDate(row.expires_at)}</Text>
      ) : null}

      {fileUrl ? (
        <Pressable onPress={download} disabled={downloading} style={styles.attach}>
          {downloading ? (
            <ActivityIndicator size="small" color={colors.navy} />
          ) : (
            <Ionicons name="document-attach-outline" size={18} color={colors.navy} />
          )}
          <Text style={styles.attachText} numberOfLines={1}>
            {row.attachment_name ?? "Attachment"}
          </Text>
          <Ionicons name="download-outline" size={18} color={colors.navy} />
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  ic: {
    width: 34, height: 34, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center", backgroundColor: palette.accent100,
  },
  headText: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  title: { ...typography.body, fontWeight: "700" as const, color: colors.navy, flexShrink: 1 },
  meta: { ...typography.caption, color: colors.textMuted },
  body: { ...typography.body, color: colors.text },
  attach: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  attachText: { ...typography.caption, color: colors.navy, flex: 1, fontWeight: "600" as const },
});
