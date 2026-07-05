import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useInsights } from "@/api/hooks";
import { Card } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { SourceBadge, SectionHeader, EmptyState } from "@/components/data-ui";
import { ProgressRing, TrendChart, BarRow } from "@/components/charts";
import { shortMonth, longMonth, scoreColor } from "@/lib/format";
import { gradients, colors, spacing, radius, typography } from "@/theme";
import type { InsightsData } from "@/api/student-types";

/**
 * Insights (mock 3) — the retention screen. Grade ring, attendance trend,
 * holistic bars, strengths/focus and a single "insight of the day", all from
 * one `/insights` aggregate. Works for enrolled and independent students.
 */
export default function InsightsScreen() {
  const result = useInsights();
  const { query } = result;

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <SafeAreaView edges={["top"]}>
          <Text style={styles.heroTitle}>Insights</Text>
          <Text style={styles.heroSub}>A quick read on how things are going</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
        }
      >
        <QueryView result={result} feature="student insights">
          {(data, source) => <InsightsBody data={data} source={source} />}
        </QueryView>
      </ScrollView>
    </View>
  );
}

function InsightsBody({ data, source }: { data: InsightsData; source: "enrolled" | "self" }) {
  const insight = data.insight_of_the_day;
  const insightTone =
    insight.tone === "positive" ? colors.green : insight.tone === "warning" ? colors.amber : colors.blue;
  const insightBg =
    insight.tone === "positive" ? colors.greenBg : insight.tone === "warning" ? colors.amberBg : colors.blueBg;

  return (
    <>
      <View style={styles.rowBetween}>
        <SourceBadge source={source} />
      </View>

      {/* Insight of the day */}
      <Card style={[styles.insightCard, { backgroundColor: insightBg, borderColor: insightBg }]}>
        <View style={styles.insightHead}>
          <Ionicons
            name={insight.tone === "warning" ? "alert-circle" : "sparkles"}
            size={16}
            color={insightTone}
          />
          <Text style={[styles.insightKicker, { color: insightTone }]}>Insight for you</Text>
        </View>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightBody}>{insight.body}</Text>
      </Card>

      {/* Overall + attendance rings */}
      <View style={styles.ringRow}>
        <Card style={styles.ringCard}>
          <Text style={styles.ringCap}>Overall</Text>
          <ProgressRing
            value={data.overall.percentage}
            size={116}
            color={colors.navy}
            centerLabel={data.overall.grade ?? "—"}
            centerSub={data.overall.percentage != null ? `${data.overall.percentage}%` : "No marks"}
          />
          <Text style={styles.ringFoot}>{data.overall.exams_counted} subjects</Text>
        </Card>
        <Card style={styles.ringCard}>
          <Text style={styles.ringCap}>Attendance</Text>
          <ProgressRing
            value={data.attendance.percentage}
            size={116}
            color={scoreColor(data.attendance.percentage)}
            centerSub={`${data.attendance.present}/${data.attendance.total} days`}
          />
          <Text style={styles.ringFoot}>overall present</Text>
        </Card>
      </View>

      {/* Attendance trend */}
      <Card>
        <SectionHeader title="Attendance trend" />
        {data.attendance.trend.length === 0 ? (
          <Text style={styles.muted}>No attendance history yet.</Text>
        ) : (
          <TrendChart
            points={data.attendance.trend.map((p) => ({ label: shortMonth(p.month), value: p.percentage }))}
            color={colors.navy}
          />
        )}
      </Card>

      {/* Holistic bars */}
      {data.holistic.dimensions.length > 0 ? (
        <Card>
          <SectionHeader title="Holistic development" />
          {data.holistic.month ? (
            <Text style={styles.subtle}>{longMonth(data.holistic.month)}</Text>
          ) : null}
          <View style={{ height: spacing.sm }} />
          {data.holistic.dimensions.map((d) => (
            <BarRow key={d.name} label={d.name} value={d.pct} color={scoreColor(d.pct)} />
          ))}
        </Card>
      ) : null}

      {/* Strengths & focus */}
      {data.strengths.length > 0 || data.focus.length > 0 ? (
        <Card style={{ gap: spacing.lg }}>
          {data.strengths.length > 0 ? (
            <View>
              <Text style={styles.chipsHead}>💪 Strengths</Text>
              <View style={styles.chips}>
                {data.strengths.map((s) => (
                  <SubjectChip key={s.subject} subject={s.subject} pct={s.percentage} />
                ))}
              </View>
            </View>
          ) : null}
          {data.focus.length > 0 ? (
            <View>
              <Text style={styles.chipsHead}>🎯 Focus areas</Text>
              <View style={styles.chips}>
                {data.focus.map((s) => (
                  <SubjectChip key={s.subject} subject={s.subject} pct={s.percentage} />
                ))}
              </View>
            </View>
          ) : null}
        </Card>
      ) : null}

      {data.overall.exams_counted === 0 && data.attendance.total === 0 ? (
        <Card>
          <EmptyState
            icon="sparkles-outline"
            title="Insights are on the way"
            subtitle="As marks, attendance and holistic ratings are recorded, this screen fills in."
          />
        </Card>
      ) : null}
    </>
  );
}

function SubjectChip({ subject, pct }: { subject: string; pct: number }) {
  return (
    <View style={styles.subjectChip}>
      <Text style={styles.subjectChipName}>{subject}</Text>
      <Text style={[styles.subjectChipPct, { color: scoreColor(pct) }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTitle: { color: colors.textInverse, fontSize: 24, fontWeight: "800", marginTop: spacing.sm },
  heroSub: { color: "#b9c0e0", fontSize: 13, fontWeight: "600", marginTop: 3 },

  scroll: { flex: 1 },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  muted: { ...typography.body, color: colors.textMuted },
  subtle: { ...typography.caption, color: colors.textMuted },

  insightCard: { gap: spacing.xs },
  insightHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  insightKicker: { ...typography.label, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  insightTitle: { ...typography.h2, color: colors.ink },
  insightBody: { ...typography.body, color: colors.text },

  ringRow: { flexDirection: "row", gap: spacing.md },
  ringCard: { flex: 1, alignItems: "center", gap: spacing.sm },
  ringCap: { ...typography.label, color: colors.textMuted, alignSelf: "flex-start" },
  ringFoot: { ...typography.caption, color: colors.textMuted },

  chipsHead: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  subjectChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7,
  },
  subjectChipName: { ...typography.label, color: colors.text },
  subjectChipPct: { ...typography.label, fontWeight: "800" },
});
