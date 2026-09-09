import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";

import { useFeedback } from "@/api/hooks";
import { downloadAndSave, resolveFileUrl } from "@/lib/download";
import { QueryView } from "@/components/QueryView";
import { Card, Button } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";
import type { TeacherFeedbackRow } from "@/api/student-types";

/** Consultant feedback (Phase 4.7). Read-only, plan-gated stream of consultant notes. */
export default function FeedbackScreen() {
  const result = useFeedback();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} feature="student.feedback" loadingLabel="Loading feedback…">
        {(data) =>
          data.length === 0 ? (
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="No feedback yet"
              subtitle="Feedback the consultant shares about the work will appear here."
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {data.map((row) => (
                <FeedbackCard key={row.id} item={row} />
              ))}
            </View>
          )
        }
      </QueryView>
    </ScrollView>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function FeedbackCard({ item }: { item: TeacherFeedbackRow }) {
  const meta = [item.teacher_name, prettyDate(item.created_at)].filter(Boolean).join(" · ");
  const [downloading, setDownloading] = useState(false);
  // `file_path` is a BARE storage relPath, so it needs resolveFileUrl() plus the
  // Bearer token downloadAndSave() attaches — /api/files 401s without it, and
  // Linking.openURL could only ever answer "this link can't be opened".
  const fileUrl = resolveFileUrl(item.file_path);

  async function download() {
    if (!fileUrl) return;
    setDownloading(true);
    const ext = item.file_path?.split("?")[0].match(/\.[a-z0-9]+$/i)?.[0] ?? "";
    await downloadAndSave(fileUrl, `${item.subject || "feedback"}${ext.toLowerCase()}`);
    setDownloading(false);
  }

  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={styles.title}>{item.subject ?? "Feedback"}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {item.feedback ? <Text style={styles.body}>{item.feedback}</Text> : null}
      {fileUrl ? (
        <Button
          label={downloading ? "Downloading…" : "Download attachment"}
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

  title: { ...typography.h2, color: colors.ink },
  meta: { ...typography.caption, color: colors.textMuted },
  body: { ...typography.body, color: colors.text },
});
