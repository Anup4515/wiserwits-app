import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  useDeleteEducationProjection,
  useEducationProjections,
  useSaveEducationProjection,
} from "@/api/hooks";
import { LoadMoreRow } from "@/components/QueryView";
import { Button, Card, Field, FormError } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/data-ui";
import type { EducationProjectionRow } from "@/api/student-types";
import { colors, palette, radius, spacing, typography } from "@/theme";

/**
 * Future Saving Planner — mobile port of the student-dashboard
 * `education-calculator` page. Same server contract (POST/GET/DELETE
 * `/api/student/education-calculator`) and the same client-side formula, so a
 * projection saved on web renders identically here and vice-versa.
 *
 * Formula matches inflationcalculator.in: each tuition year inflates
 * independently to the year it's due, the whole bill is discounted from the
 * course-start moment as one lump, and the SIP is an annuity-due at a simple
 * monthly rate (annualRate ÷ 12). The server recomputes the outputs, so the
 * preview shown here matches the row that actually lands.
 */

interface Preset {
  key: string;
  label: string;
  annualCost: number;
  durationYears: number;
}

const PRESETS: Preset[] = [
  { key: "engineering", label: "Engineering (B.Tech)", annualCost: 200000, durationYears: 4 },
  { key: "mbbs", label: "MBBS", annualCost: 500000, durationYears: 6 },
  { key: "mba", label: "MBA", annualCost: 1500000, durationYears: 2 },
  { key: "abroad", label: "Study abroad", annualCost: 3000000, durationYears: 4 },
];

function formatINR(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "₹0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

interface Projection {
  years: number;
  totalFuture: number;
  lumpSumToday: number;
  currentTotal: number;
  multiplier: number;
  monthlySip: number | null;
  inflationMarkup: number;
}

export default function FutureSavingPlannerScreen() {
  const [childCurrentAge, setChildCurrentAge] = useState("8");
  const [educationStartAge, setEducationStartAge] = useState("18");
  const [annualCost, setAnnualCost] = useState("200000");
  const [durationYears, setDurationYears] = useState("4");
  const [inflationRate, setInflationRate] = useState("10");
  const [returnRate, setReturnRate] = useState("12");
  const [localError, setLocalError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<EducationProjectionRow | null>(null);

  const listResult = useEducationProjections();
  const { query } = listResult;
  const save = useSaveEducationProjection();
  const del = useDeleteEducationProjection();

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const applyPreset = (p: Preset) => {
    setAnnualCost(String(p.annualCost));
    setDurationYears(String(p.durationYears));
  };

  // Derive the active preset from the current inputs (not a separate "selected"
  // state), so editing annual cost or duration after picking a preset clears
  // the highlight — the chip only reads as active while the values still match.
  const activePresetKey =
    PRESETS.find(
      (p) =>
        String(p.annualCost) === annualCost.trim() &&
        String(p.durationYears) === durationYears.trim(),
    )?.key ?? null;

  const validationError = useMemo(() => {
    const childAge = Number(childCurrentAge);
    const startAge = Number(educationStartAge);
    const annual = Number(annualCost);
    const duration = Number(durationYears);
    const infl = Number(inflationRate);
    const ret = Number(returnRate);

    if (!Number.isFinite(childAge) || childAge <= 0) return "Child's current age must be greater than 0";
    if (!Number.isFinite(startAge) || startAge <= 0) return "Education start age must be greater than 0";
    if (startAge < childAge) return "Education start age can't be before current age";
    if (!Number.isFinite(annual) || annual <= 0) return "Annual cost must be a positive amount";
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isInteger(duration)) {
      return "Course duration must be a whole number of years (no decimals)";
    }
    if (!Number.isFinite(infl) || infl < 4 || infl > 15) return "Education inflation must be between 4% and 15%";
    if (!Number.isFinite(ret) || ret < 4 || ret > 18) return "Expected returns must be between 4% and 18%";
    return null;
  }, [childCurrentAge, educationStartAge, annualCost, durationYears, inflationRate, returnRate]);

  const result: Projection | null = useMemo(() => {
    if (validationError) return null;

    const childAge = Number(childCurrentAge);
    const startAge = Number(educationStartAge);
    const annual = Number(annualCost);
    const duration = Number(durationYears);
    const infl = Number(inflationRate) / 100;
    const ret = Number(returnRate) / 100;

    const years = startAge - childAge;

    let totalFuture = 0;
    for (let i = 0; i < duration; i++) {
      totalFuture += annual * Math.pow(1 + infl, years + i);
    }
    const lumpSumToday = totalFuture / Math.pow(1 + ret, years);

    const currentTotal = annual * duration;
    const multiplier = currentTotal > 0 ? totalFuture / currentTotal : 0;

    let monthlySip: number | null = null;
    if (years > 0) {
      const months = Math.round(years * 12);
      const monthlyRate = ret / 12;
      monthlySip =
        (totalFuture * monthlyRate) /
        ((Math.pow(1 + monthlyRate, months) - 1) * (1 + monthlyRate));
    }

    return {
      years,
      totalFuture,
      lumpSumToday,
      currentTotal,
      multiplier,
      monthlySip,
      inflationMarkup: totalFuture - currentTotal,
    };
  }, [validationError, childCurrentAge, educationStartAge, annualCost, durationYears, inflationRate, returnRate]);

  const handleSave = () => {
    setLocalError(null);
    if (!result) {
      setLocalError(validationError ?? "Fix the inputs before saving");
      return;
    }
    save.mutate({
      child_current_age: Number(childCurrentAge),
      education_start_age: Number(educationStartAge),
      annual_cost: Number(annualCost),
      duration_years: Number(durationYears),
      inflation_rate: Number(inflationRate),
      return_rate: Number(returnRate),
    });
  };

  const confirmDelete = (row: EducationProjectionRow) => {
    Alert.alert(
      "Delete projection?",
      "This saved projection will be removed. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => del.mutate(row.id) },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <View style={styles.introBlock}>
        <Text style={styles.heading}>Plan future education savings</Text>
        <Text style={styles.subheading}>
          Estimate what a course will cost when your child gets there, and the SIP or lump sum needed today to fund it.
        </Text>
      </View>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Quick presets</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((p) => {
            const active = p.key === activePresetKey;
            return (
              <Pressable
                key={p.key}
                onPress={() => applyPreset(p)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.presetChip,
                  active && styles.presetChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {active ? (
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={colors.textInverse}
                    style={{ marginRight: 4 }}
                  />
                ) : null}
                <Text
                  style={[styles.presetChipText, active && styles.presetChipTextActive]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Field
              label="Child's current age"
              value={childCurrentAge}
              onChangeText={setChildCurrentAge}
              keyboardType="numeric"
              placeholder="e.g. 8"
            />
          </View>
          <View style={styles.col}>
            <Field
              label="Education starts at age"
              value={educationStartAge}
              onChangeText={setEducationStartAge}
              keyboardType="numeric"
              placeholder="e.g. 18"
            />
          </View>
        </View>

        <Field
          label="Current annual cost (₹)"
          value={annualCost}
          onChangeText={setAnnualCost}
          keyboardType="numeric"
          placeholder="e.g. 200000"
        />

        <Field
          label="Course duration (years)"
          value={durationYears}
          onChangeText={(v) => setDurationYears(v.replace(/[^\d]/g, ""))}
          keyboardType="number-pad"
          placeholder="e.g. 4"
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Field
              label="Education inflation (%)"
              value={inflationRate}
              onChangeText={setInflationRate}
              keyboardType="decimal-pad"
              placeholder="4–15"
            />
          </View>
          <View style={styles.col}>
            <Field
              label="Expected returns (%)"
              value={returnRate}
              onChangeText={setReturnRate}
              keyboardType="decimal-pad"
              placeholder="4–18"
            />
          </View>
        </View>

        <FormError message={save.error?.message ?? localError ?? validationError} />

        {result ? (
          <View style={styles.runway}>
            <Ionicons name="time-outline" size={14} color={colors.navy} />
            <Text style={styles.runwayText}>
              Runway to start: <Text style={styles.runwayValue}>{result.years} yr</Text>
              {result.years === 0 ? " — course starts now" : ""}
            </Text>
          </View>
        ) : null}

        <Button
          label="Save projection"
          onPress={handleSave}
          loading={save.isPending}
          disabled={!result}
        />
      </Card>

      {result ? (
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.sectionTitle}>Projection</Text>

          <View style={styles.heroTile}>
            <Text style={styles.heroLabel}>Total future cost</Text>
            <Text style={styles.heroValue}>{formatINR(result.totalFuture)}</Text>
            <Text style={styles.heroCaption}>
              {result.multiplier.toFixed(1)}× today&apos;s cost of {formatINR(result.currentTotal)}
            </Text>
          </View>

          <View style={styles.gridRow}>
            <StatBox
              label="Monthly SIP needed"
              value={result.monthlySip !== null ? formatINR(result.monthlySip) : "—"}
              note={result.monthlySip === null ? "Course starts now — SIP not applicable" : undefined}
            />
            <StatBox label="Lump-sum today" value={formatINR(result.lumpSumToday)} />
          </View>
          <View style={styles.gridRow}>
            <StatBox
              label="Inflation markup"
              value={formatINR(result.inflationMarkup)}
              valueColor="#b45309"
            />
            <StatBox label="Cost multiplier" value={`${result.multiplier.toFixed(2)}×`} />
          </View>

          <Text style={styles.disclaimer}>
            Each tuition year inflates independently to the year it&apos;s actually due. SIP contributions earn the
            expected return until the course begins. Figures are indicative — actual costs and returns will vary.
          </Text>
        </Card>
      ) : null}

      <View>
        <Text style={styles.savedHeading}>Saved projections</Text>
        {query.isLoading ? (
          <LoadingState label="Loading saved projections…" />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => query.refetch()}
          />
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon="bookmarks-outline"
              title="No saved projections yet"
              subtitle="Save one above to keep it here."
            />
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {items.map((row) => (
              <SavedRow
                key={row.id}
                row={row}
                onView={() => setViewing(row)}
                onDelete={() => confirmDelete(row)}
                deleting={del.isPending && del.variables === row.id}
              />
            ))}
            <LoadMoreRow query={query} label="Load older projections" />
          </View>
        )}
      </View>

      <DetailsModal row={viewing} onClose={() => setViewing(null)} />
    </ScrollView>
  );
}

function StatBox({
  label,
  value,
  note,
  valueColor,
}: {
  label: string;
  value: string;
  note?: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </View>
  );
}

function SavedRow({
  row,
  onView,
  onDelete,
  deleting,
}: {
  row: EducationProjectionRow;
  onView: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const savedOn = new Date(row.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.savedHead}>
        <Text style={styles.savedTitle}>
          Age {Number(row.child_current_age)} → {Number(row.education_start_age)}
        </Text>
        <Text style={styles.savedDate}>{savedOn}</Text>
      </View>
      <Text style={styles.savedFuture}>{formatINR(Number(row.total_future_cost))}</Text>
      <Text style={styles.savedCaption}>
        {formatINR(Number(row.annual_cost))} / yr today · {Number(row.duration_years)} yr course
      </Text>
      <View style={styles.savedActions}>
        <Pressable
          onPress={onView}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="eye-outline" size={16} color={colors.navy} />
          <Text style={[styles.actionText, { color: colors.navy }]}>View</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          style={({ pressed }) => [styles.actionBtn, (pressed || deleting) && { opacity: 0.6 }]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>
            {deleting ? "Deleting…" : "Delete"}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

function DetailsModal({
  row,
  onClose,
}: {
  row: EducationProjectionRow | null;
  onClose: () => void;
}) {
  if (!row) return null;
  const savedOn = new Date(row.created_at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Projection details</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}>
            <View>
              <Text style={styles.statLabel}>Saved on</Text>
              <Text style={styles.detailValue}>{savedOn}</Text>
            </View>
            <View style={styles.detailGrid}>
              <DetailCell label="Child's current age" value={`${Number(row.child_current_age)} yr`} />
              <DetailCell label="Education starts at" value={`${Number(row.education_start_age)} yr`} />
              <DetailCell label="Annual cost" value={formatINR(Number(row.annual_cost))} />
              <DetailCell label="Course duration" value={`${Number(row.duration_years)} yr`} />
              <DetailCell label="Education inflation" value={`${Number(row.inflation_rate)}%`} />
              <DetailCell label="Expected returns" value={`${Number(row.return_rate)}%`} />
            </View>
            <View style={styles.heroTile}>
              <Text style={styles.heroLabel}>Total future cost</Text>
              <Text style={styles.heroValue}>{formatINR(Number(row.total_future_cost))}</Text>
              <Text style={styles.heroCaption}>
                {Number(row.cost_multiplier).toFixed(2)}× today&apos;s cost
              </Text>
            </View>
            <View style={styles.gridRow}>
              <StatBox
                label="Monthly SIP needed"
                value={row.monthly_sip === null ? "—" : formatINR(Number(row.monthly_sip))}
              />
              <StatBox label="Lump-sum today" value={formatINR(Number(row.lump_sum_today))} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  introBlock: { gap: spacing.xs },
  heading: { ...typography.h1, color: colors.ink },
  subheading: { ...typography.body, color: colors.textMuted },

  sectionTitle: { ...typography.h2, fontSize: 16, color: colors.ink },

  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.primary50,
    borderColor: palette.primary100,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  presetChipText: { fontSize: 12, fontWeight: "700", color: colors.navy },
  presetChipTextActive: { color: colors.textInverse },

  row: { flexDirection: "row", gap: spacing.md },
  col: { flex: 1 },

  runway: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  runwayText: { ...typography.caption, color: colors.navy },
  runwayValue: { fontWeight: "800" },

  heroTile: {
    backgroundColor: palette.primary50,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  heroLabel: {
    ...typography.label,
    color: colors.navy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroValue: { fontSize: 28, fontWeight: "800", color: colors.navy, marginTop: 4 },
  heroCaption: { ...typography.caption, color: colors.navy, marginTop: 2 },

  gridRow: { flexDirection: "row", gap: spacing.md },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  statLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    fontSize: 10,
  },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.ink, marginTop: 4 },
  statNote: { ...typography.caption, color: colors.textMuted, marginTop: 4, fontSize: 11 },

  disclaimer: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },

  savedHeading: { ...typography.h2, color: colors.ink, marginBottom: spacing.md },
  savedHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  savedTitle: { ...typography.h2, fontSize: 15, color: colors.ink },
  savedDate: { ...typography.caption, color: colors.textMuted },
  savedFuture: { fontSize: 22, fontWeight: "800", color: colors.navy },
  savedCaption: { ...typography.caption, color: colors.textMuted },
  savedActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 13, fontWeight: "700" },

  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "90%",
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { ...typography.h2, fontSize: 16, color: colors.ink },

  detailGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md },
  detailCell: { width: "50%" },
  detailValue: { fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 2 },
});
