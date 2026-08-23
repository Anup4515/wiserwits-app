import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";

import { useAttendance } from "@/api/hooks";
import { useBoundedMonth } from "@/features/enrollment/useSessionMonths";
import { FEATURE } from "@/lib/features";
import { Card } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { MonthStepper, SectionHeader, EmptyState, ProvenanceBadge } from "@/components/data-ui";
import { Donut } from "@/components/charts";
import { longMonth, longDate, statusColor, statusLabel, pct } from "@/lib/format";
import { colors, spacing, typography } from "@/theme";
import type { AttendanceData } from "@/api/student-types";

/**
 * Attendance (mock 4) — donut breakdown + monthly record with provenance
 * ("Filled by …"). Month-scoped; enrolled reads present/late/absent/half-day,
 * self reads present/absent only (the donut collapses accordingly).
 */
export default function AttendanceScreen() {
  // Month clamped to the selected class's academic session (and never past
  // today — attendance can't have future records).
  const { month, setPrev, setNext, prevDisabled, nextDisabled } = useBoundedMonth({
    capToday: true,
  });
  const result = useAttendance(month);
  const { query } = result;

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <MonthStepper
        label={longMonth(month)}
        onPrev={setPrev}
        onNext={setNext}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
      />

      <QueryView result={result} feature={FEATURE.attendance}>
        {(data) => <AttendanceBody data={data} />}
      </QueryView>
    </ScrollView>
  );
}

function AttendanceBody({ data }: { data: AttendanceData }) {
  const s = data.stats;
  if (s.total_days === 0) {
    return (
      <Card style={{ marginTop: spacing.lg }}>
        <EmptyState
          icon="calendar-outline"
          title="No attendance this month"
          subtitle="Nothing was recorded for the selected month."
        />
      </Card>
    );
  }

  const segments = [
    { value: s.present, color: colors.green },
    { value: s.late, color: colors.amber },
    { value: s.half_day, color: colors.blue },
    { value: s.absent, color: colors.red },
  ].filter((x) => x.value > 0);

  return (
    <>
      <Card style={styles.summary}>
        <Donut
          segments={segments}
          centerLabel={pct(s.attendance_percentage)}
          centerSub="present"
        />
        <View style={styles.legend}>
          <LegendRow color={colors.green} label="Present" value={s.present} />
          {s.late > 0 ? <LegendRow color={colors.amber} label="Late" value={s.late} /> : null}
          {s.half_day > 0 ? <LegendRow color={colors.blue} label="Half day" value={s.half_day} /> : null}
          <LegendRow color={colors.red} label="Absent" value={s.absent} />
          <View style={styles.legendDivider} />
          <LegendRow color={colors.textMuted} label="Total days" value={s.total_days} bold />
        </View>
      </Card>

      <View style={{ height: spacing.lg }} />
      <SectionHeader title="Daily record" />
      <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
        {data.records.map((r, i) => (
          <View key={r.id} style={[styles.dayRow, i > 0 && styles.dayDivider]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(r.status) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dayDate}>{longDate(r.date)}</Text>
              {r.remarks ? <Text style={styles.dayRemark}>{r.remarks}</Text> : null}
              <ProvenanceBadge name={r.marked_by} />
            </View>
            <Text style={[styles.dayStatus, { color: statusColor(r.status) }]}>
              {statusLabel(r.status)}
            </Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function LegendRow({
  color,
  label,
  value,
  bold,
}: {
  color: string;
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, bold && { fontWeight: "800", color: colors.ink }]}>{label}</Text>
      <Text style={[styles.legendValue, bold && { fontWeight: "800", color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: spacing.lg },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.label, color: colors.textMuted, flex: 1 },
  legendValue: { ...typography.label, color: colors.text },
  legendDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  dayRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  dayDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dayDate: { ...typography.label, color: colors.ink, fontSize: 13.5 },
  dayRemark: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  dayStatus: { ...typography.label, fontWeight: "800" },
});
