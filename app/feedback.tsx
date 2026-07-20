import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking, Alert } from "react-native";

import { useFeedback } from "@/api/hooks";
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
              subtitle="Feedback your consultant shares about your work will appear here."
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

async function openLink(url: string) {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (ok) {
    await Linking.openURL(url);
  } else {
    Alert.alert("Can't open", "This link can't be opened on your device.");
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function FeedbackCard({ item }: { item: TeacherFeedbackRow }) {
  const meta = [item.teacher_name, prettyDate(item.created_at)].filter(Boolean).join(" · ");
  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={styles.title}>{item.subject ?? "Feedback"}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {item.feedback ? <Text style={styles.body}>{item.feedback}</Text> : null}
      {item.file_path ? (
        <Button
          label="View attachment"
          variant="secondary"
          onPress={() => openLink(item.file_path as string)}
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
