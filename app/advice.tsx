import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import { useAdvice, useFeedback } from "@/api/hooks";
import { Button, Card, Pill } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { EmptyState, SectionHeader, ProvenanceBadge } from "@/components/data-ui";
import { shortDate } from "@/lib/format";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { AdviceRow, TeacherFeedbackRow } from "@/api/student-types";

/**
 * Advice & Feedback (Phase 3). Two independent data sources: the student's own
 * advice thread with their assigned consultant (writable via /ask-advice) and a
 * read-only stream of teacher feedback. The advice list drives the QueryView
 * boundary; teacher feedback renders inline so a locked/slow feedback resource
 * never blocks the primary thread.
 */
export default function AdviceScreen() {
  const router = useRouter();
  const adviceResult = useAdvice();
  const feedbackResult = useFeedback();

  const feedback = feedbackResult.locked ? [] : feedbackResult.query.data ?? [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl
          refreshing={adviceResult.query.isRefetching}
          onRefresh={() => adviceResult.query.refetch()}
        />
      }
    >
      <Button label="Ask Consultant" onPress={() => router.push("/ask-advice")} />

      <QueryView result={adviceResult} feature="student.advice">
        {(rows) => <AdviceThread rows={rows} />}
      </QueryView>

      {!feedbackResult.locked ? (
        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Consultant feedback" />
          {feedback.length === 0 ? (
            <Card>
              <EmptyState
                icon="chatbox-ellipses-outline"
                title="No feedback yet"
                subtitle="Notes the consultant shares about the work will appear here."
              />
            </Card>
          ) : (
            feedback.map((f) => <FeedbackCard key={f.id} item={f} />)
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

// ── Advice thread ────────────────────────────────────────────────────────────
function AdviceThread({ rows }: { rows: AdviceRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No requests yet"
          subtitle="Ask the consultant for advice and their replies will show up here as a thread."
        />
      </Card>
    );
  }
  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row) => (
        <AdviceCard key={row.id} row={row} />
      ))}
    </View>
  );
}

function AdviceCard({ row }: { row: AdviceRow }) {
  const answered = hasReply(row);
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.cardHead}>
        <Pill
          label={answered ? "Answered" : "Pending"}
          tone={answered ? "green" : "amber"}
        />
        <Text style={styles.date}>{dateLabel(row.created_at)}</Text>
      </View>

      <View style={styles.ownRow}>
        <View style={[styles.bubble, styles.ownBubble]}>
          <Text style={styles.ownText}>{row.message ?? "—"}</Text>
          {row.preferred_time ? (
            <Text style={styles.ownMeta}>Preferred: {row.preferred_time}</Text>
          ) : null}
        </View>
      </View>

      {answered ? (
        <View style={styles.replyRow}>
          <View style={[styles.bubble, styles.replyBubble]}>
            <Text style={styles.replyLabel}>Consultant</Text>
            <Text style={styles.replyText}>{row.feedback}</Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function FeedbackCard({ item }: { item: TeacherFeedbackRow }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.cardHead}>
        <Text style={styles.feedbackTitle}>{item.subject ?? "Feedback"}</Text>
        <Text style={styles.date}>{dateLabel(item.created_at)}</Text>
      </View>
      {item.feedback ? <Text style={styles.feedbackBody}>{item.feedback}</Text> : null}
      <ProvenanceBadge name={item.teacher_name} />
    </Card>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function hasReply(row: AdviceRow): boolean {
  if (row.feedback && row.feedback.trim()) return true;
  const s = row.status?.toLowerCase();
  return s === "replied" || s === "answered";
}

/** created_at is a full timestamp; slice to YYYY-MM-DD before formatting. */
function dateLabel(ts: string | null | undefined): string {
  if (!ts) return "";
  return shortDate(ts.slice(0, 10));
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  date: { ...typography.caption, color: colors.textMuted },

  ownRow: { alignItems: "flex-end" },
  replyRow: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "88%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ownBubble: { backgroundColor: palette.primary600, borderBottomRightRadius: radius.sm },
  ownText: { ...typography.body, color: colors.textInverse },
  ownMeta: { ...typography.caption, color: palette.primary200, marginTop: spacing.xs },
  replyBubble: {
    backgroundColor: palette.primary50,
    borderBottomLeftRadius: radius.sm,
  },
  replyLabel: {
    ...typography.caption,
    color: colors.navy,
    fontWeight: "800",
    marginBottom: 2,
  },
  replyText: { ...typography.body, color: colors.ink },

  feedbackTitle: { ...typography.h2, fontSize: 15, color: colors.ink, flex: 1 },
  feedbackBody: { ...typography.body, color: colors.textMuted },
});
