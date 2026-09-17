import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card, Pill, type PillTone } from "@/components/ui";
import { SectionHeader, EmptyState } from "@/components/data-ui";
import { TrendChart, BarRow, RadarChart, LegendKey } from "@/components/charts";
import { shortMonth, mediumDate, scoreColor, pct } from "@/lib/format";
import { colors, palette, spacing, typography } from "@/theme";
import type { ClassCompare } from "@/api/student-types";

/**
 * "Me vs my class" Insights (insights_class_compare_plan.md §6) — every number
 * sits next to the class figure. Enrolled students only; the server sends
 * `class: null` for independent students, who keep <InsightsContent/>.
 *
 * Class figures arrive null when too few classmates contribute (server-side
 * privacy guard), so every class value here renders "—" gracefully.
 */
export function ClassInsightsContent({ data }: { data: ClassCompare }) {
  const nothingYet =
    data.exams.length === 0 && data.attendance.student_pct == null && data.holistic.length === 0;

  return (
    <View style={{ gap: spacing.lg }}>
      <StandingCard data={data} />
      {data.highlights.map((h) => (
        <HighlightCard key={h.title} {...h} />
      ))}
      <AttendanceCard data={data} />
      {data.exams.length > 0 ? <ExamJourneyCard data={data} /> : null}
      {data.subjects.length > 0 ? <SubjectsCard data={data} /> : null}
      {data.holistic.length > 0 ? <HolisticCard data={data} /> : null}
      {nothingYet ? (
        <Card>
          <EmptyState
            icon="people-outline"
            title="Class insights are on the way"
            subtitle="Once attendance, results and holistic ratings are published, you'll see how you compare with your class."
          />
        </Card>
      ) : null}
    </View>
  );
}

// ── Standing: overall class rank + overall % vs class ───────────────────────
function StandingCard({ data }: { data: ClassCompare }) {
  const { rank } = data;
  const latestExam = [...data.exams].reverse().find((e) => e.rank != null);
  const moved =
    rank.overall != null && rank.previous_overall != null ? rank.previous_overall - rank.overall : null;

  return (
    <Card style={{ gap: spacing.md }}>
      <Text style={styles.kicker}>Class rank</Text>
      {rank.overall != null ? (
        <View style={styles.rankRow}>
          <Text style={styles.rankBig}>#{rank.overall}</Text>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.rankOf}>of {rank.ranked_count} in class</Text>
            {moved != null ? (
              <Pill
                label={
                  moved > 0
                    ? `▲ ${moved} after ${latestExam?.name ?? "latest exam"}`
                    : moved < 0
                      ? `▼ ${-moved} after ${latestExam?.name ?? "latest exam"}`
                      : `Holding steady`
                }
                tone={moved > 0 ? "green" : moved < 0 ? "red" : "navy"}
              />
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={styles.muted}>Your rank appears once exam results are published.</Text>
      )}
      <View style={styles.statRow}>
        <Stat label="You" value={pct(rank.overall_pct)} color={scoreColor(rank.overall_pct)} />
        <Stat label="Class avg" value={pct(rank.class_avg_pct)} />
        <Stat label="Class high" value={pct(rank.class_high_pct)} />
      </View>
    </Card>
  );
}

// ── Highlights: class-relative insight cards ─────────────────────────────────
function HighlightCard({ title, body, tone }: ClassCompare["highlights"][number]) {
  const fg = tone === "positive" ? colors.green : tone === "warning" ? colors.amber : colors.blue;
  const bg = tone === "positive" ? colors.greenBg : tone === "warning" ? colors.amberBg : colors.blueBg;
  return (
    <Card style={[styles.highlight, { backgroundColor: bg, borderColor: bg }]}>
      <View style={styles.highlightHead}>
        <Ionicons name={tone === "warning" ? "alert-circle" : "sparkles"} size={16} color={fg} />
        <Text style={[styles.highlightKicker, { color: fg }]}>Compared with your class</Text>
      </View>
      <Text style={styles.highlightTitle}>{title}</Text>
      <Text style={styles.highlightBody}>{body}</Text>
    </Card>
  );
}

// ── Attendance vs class ──────────────────────────────────────────────────────
function AttendanceCard({ data }: { data: ClassCompare }) {
  const att = data.attendance;
  const trend = att.trend.filter((t) => t.student_pct != null);

  return (
    <Card style={{ gap: spacing.sm }}>
      <SectionHeader title="Attendance vs class" />
      {att.student_pct == null ? (
        <Text style={styles.muted}>No attendance recorded yet.</Text>
      ) : (
        <>
          <View style={styles.statRow}>
            <Stat label="You" value={pct(att.student_pct)} color={scoreColor(att.student_pct)} />
            <Stat label="Class avg" value={pct(att.class_avg_pct)} />
          </View>
          <View style={styles.pillRow}>
            <GapPill you={att.student_pct} cls={att.class_avg_pct} />
            {att.top_band != null ? <Pill label={`Top ${att.top_band}% of class`} tone="gold" /> : null}
          </View>
          {trend.length > 0 ? (
            <>
              <View style={{ height: spacing.xs }} />
              <TrendChart
                points={trend.map((t) => ({ label: shortMonth(t.month), value: t.student_pct as number }))}
                color={colors.navy}
                compare={{
                  values: trend.map((t) => t.class_pct),
                  label: "Class avg",
                  seriesLabel: "You",
                }}
              />
            </>
          ) : null}
        </>
      )}
    </Card>
  );
}

// ── Exam journey: % vs class + rank, per published exam ─────────────────────
/** Exams shown before "Show all" — schools with weekly tests pile up quickly. */
const EXAMS_COLLAPSED = 4;
/** Exams in the "#6 → #2 → #1" rank line. */
const RANK_LINE_EXAMS = 5;

function ExamJourneyCard({ data }: { data: ClassCompare }) {
  const [expanded, setExpanded] = useState(false);
  // data.exams is oldest-first; the collapsed view keeps the most recent ones.
  const hidden = Math.max(0, data.exams.length - EXAMS_COLLAPSED);
  const shown = expanded ? data.exams : data.exams.slice(hidden);
  const ranked = data.exams.filter((e) => e.rank != null).slice(-RANK_LINE_EXAMS);
  return (
    <Card style={{ gap: spacing.sm }}>
      <SectionHeader title="Exam journey" />
      {ranked.length >= 2 ? (
        <Text style={styles.subtle}>
          {data.exams.filter((e) => e.rank != null).length > RANK_LINE_EXAMS ? "Recent rank" : "Rank"}:{" "}
          {ranked.map((e) => `#${e.rank}`).join("  →  ")}
        </Text>
      ) : null}
      {shown.map((e, i) => (
        <View key={e.exam_id} style={[styles.examRow, i > 0 && styles.examRowDivider]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.examName} numberOfLines={1}>
                {e.name}
              </Text>
              {e.date ? <Text style={styles.subtle}>{mediumDate(e.date)}</Text> : null}
            </View>
            {e.rank != null ? (
              <Text style={styles.examRank}>
                #{e.rank}
                <Text style={styles.examRankOf}> / {e.ranked_count}</Text>
              </Text>
            ) : (
              <Pill label="Absent" tone="amber" />
            )}
          </View>
          {e.student_pct != null ? (
            <>
              <View style={styles.statRow}>
                <Stat label="You" value={pct(e.student_pct)} color={scoreColor(e.student_pct)} />
                <Stat label="Class avg" value={pct(e.class_avg_pct)} />
                <Stat label="Class high" value={pct(e.class_high_pct)} />
              </View>
              <BarRow
                label="You vs class"
                value={e.student_pct}
                valueLabel={pct(e.student_pct)}
                color={scoreColor(e.student_pct)}
                marker={e.class_avg_pct}
              />
            </>
          ) : null}
        </View>
      ))}
      {hidden > 0 ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          style={styles.showAll}
          accessibilityRole="button"
        >
          <Text style={styles.showAllText}>
            {expanded ? "Show recent only" : `Show all ${data.exams.length} exams`}
          </Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.navy} />
        </Pressable>
      ) : null}
      <MarkerLegend />
    </Card>
  );
}

// ── Subjects vs class ────────────────────────────────────────────────────────
function SubjectsCard({ data }: { data: ClassCompare }) {
  return (
    <Card style={{ gap: spacing.xs }}>
      <SectionHeader title="Subjects vs class" />
      <View style={{ height: spacing.xs }} />
      {data.subjects.map((s) => (
        <View key={s.subject}>
          <BarRow
            label={s.subject}
            value={s.student_pct}
            valueLabel={pct(s.student_pct)}
            color={scoreColor(s.student_pct)}
            marker={s.class_avg_pct}
          />
          <Text style={styles.classLine}>
            <Text style={[styles.classLineYou, { color: scoreColor(s.student_pct) }]}>
              You {pct(s.student_pct)}
            </Text>
            {"  ·  "}Class avg {pct(s.class_avg_pct)}
          </Text>
        </View>
      ))}
      <MarkerLegend />
    </Card>
  );
}

// ── Holistic vs class ────────────────────────────────────────────────────────
function HolisticCard({ data }: { data: ClassCompare }) {
  const dims = data.holistic;
  const hasClass = dims.every((d) => d.class_avg_pct != null);
  return (
    <Card style={{ gap: spacing.xs }}>
      <SectionHeader title="Holistic vs class" />
      {dims.length >= 3 ? (
        <>
          <RadarChart
            axes={dims.map((d) => ({ label: d.name, value: d.student_pct }))}
            pointColor={scoreColor}
            compareValues={dims.map((d) => d.class_avg_pct)}
          />
          {hasClass ? (
            <View style={styles.legendRow}>
              <LegendKey color={colors.navy} label="You" />
              <LegendKey color={palette.primary300} label="Class avg" dashed />
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={{ height: spacing.xs }} />
          {dims.map((d) => (
            <BarRow
              key={d.name}
              label={d.name}
              value={d.student_pct}
              color={scoreColor(d.student_pct)}
              marker={d.class_avg_pct}
            />
          ))}
          <MarkerLegend />
        </>
      )}
      {dims.map((d) =>
        d.class_avg_pct != null ? (
          <View key={`g${d.name}`} style={styles.rowBetween}>
            <Text style={styles.dimName} numberOfLines={1}>
              {d.name}
            </Text>
            <GapPill you={d.student_pct} cls={d.class_avg_pct} />
          </View>
        ) : null
      )}
    </Card>
  );
}

// ── small pieces ─────────────────────────────────────────────────────────────
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.subtle}>{label}</Text>
    </View>
  );
}

/** "+6 vs class" / "−4 vs class" / "On par with class". */
function GapPill({ you, cls }: { you: number | null; cls: number | null }) {
  if (you == null || cls == null) return null;
  const gap = you - cls;
  let tone: PillTone = "navy";
  let label = "On par with class";
  if (gap >= 2) {
    tone = "green";
    label = `+${gap} vs class`;
  } else if (gap <= -2) {
    tone = "red";
    label = `−${-gap} vs class`;
  }
  return <Pill label={label} tone={tone} />;
}

function MarkerLegend() {
  return (
    <View style={styles.markerLegend}>
      <View style={styles.markerSwatch} />
      <Text style={styles.subtle}>Class average</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  muted: { ...typography.body, color: colors.textMuted },
  subtle: { ...typography.caption, color: colors.textMuted },
  kicker: { ...typography.label, color: colors.textMuted },

  rankRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rankBig: { fontSize: 44, fontWeight: "800", color: colors.navy, letterSpacing: -1.5 },
  rankOf: { ...typography.h2, color: colors.ink },

  statRow: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: palette.primary50,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.ink },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },

  highlight: { gap: spacing.xs },
  highlightHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  highlightKicker: { ...typography.label, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  highlightTitle: { ...typography.h2, color: colors.ink },
  highlightBody: { ...typography.body, color: colors.text },

  examRow: { gap: spacing.xs, paddingTop: spacing.sm },
  examRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  examName: { ...typography.label, color: colors.ink, fontWeight: "800" },
  examRank: { fontSize: 20, fontWeight: "800", color: colors.navy },
  examRankOf: { ...typography.caption, color: colors.textMuted, fontWeight: "600" },

  showAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  showAllText: { ...typography.label, color: colors.navy, fontWeight: "800" },

  classLine: { ...typography.caption, color: colors.textMuted, marginTop: -4, marginBottom: spacing.sm, marginLeft: 104 },
  classLineYou: { fontWeight: "800" },
  dimName: { ...typography.label, color: colors.text, flex: 1, paddingRight: spacing.sm },

  legendRow: { flexDirection: "row", justifyContent: "center", gap: spacing.md, marginBottom: spacing.sm },
  markerLegend: { flexDirection: "row", alignItems: "center", gap: 6 },
  markerSwatch: { width: 3, height: 12, backgroundColor: colors.ink, borderRadius: 1 },
});
