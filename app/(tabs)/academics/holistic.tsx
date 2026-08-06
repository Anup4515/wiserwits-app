import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useHolistic } from "@/api/hooks";
import { useBoundedMonth } from "@/features/enrollment/useSessionMonths";
import { FEATURE } from "@/lib/features";
import { Card } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { BarRow } from "@/components/charts";
import { MonthStepper, SectionHeader, EmptyState } from "@/components/data-ui";
import { longMonth, scoreColor } from "@/lib/format";
import { colors, spacing, radius, typography } from "@/theme";
import type { HolisticParamGroup, SelfHolisticRow } from "@/api/student-types";

/**
 * Holistic development (NEP parameters). Month-scoped and bounded to the
 * selected class's academic session (capped at the current month — future
 * months aren't rated yet). Enrolled shows the school's parameter → sub-parameter
 * ratings with any consultant comments; self shows a contributor-filled list of
 * dimension ratings (0–10) with reflections. Both narrow on `source`.
 */
export default function HolisticScreen() {
  const { month, setPrev, setNext, prevDisabled, nextDisabled } = useBoundedMonth({ capToday: true });
  const result = useHolistic(month);
  const { query } = result;

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
    >
      <MonthStepper
        label={longMonth(month)}
        onPrev={setPrev}
        onNext={setNext}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
      />

      <View style={{ height: spacing.lg }} />

      <QueryView result={result} feature={FEATURE.holistic}>
        {(data, source) =>
          source === "enrolled" ? (
            <EnrolledHolistic groups={data as HolisticParamGroup[]} />
          ) : (
            <SelfHolistic rows={data as SelfHolisticRow[]} />
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function EnrolledHolistic({ groups }: { groups: HolisticParamGroup[] }) {
  if (groups.length === 0) return <NothingYet />;
  return (
    <View style={{ gap: spacing.md }}>
      {groups.map((g) => (
        <Card key={g.parameter_name} style={{ gap: spacing.sm }}>
          <SectionHeader title={g.parameter_name} />
          {g.sub_parameters.map((sp) => {
            const pct =
              sp.rating_value != null && sp.max_rating
                ? (sp.rating_value / sp.max_rating) * 100
                : null;
            return (
              <View key={sp.name} style={styles.subRow}>
                {pct != null ? (
                  <BarRow
                    label={sp.name}
                    value={pct}
                    valueLabel={`${sp.rating_value}${sp.max_rating ? `/${sp.max_rating}` : ""}`}
                    color={scoreColor(pct)}
                  />
                ) : (
                  <View style={styles.unratedRow}>
                    <Text style={styles.unratedLabel} numberOfLines={1}>{sp.name}</Text>
                    <Text style={styles.unratedValue}>Not rated</Text>
                  </View>
                )}
                {sp.comments ? <Text style={styles.comment}>“{sp.comments}”</Text> : null}
              </View>
            );
          })}
        </Card>
      ))}
    </View>
  );
}

function SelfHolistic({ rows }: { rows: SelfHolisticRow[] }) {
  if (rows.length === 0) return <NothingYet />;
  const filledBy = rows.find((r) => r.filled_by_name)?.filled_by_name ?? null;
  return (
    <Card style={{ gap: spacing.sm }}>
      <SectionHeader title="Holistic development" />
      {filledBy ? (
        <View style={styles.filledRow}>
          <Ionicons name="person-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.filledText}>Rated by {filledBy}</Text>
        </View>
      ) : null}
      <View style={{ height: spacing.xs }} />
      {rows.map((r) => (
        <View key={r.id} style={styles.subRow}>
          <BarRow
            label={r.dimension}
            value={r.rating * 10}
            valueLabel={`${r.rating}/10`}
            color={scoreColor(r.rating * 10)}
          />
          {r.reflection ? <Text style={styles.comment}>“{r.reflection}”</Text> : null}
        </View>
      ))}
    </Card>
  );
}

function NothingYet() {
  return (
    <Card>
      <EmptyState
        icon="sparkles-outline"
        title="No ratings this month"
        subtitle="Holistic ratings for this month haven't been recorded yet. Try another month."
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },

  subRow: { gap: 4 },
  comment: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: "italic",
    marginLeft: 96 + spacing.md,
    marginBottom: spacing.xs,
  },

  unratedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  unratedLabel: { ...typography.label, color: colors.text, width: 96 },
  unratedValue: { ...typography.caption, color: colors.textMuted },

  filledRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  filledText: { ...typography.caption, color: colors.textMuted },

  card: { borderRadius: radius.lg },
});
