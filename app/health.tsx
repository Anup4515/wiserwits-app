import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useHealth, useConsultations, useDietPlans, useLabReports } from "@/api/hooks";
import { Card, Button, Pill } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { StatTile, SectionHeader, EmptyState } from "@/components/data-ui";
import { TrendChart } from "@/components/charts";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type {
  HealthData,
  BmiRecord,
  ConsultationRow,
  DietPlanRow,
  LabReportRow,
} from "@/api/student-types";

/**
 * Health & Wellness (Phase 3). One `/health` overview call drives the BMI hero
 * (latest reading + 6-point trend) and the consult/diet/lab counts; three
 * lighter sub-queries fill the sections below. Only the overview blocks the
 * screen via QueryView — the sections resolve inline so a slow list never hides
 * the whole page. "Log BMI" and "Book" open the quick-action modals.
 */
export default function HealthScreen() {
  const result = useHealth();
  const { query } = result;
  const consultations = useConsultations();
  const dietPlans = useDietPlans();
  const labReports = useLabReports();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} feature="student.health">
        {(data) => <HealthBody data={data} />}
      </QueryView>

      <ConsultationsSection rows={consultations.query.data ?? []} />
      <DietPlansSection rows={dietPlans.query.data ?? []} />
      <LabReportsSection rows={labReports.query.data ?? []} />
    </ScrollView>
  );
}

// ── BMI hero + counts (from the /health overview) ────────────────────────────
function HealthBody({ data }: { data: HealthData }) {
  const router = useRouter();
  const latest: BmiRecord | undefined = data.bmi_records[0];

  // Last ~6 readings, oldest-first, for the sparkline.
  const points = data.bmi_records
    .slice(0, 6)
    .reverse()
    .map((r) => ({ label: shortDay(r.record_date), value: r.bmi }));

  const cat = latest ? bmiCategory(latest.bmi) : null;

  return (
    <>
      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Body mass index" />
        {latest ? (
          <>
            <View style={styles.bmiHead}>
              <View>
                <Text style={styles.bmiValue}>{latest.bmi.toFixed(1)}</Text>
                <Text style={styles.bmiMeta}>
                  {Math.round(latest.height)} cm · {Math.round(latest.weight)} kg ·{" "}
                  {shortDay(latest.record_date)}
                </Text>
              </View>
              {cat ? <Pill label={cat.label} tone={cat.tone} /> : null}
            </View>
            {points.length > 1 ? (
              <TrendChart points={points} color={colors.navy} />
            ) : null}
          </>
        ) : (
          <EmptyState
            icon="body-outline"
            title="No BMI readings yet"
            subtitle="Log your height and weight to start tracking."
          />
        )}
        <Button label="Log BMI" onPress={() => router.push("/log-bmi")} />
      </Card>

      <View style={styles.countsRow}>
        <StatTile
          label="Consultations"
          value={String(data.consultations_count)}
          icon="medkit-outline"
          tint={colors.greenBg}
          fg={colors.green}
        />
        <StatTile
          label="Diet plans"
          value={String(data.diet_plans_count)}
          icon="nutrition-outline"
          tint={palette.accent100}
          fg={palette.accent600}
        />
        <StatTile
          label="Lab reports"
          value={String(data.lab_reports_count)}
          icon="flask-outline"
          tint={colors.amberBg}
          fg={colors.amber}
        />
      </View>
    </>
  );
}

// ── Consultations ────────────────────────────────────────────────────────────
function ConsultationsSection({ rows }: { rows: ConsultationRow[] }) {
  const router = useRouter();
  return (
    <View>
      <SectionHeader
        title="Consultations"
        action="Book"
        onAction={() => router.push("/book-consultation")}
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="medkit-outline"
            title="No consultations"
            subtitle="Book a doctor consultation to see it here."
          />
        </Card>
      ) : (
        <Card style={{ gap: spacing.md }}>
          {rows.map((r, i) => (
            <View key={r.id} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={styles.rowHead}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {r.problem || r.patient_name}
                </Text>
                <Pill label={statusText(r.status)} tone={statusTone(r.status)} />
              </View>
              <Text style={styles.rowSub}>
                {r.patient_name} · {dateTime(r.scheduled_at)}
              </Text>
              {r.feedback ? (
                <View style={styles.feedback}>
                  <Ionicons name="chatbox-ellipses-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.feedbackText}>{r.feedback}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

// ── Diet plans ───────────────────────────────────────────────────────────────
function DietPlansSection({ rows }: { rows: DietPlanRow[] }) {
  return (
    <View>
      <SectionHeader title="Diet plans" />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="nutrition-outline" title="No diet plans shared" />
        </Card>
      ) : (
        <Card style={{ gap: spacing.md }}>
          {rows.map((r, i) => (
            <View key={r.id} style={[styles.listRow, i > 0 && styles.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{r.title}</Text>
                {r.description ? (
                  <Text style={styles.rowSub} numberOfLines={2}>{r.description}</Text>
                ) : null}
              </View>
              <Text style={styles.rowDate}>{shortDay(r.share_date)}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

// ── Lab reports ──────────────────────────────────────────────────────────────
function LabReportsSection({ rows }: { rows: LabReportRow[] }) {
  return (
    <View>
      <SectionHeader title="Lab reports" />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="flask-outline" title="No lab reports shared" />
        </Card>
      ) : (
        <Card style={{ gap: spacing.md }}>
          {rows.map((r, i) => (
            <View key={r.id} style={[styles.listRow, i > 0 && styles.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{r.title}</Text>
                {r.report_data ? (
                  <Text style={styles.rowSub} numberOfLines={2}>{r.report_data}</Text>
                ) : null}
              </View>
              <Text style={styles.rowDate}>{shortDay(r.created_at)}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO date/datetime → "2 Jul". */
function shortDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** ISO datetime → "2 Jul, 2:30 PM". */
function dateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${h}:${min} ${suffix}`;
}

type PillTone = "green" | "amber" | "red" | "blue" | "navy" | "gold";

function bmiCategory(bmi: number): { label: string; tone: PillTone } {
  if (bmi < 18.5) return { label: "Underweight", tone: "blue" };
  if (bmi < 25) return { label: "Normal", tone: "green" };
  if (bmi < 30) return { label: "Overweight", tone: "amber" };
  return { label: "Obese", tone: "red" };
}

function statusText(status: string): string {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

function statusTone(status: string): PillTone {
  switch (status?.toLowerCase()) {
    case "completed":
    case "confirmed":
      return "green";
    case "cancelled":
    case "rejected":
      return "red";
    case "pending":
    case "requested":
      return "amber";
    default:
      return "navy";
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  bmiHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  bmiValue: { fontSize: 40, fontWeight: "800", color: colors.ink, letterSpacing: -1 },
  bmiMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  countsRow: { flexDirection: "row", gap: spacing.sm },

  row: { gap: spacing.xs },
  listRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowTitle: { ...typography.label, color: colors.ink, fontSize: 13.5, flexShrink: 1 },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  rowDate: { ...typography.caption, color: colors.textMuted },
  feedback: { flexDirection: "row", gap: 6, marginTop: spacing.xs, alignItems: "flex-start" },
  feedbackText: { ...typography.caption, color: colors.text, flex: 1 },
});
