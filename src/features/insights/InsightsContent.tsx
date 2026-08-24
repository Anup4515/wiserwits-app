import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";

import { useInsights } from "@/api/hooks";
import { Card, Pill } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { SourceBadge, SectionHeader, EmptyState, StatTile } from "@/components/data-ui";
import { ProgressRing, TrendChart, BarRow } from "@/components/charts";
import { bmiCategory } from "@/features/health/sections";
import { shortMonth, longMonth, scoreColor, pct } from "@/lib/format";
import { colors, palette, spacing, typography } from "@/theme";
import type { InsightsData } from "@/api/student-types";

/**
 * The Insights cards (grade & attendance rings, trends, holistic, subjects,
 * wellness, learning) WITHOUT the screen chrome — so it can be dropped into
 * both the dedicated /insights screen and the Home tab. Owns its own
 * `useInsights` query (React Query dedupes by key, so rendering it alongside
 * the screen's own useInsights makes just one network call).
 */
export function InsightsContent({
  showSourceBadge = true,
  showInsightOfDay = true,
}: {
  showSourceBadge?: boolean;
  showInsightOfDay?: boolean;
} = {}) {
  const result = useInsights();
  return (
    <QueryView result={result} feature="student insights">
      {(data, source) => (
        <InsightsBody
          data={data}
          source={source}
          showSourceBadge={showSourceBadge}
          showInsightOfDay={showInsightOfDay}
        />
      )}
    </QueryView>
  );
}

function InsightsBody({
  data,
  source,
  showSourceBadge,
  showInsightOfDay,
}: {
  data: InsightsData;
  source: "enrolled" | "self";
  showSourceBadge: boolean;
  showInsightOfDay: boolean;
}) {
  const insight = data.insight_of_the_day;
  const insightTone =
    insight.tone === "positive" ? colors.green : insight.tone === "warning" ? colors.amber : colors.blue;
  const insightBg =
    insight.tone === "positive" ? colors.greenBg : insight.tone === "warning" ? colors.amberBg : colors.blueBg;

  return (
    <View style={{ gap: spacing.lg }}>
      {showSourceBadge ? (
        <View style={styles.rowBetween}>
          <SourceBadge source={source} />
        </View>
      ) : null}

      {/* Insight of the day */}
      {showInsightOfDay ? (
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
      ) : null}

      {/* Overall + attendance rings */}
      <View style={styles.ringRow}>
        <Card style={styles.ringCard}>
          <Text style={styles.ringCap}>Overall</Text>
          <ProgressRing
            value={data.overall.percentage}
            size={116}
            color={colors.navy}
            centerLabel={data.overall.grade ?? "—"}
            centerSub={data.overall.percentage != null ? pct(data.overall.percentage) : "No marks"}
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
          <Text style={styles.ringFoot}>{source === "enrolled" ? "This session" : "Overall"}</Text>
        </Card>
      </View>

      {/* Attendance trend */}
      <Card>
        <SectionHeader title="Attendance trend" />
        {data.attendance.trend.length === 0 ? (
          <Text style={styles.muted}>No attendance history yet.</Text>
        ) : (
          <>
            <Text style={styles.subtle}>Monthly · {trendRange(data.attendance.trend)}</Text>
            <View style={{ height: spacing.sm }} />
            <TrendChart
              points={data.attendance.trend.map((p) => ({ label: shortMonth(p.month), value: p.percentage }))}
              color={colors.navy}
            />
          </>
        )}
      </Card>

      {/* Holistic bars */}
      {data.holistic.dimensions.length > 0 ? (
        <Card>
          <SectionHeader title="Holistic development" />
          {data.holistic.month ? <Text style={styles.subtle}>{longMonth(data.holistic.month)}</Text> : null}
          <View style={{ height: spacing.sm }} />
          {data.holistic.dimensions.map((d) => (
            <BarRow key={d.name} label={d.name} value={d.pct} color={scoreColor(d.pct)} />
          ))}
        </Card>
      ) : null}

      {/* Subject performance */}
      {data.subjects.length > 0 ? (
        <Card>
          <SectionHeader title="Subject performance" />
          <View style={{ height: spacing.sm }} />
          {data.subjects.map((s) => (
            <BarRow
              key={s.subject}
              label={s.subject}
              value={s.percentage}
              valueLabel={pct(s.percentage)}
              color={scoreColor(s.percentage)}
            />
          ))}
          {needsAttention(data.subjects).length > 0 ? (
            <View style={styles.attentionRow}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.amber} />
              <Text style={styles.attentionText}>
                Needs attention: {needsAttention(data.subjects).map((s) => s.subject).join(", ")}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {data.wellness ? <WellnessCard data={data.wellness} /> : null}
      {data.learning ? <LearningCard data={data.learning} /> : null}

      {data.overall.exams_counted === 0 && data.attendance.total === 0 ? (
        <Card>
          <EmptyState
            icon="sparkles-outline"
            title="Insights are on the way"
            subtitle="As marks, attendance and holistic ratings are recorded, this screen fills in."
          />
        </Card>
      ) : null}
    </View>
  );
}

function WellnessCard({ data }: { data: InsightsData["wellness"] }) {
  const router = useRouter();
  const bmi = data.latest_bmi;
  const cat = bmi ? bmiCategory(bmi.bmi) : null;
  const hasCounts = data.consultations_count + data.diet_plans_count + data.lab_reports_count > 0;
  if (!bmi && !hasCounts) return null;

  return (
    <Card style={{ gap: spacing.sm }}>
      <SectionHeader title="Wellness" action="View" onAction={() => router.push("/(tabs)/health")} />
      {bmi ? (
        <>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.bmiBig}>{bmi.bmi.toFixed(1)}</Text>
              <Text style={styles.subtle}>Latest BMI</Text>
            </View>
            {cat ? <Pill label={cat.label} tone={cat.tone} /> : null}
          </View>
          {data.bmi_trend.length > 1 ? (
            <TrendChart
              points={data.bmi_trend.map((p) => ({ label: shortMonth(p.date.slice(0, 7)), value: p.bmi }))}
              color={colors.navy}
              domain="auto"
              formatValue={(v) => v.toFixed(1)}
            />
          ) : null}
        </>
      ) : (
        <Text style={styles.muted}>No BMI readings yet.</Text>
      )}
      <View style={styles.tileRow}>
        <StatTile label="Consultations" value={String(data.consultations_count)} icon="medkit-outline" tint={colors.greenBg} fg={colors.green} />
        <StatTile label="Diet plans" value={String(data.diet_plans_count)} icon="nutrition-outline" tint={palette.accent100} fg={palette.accent600} />
        <StatTile label="Lab reports" value={String(data.lab_reports_count)} icon="flask-outline" tint={colors.amberBg} fg={colors.amber} />
      </View>
    </Card>
  );
}

function LearningCard({ data }: { data: InsightsData["learning"] }) {
  const router = useRouter();
  const live = data.next_live_class;
  if (data.courses_enrolled === 0 && data.certificates === 0 && !live) return null;

  return (
    <Card style={{ gap: spacing.sm }}>
      <SectionHeader title="Learning" action="View" onAction={() => router.push("/(tabs)/learning" as Href)} />
      <View style={styles.tileRow}>
        <StatTile label="Courses" value={String(data.courses_enrolled)} icon="school-outline" tint={colors.blueBg} fg={colors.blue} />
        <StatTile label="Certificates" value={String(data.certificates)} icon="ribbon-outline" tint={palette.accent100} fg={palette.accent600} />
      </View>
      {live ? (
        <View style={styles.liveRow}>
          <Ionicons name="videocam-outline" size={15} color={colors.red} />
          <Text style={styles.liveText} numberOfLines={1}>
            Next live class: {live.title} · {shortMonth(live.start_time.slice(0, 7))} {live.start_time.slice(8, 10)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function monthYear(ym: string): string {
  return `${shortMonth(ym)} ${ym.slice(0, 4)}`;
}

const ATTENTION_BELOW = 50;
function needsAttention(subjects: { subject: string; percentage: number }[]) {
  return subjects.filter((s) => s.percentage < ATTENTION_BELOW);
}

function trendRange(trend: { month: string; percentage: number }[]): string {
  if (trend.length === 0) return "";
  const first = trend[0].month;
  const last = trend[trend.length - 1].month;
  if (first === last) return monthYear(first);
  const crossesYear = first.slice(0, 4) !== last.slice(0, 4);
  return crossesYear ? `${monthYear(first)} – ${monthYear(last)}` : `${shortMonth(first)} – ${monthYear(last)}`;
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  muted: { ...typography.body, color: colors.textMuted },
  subtle: { ...typography.caption, color: colors.textMuted },

  insightCard: { gap: spacing.xs },
  insightHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  insightKicker: { ...typography.label, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  insightTitle: { ...typography.h2, color: colors.ink },
  insightBody: { ...typography.body, color: colors.text },

  bmiBig: { fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  tileRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xs },
  liveText: { ...typography.caption, color: colors.text, flex: 1 },

  ringRow: { flexDirection: "row", gap: spacing.md },
  ringCard: { flex: 1, alignItems: "center", gap: spacing.sm },
  ringCap: { ...typography.label, color: colors.textMuted, alignSelf: "flex-start" },
  ringFoot: { ...typography.caption, color: colors.textMuted },

  attentionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attentionText: { ...typography.caption, color: colors.textMuted, flex: 1 },
});
