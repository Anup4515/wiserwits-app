import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { useMarks } from "@/api/hooks";
import { FEATURE } from "@/lib/features";
import { Card } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { SectionHeader, EmptyState } from "@/components/data-ui";
import { ProgressRing } from "@/components/charts";
import { time12, shortDate, scoreColor, gradeColor, isGraded, num } from "@/lib/format";
import { colors, spacing, radius, typography } from "@/theme";
import type { ExamRow, MarksData } from "@/api/student-types";

/**
 * Marks detail (mock 5) — one exam's subject-by-subject results with a summary
 * ring, plus the exam schedule (enrolled only; self returns an empty schedule).
 * The exam is passed via route params from the Exams list; `useMarks` keys by
 * `exam_id` (enrolled) or `exam` name (self) depending on the active source.
 */
export default function MarksScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string; status?: string }>();
  const exam: ExamRow | null = params.name
    ? {
        id: Number(params.id ?? 0),
        name: params.name,
        code: null,
        start_date: null,
        end_date: null,
        status: params.status ?? "completed",
        subject_count: 0,
      }
    : null;

  const result = useMarks(exam);
  const { query } = result;

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <Stack.Screen options={{ title: exam?.name ?? "Marks" }} />
      <QueryView result={result} feature={FEATURE.marks}>
        {(data) => <MarksBody data={data} />}
      </QueryView>
    </ScrollView>
  );
}

function MarksBody({ data }: { data: MarksData }) {
  if (data.marks.length === 0) {
    return (
      <Card>
        <EmptyState icon="reader-outline" title="No marks recorded" subtitle="This exam has no subject marks yet." />
      </Card>
    );
  }

  const sched = new Map(data.schedule.map((s) => [s.subject_id, s]));

  return (
    <>
      {/* Summary */}
      <Card style={styles.summary}>
        <ProgressRing
          value={data.summary.percentage}
          size={116}
          color={scoreColor(data.summary.percentage)}
          centerLabel={
            isGraded(data.summary.grade)
              ? data.summary.grade!
              : `${Math.round(data.summary.percentage)}%`
          }
          centerSub={`${num(data.summary.total_obtained)}/${num(data.summary.total_max)}`}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.summaryTitle}>Overall</Text>
          {/* The ring already shows the % when there's no grade — only repeat it
              here as the numeric companion to a grade, so it never doubles up. */}
          {isGraded(data.summary.grade) ? (
            <Text style={styles.summaryPct}>{Math.round(data.summary.percentage)}%</Text>
          ) : null}
          <Text style={styles.summarySub}>
            {num(data.summary.total_obtained)} out of {num(data.summary.total_max)} marks
          </Text>
        </View>
      </Card>

      <View style={{ height: spacing.lg }} />
      <SectionHeader title="Subjects" />
      <Card style={{ paddingVertical: spacing.xs }}>
        {data.marks.map((m, i) => {
          const s = sched.get(m.subject_id);
          const absent = m.is_absent === 1;
          return (
            <View key={m.id} style={[styles.subjectRow, i > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectName}>{m.subject_name}</Text>
                {s?.exam_date ? (
                  <Text style={styles.subjectMeta}>
                    {shortDate(s.exam_date)}
                    {s.exam_time ? ` · ${time12(s.exam_time)}` : ""}
                    {s.room_number ? ` · Room ${s.room_number}` : ""}
                  </Text>
                ) : null}
              </View>
              {absent ? (
                <Text style={styles.absent}>Absent</Text>
              ) : (
                <>
                  <Text style={styles.marks}>
                    {num(m.obtained_marks)}
                    <Text style={styles.marksMax}> / {num(m.maximum_marks)}</Text>
                  </Text>
                  {isGraded(m.grade) ? (
                    <View style={[styles.gradeChip, { backgroundColor: gradeColor(m.grade) }]}>
                      <Text style={styles.gradeChipText}>{m.grade}</Text>
                    </View>
                  ) : m.percentage != null ? (
                    <Text style={[styles.pctText, { color: scoreColor(m.percentage) }]}>
                      {Math.round(m.percentage)}%
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          );
        })}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  summaryTitle: { ...typography.label, color: colors.textMuted },
  summaryPct: { fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -1 },
  summarySub: { ...typography.caption, color: colors.textMuted },

  subjectRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  subjectName: { ...typography.label, color: colors.ink, fontSize: 13.5 },
  subjectMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  marks: { fontSize: 15, fontWeight: "800", color: colors.ink },
  marksMax: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  pctText: { ...typography.label, fontWeight: "800", minWidth: 40, textAlign: "right" },
  absent: { ...typography.label, color: colors.red, fontWeight: "800" },
  gradeChip: { borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 2, minWidth: 26, alignItems: "center" },
  gradeChipText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
