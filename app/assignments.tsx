import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAssignments, useSubmitAssignment } from "@/api/hooks";
import { Card, Pill, Button } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { EmptyState, SectionHeader } from "@/components/data-ui";
import { colors, spacing, radius, typography } from "@/theme";
import { shortDate } from "@/lib/format";
import type { AssignmentRow } from "@/api/student-types";

/**
 * Assignments (mock 9, Phase 3). One `/assignments` call returns the student's
 * work active-first; each row shows its status, deadline and (once graded) marks,
 * with a one-tap "Mark as submitted" action and an optional link-out. We split the
 * list into "To do" vs "Done" so the student sees what still needs action up top.
 */
type PillState = { tone: "amber" | "blue" | "green" | "red"; label: string };

function pillFor(status: string | null): PillState {
  switch (status) {
    case "submitted": return { tone: "blue", label: "Submitted" };
    case "approved": return { tone: "green", label: "Approved" };
    case "rejected": return { tone: "red", label: "Rejected" };
    default: return { tone: "amber", label: "To do" };
  }
}

/** Still awaiting the student — the "Mark as submitted" action applies. */
function isTodo(a: AssignmentRow): boolean {
  return a.assignment_status == null || a.assignment_status === "pending";
}

function ymd(iso: string | null): string | null {
  return iso ? iso.slice(0, 10) : null;
}

function isOverdue(a: AssignmentRow): boolean {
  const due = ymd(a.deadline);
  if (!due || !isTodo(a)) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return due < todayStr;
}

export default function AssignmentsScreen() {
  const result = useAssignments();
  const { query } = result;
  const submit = useSubmitAssignment();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} feature="student.assignments">
        {(data) => {
          if (data.length === 0) {
            return (
              <Card>
                <EmptyState
                  icon="clipboard-outline"
                  title="No assignments"
                  subtitle="Assignments shared by your consultant will show up here as they're added."
                />
              </Card>
            );
          }

          const todo = data.filter(isTodo);
          const done = data.filter((a) => !isTodo(a));

          return (
            <>
              {todo.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="To do" />
                  {todo.map((a) => (
                    <AssignmentCard key={a.id} a={a} submit={submit} />
                  ))}
                </View>
              ) : null}

              {done.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title="Done" />
                  {done.map((a) => (
                    <AssignmentCard key={a.id} a={a} submit={submit} />
                  ))}
                </View>
              ) : null}
            </>
          );
        }}
      </QueryView>
    </ScrollView>
  );
}

function AssignmentCard({
  a,
  submit,
}: {
  a: AssignmentRow;
  submit: ReturnType<typeof useSubmitAssignment>;
}) {
  const pill = pillFor(a.assignment_status);
  const overdue = isOverdue(a);
  const due = ymd(a.deadline);
  const graded = a.marks_obtained != null || a.total_marks != null;
  const submitting = submit.isPending && submit.variables === a.id;

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <Text style={styles.title}>{a.title}</Text>
        <Pill label={pill.label} tone={pill.tone} />
      </View>

      {a.description ? (
        <Text style={styles.desc} numberOfLines={2}>{a.description}</Text>
      ) : null}

      <View style={styles.metaRow}>
        {due ? (
          <View style={styles.meta}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>Due {shortDate(due)}</Text>
          </View>
        ) : null}
        {overdue ? (
          <View style={styles.meta}>
            <Ionicons name="alert-circle" size={13} color={colors.danger} />
            <Text style={[styles.metaText, { color: colors.danger }]}>Overdue</Text>
          </View>
        ) : null}
        {graded ? (
          <View style={styles.meta}>
            <Ionicons name="ribbon-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {`${a.marks_obtained ?? "—"}/${a.total_marks ?? "—"}`}
            </Text>
          </View>
        ) : null}
      </View>

      {(a.assignment_link || isTodo(a)) ? (
        <View style={styles.actions}>
          {a.assignment_link ? (
            <View style={styles.action}>
              <Button
                label="Open link"
                variant="secondary"
                onPress={() => { if (a.assignment_link) Linking.openURL(a.assignment_link); }}
              />
            </View>
          ) : null}
          {isTodo(a) ? (
            <View style={styles.action}>
              <Button
                label="Mark as submitted"
                loading={submitting}
                onPress={() => submit.mutate(a.id)}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  section: { gap: spacing.md },

  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  title: { ...typography.h2, color: colors.ink, flex: 1 },
  desc: { ...typography.body, color: colors.textMuted },

  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { ...typography.label, color: colors.textMuted },

  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1 },
});
