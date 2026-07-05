import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";

import { useTimetable } from "@/api/hooks";
import { FEATURE } from "@/lib/features";
import { Card } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { EmptyState, ProvenanceBadge } from "@/components/data-ui";
import { time12 } from "@/lib/format";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { TimetableData, SelfTimetableRow } from "@/api/student-types";

/**
 * Timetable (backed, unmocked — plan §7). A weekday selector over the recurring
 * schedule. Enrolled reads a periods+slots grid (day_of_week 1=Sun..7=Sat);
 * self reads a flat slot list (day_of_week 0=Sun..6=Sat) with contributor
 * provenance. The selector maps to the right per-source day value.
 */
const DAYS = [
  { key: "Mon", enrolled: 2, self: 1 },
  { key: "Tue", enrolled: 3, self: 2 },
  { key: "Wed", enrolled: 4, self: 3 },
  { key: "Thu", enrolled: 5, self: 4 },
  { key: "Fri", enrolled: 6, self: 5 },
  { key: "Sat", enrolled: 7, self: 6 },
];

function todayIndex(): number {
  const dow = new Date().getDay(); // 0=Sun..6=Sat
  const idx = DAYS.findIndex((d) => d.self === dow);
  return idx >= 0 ? idx : 0; // Sunday → Monday
}

export default function TimetableScreen() {
  const [dayIdx, setDayIdx] = useState(todayIndex());
  const result = useTimetable();
  const { query } = result;
  const day = DAYS[dayIdx];

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <View style={styles.dayBar}>
        {DAYS.map((d, i) => {
          const active = i === dayIdx;
          return (
            <Pressable key={d.key} onPress={() => setDayIdx(i)} style={[styles.dayChip, active && styles.dayChipActive]}>
              <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{d.key}</Text>
            </Pressable>
          );
        })}
      </View>

      <QueryView result={result} feature={FEATURE.timetable}>
        {(data, source) =>
          source === "enrolled" ? (
            <EnrolledDay data={data as TimetableData} dayValue={day.enrolled} />
          ) : (
            <SelfDay rows={data as SelfTimetableRow[]} dayValue={day.self} />
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function EnrolledDay({ data, dayValue }: { data: TimetableData; dayValue: number }) {
  const slotByPeriod = new Map(
    data.slots.filter((s) => s.day_of_week === dayValue).map((s) => [s.period_number, s])
  );

  if (data.periods.length === 0) {
    return <EmptyDay />;
  }

  return (
    <Card style={{ paddingVertical: spacing.xs }}>
      {data.periods.map((p, i) => {
        const slot = slotByPeriod.get(p.period_number);
        const isBreak = p.slot_type !== "period";
        return (
          <View key={p.period_number} style={[styles.slotRow, i > 0 && styles.divider]}>
            <View style={styles.timeCol}>
              <Text style={styles.timeText}>{time12(p.start_time)}</Text>
              <Text style={styles.timeSub}>{time12(p.end_time)}</Text>
            </View>
            {isBreak ? (
              <View style={styles.breakBody}>
                <Text style={styles.breakText}>{p.label || p.slot_type}</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={styles.slotSubject}>{slot?.subject_name ?? "Free period"}</Text>
                <Text style={styles.slotMeta}>
                  {[slot?.teacher_name, slot?.room_number ? `Room ${slot.room_number}` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </Card>
  );
}

function SelfDay({ rows, dayValue }: { rows: SelfTimetableRow[]; dayValue: number }) {
  const dayRows = rows
    .filter((r) => r.day_of_week === dayValue)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (dayRows.length === 0) return <EmptyDay />;

  return (
    <Card style={{ paddingVertical: spacing.xs }}>
      {dayRows.map((r, i) => (
        <View key={r.id} style={[styles.slotRow, i > 0 && styles.divider]}>
          <View style={styles.timeCol}>
            <Text style={styles.timeText}>{time12(r.start_time)}</Text>
            <Text style={styles.timeSub}>{time12(r.end_time)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.slotSubject}>{r.subject}</Text>
            <Text style={styles.slotMeta}>
              {[r.teacher_name, r.location].filter(Boolean).join(" · ") || "—"}
            </Text>
            <ProvenanceBadge name={r.filled_by_name} />
          </View>
        </View>
      ))}
    </Card>
  );
}

function EmptyDay() {
  return (
    <Card style={{ marginTop: spacing.md }}>
      <EmptyState icon="time-outline" title="No classes" subtitle="Nothing is scheduled for this day." />
    </Card>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  dayBar: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  dayChip: {
    flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  dayChipText: { ...typography.label, color: colors.textMuted },
  dayChipTextActive: { color: colors.textInverse },

  slotRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  timeCol: { width: 68, alignItems: "flex-start" },
  timeText: { ...typography.label, color: colors.navy, fontSize: 13 },
  timeSub: { ...typography.caption, color: colors.textMuted },
  slotSubject: { ...typography.label, color: colors.ink, fontSize: 13.5 },
  slotMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  breakBody: { flex: 1, backgroundColor: palette.primary50, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: spacing.md },
  breakText: { ...typography.label, color: colors.textMuted, textTransform: "capitalize" },
});
