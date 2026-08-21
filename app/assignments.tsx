import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAssignments, useSubmitAssignment } from "@/api/hooks";
import { Card, Pill } from "@/components/ui";
import {
  ListCard,
  DateChip,
  IconTile,
  CardHead,
  CardFooter,
  CardAction,
  CardDescription,
  groupStyle,
  type MetaItem,
} from "@/components/list-card";
import { QueryListView } from "@/components/QueryView";
import { EmptyState, SectionHeader } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";
import { shortDate } from "@/lib/format";
import type { AssignmentRow } from "@/api/student-types";

/**
 * Assignments (mock 9, Phase 3). One `/assignments` call returns the student's
 * work active-first; each row shows its status, deadline and (once graded) marks,
 * with a one-tap "Mark as submitted" action and an optional link-out. We split the
 * list into "To do" vs "Completed" so the student sees what still needs action up top.
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
      <QueryListView loadMoreLabel="Load more assignments" result={result} feature="student.assignments">
        {(data) => {
          if (data.length === 0) {
            return (
              <Card>
                <EmptyState
                  icon="clipboard-outline"
                  title="No assignments"
                  subtitle="Assignments shared by the consultant will show up here as they're added."
                />
              </Card>
            );
          }

          const todo = data.filter(isTodo);
          const done = data.filter((a) => !isTodo(a));

          return (
            <>
              {todo.length > 0 ? (
                <View style={groupStyle}>
                  <SectionHeader title="To do" />
                  {todo.map((a) => (
                    <AssignmentCard key={a.id} a={a} submit={submit} />
                  ))}
                </View>
              ) : null}

              {done.length > 0 ? (
                <View style={groupStyle}>
                  <SectionHeader title="Completed" />
                  {done.map((a) => (
                    <AssignmentCard key={a.id} a={a} submit={submit} />
                  ))}
                </View>
              ) : null}
            </>
          );
        }}
      </QueryListView>
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  function onSubmit() {
    setSubmitError(null);
    submit.mutate(a.id, {
      // Surface failures — otherwise the spinner just stops and the student
      // wrongly believes the assignment was submitted (audit H6).
      onError: (e) =>
        setSubmitError(
          e instanceof Error && e.message
            ? e.message
            : "Couldn't mark as submitted. Please try again."
        ),
    });
  }

  const meta: MetaItem[] = [];
  if (due) {
    // An overdue date is the one meta line that must not read as neutral.
    meta.push(
      overdue
        ? { icon: "alert-circle", text: `Due ${shortDate(due)} · Overdue`, color: colors.danger }
        : { icon: "calendar-outline", text: `Due ${shortDate(due)}` },
    );
  } else if (overdue) {
    meta.push({ icon: "alert-circle", text: "Overdue", color: colors.danger });
  }
  if (graded) {
    meta.push({
      icon: "ribbon-outline",
      text: `${a.marks_obtained ?? "—"}/${a.total_marks ?? "—"} marks`,
    });
  }

  return (
    <ListCard>
      <CardHead
        left={<DateChip iso={a.deadline} />}
        title={a.title}
        meta={meta}
        right={<IconTile icon="clipboard-outline" tone={pill.tone} />}
      />

      {a.description ? <CardDescription text={a.description} numberOfLines={2} /> : null}

      <CardFooter
        left={<Pill label={pill.label} tone={pill.tone} />}
        right={
          <View style={styles.actions}>
            {a.assignment_link ? (
              <CardAction
                icon="open-outline"
                label="Open"
                onPress={() => { if (a.assignment_link) Linking.openURL(a.assignment_link); }}
              />
            ) : null}
            {isTodo(a) ? (
              <CardAction
                icon="checkmark-circle-outline"
                label="Submit"
                tone="gold"
                loading={submitting}
                onPress={onSubmit}
              />
            ) : null}
          </View>
        }
      />

      {submitError ? (
        <View style={styles.errRow}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.errText}>{submitError}</Text>
        </View>
      ) : null}
    </ListCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  actions: { flexDirection: "row", gap: spacing.sm },

  errRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.xs },
  errText: { ...typography.label, color: colors.danger, flex: 1 },
});
