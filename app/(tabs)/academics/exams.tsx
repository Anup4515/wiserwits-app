import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useExams } from "@/api/hooks";
import { FEATURE } from "@/lib/features";
import { Card, Pill } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { EmptyState } from "@/components/data-ui";
import { dateRange } from "@/lib/format";
import { colors, palette, spacing, radius, typography, shadow } from "@/theme";
import type { ExamRow } from "@/api/student-types";

/**
 * Exams & Marks (mock 5) — the exam list. Tapping an exam pushes the Marks
 * detail. Enrolled exams carry a real status (upcoming/in progress/completed);
 * self exams are always completed (derived from recorded marks).
 */
export default function ExamsScreen() {
  const result = useExams();
  const { query } = result;
  const router = useRouter();

  const openExam = (exam: ExamRow) => {
    router.push({
      pathname: "/(tabs)/academics/marks",
      params: { id: String(exam.id), name: exam.name, status: exam.status },
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} feature={FEATURE.exams}>
        {(exams) =>
          exams.length === 0 ? (
            <Card>
              <EmptyState icon="reader-outline" title="No exams yet" subtitle="Exams appear here once they're scheduled or recorded." />
            </Card>
          ) : (
            <View style={{ gap: spacing.md }}>
              {exams.map((exam) => (
                <Pressable
                  key={`${exam.id}-${exam.name}`}
                  onPress={() => openExam(exam)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
                >
                  <View style={styles.icon}>
                    <Ionicons name="reader-outline" size={20} color={colors.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{exam.name}</Text>
                    <Text style={styles.nameCount}>
                      {`${exam.subject_count} subject${exam.subject_count === 1 ? "" : "s"}`}
                    </Text>
                    {dateRange(exam.start_date, exam.end_date) ? (
                      <Text style={styles.meta}>{dateRange(exam.start_date, exam.end_date)}</Text>
                    ) : null}
                  </View>
                  <StatusPill status={exam.status} />
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "in_progress") return <Pill label="Ongoing" tone="amber" />;
  if (s === "upcoming") return <Pill label="Upcoming" tone="blue" />;
  if (s === "completed") return <Pill label="Completed" tone="green" />;
  return null;
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  icon: {
    width: 42, height: 42, borderRadius: radius.md, backgroundColor: palette.primary50,
    alignItems: "center", justifyContent: "center",
  },
  name: { ...typography.h2, fontSize: 17, color: colors.ink },
  nameCount: { ...typography.caption, fontWeight: "500", color: colors.textMuted, marginTop: 2 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
