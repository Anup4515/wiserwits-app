import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useDeleteBmi } from "@/api/hooks";
import { Card, Button, Pill } from "@/components/ui";
import { SectionHeader, EmptyState } from "@/components/data-ui";
import { TrendChart } from "@/components/charts";
import { downloadAndShare, resolveFileUrl } from "@/lib/download";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type {
  HealthData,
  BmiRecord,
  ConsultationRow,
  DietPlanRow,
  LabReportRow,
} from "@/api/student-types";

/**
 * Presentational Health sections, shared by the Health tab's sub-screens
 * (`app/(tabs)/health/*`). Each screen owns its own data hook + scroll
 * container and drops the relevant section(s) in here, so the pieces stay in
 * one place and the routes stay thin — mirroring the Academics hub pattern.
 */

// ── BMI hero (latest reading + trend) + Log BMI button ───────────────────────
export function BmiCard({ data }: { data: HealthData }) {
  const router = useRouter();
  const latest: BmiRecord | undefined = data.bmi_records[0];

  // Last ~6 readings, oldest-first, for the sparkline.
  const points = data.bmi_records
    .slice(0, 6)
    .reverse()
    .map((r) => ({ label: shortDay(r.record_date), value: r.bmi }));

  const cat = latest ? bmiCategory(latest.bmi) : null;

  return (
    <Card style={{ gap: spacing.md }}>
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
            <TrendChart
              points={points}
              color={colors.navy}
              domain="auto"
              formatValue={(v) => v.toFixed(1)}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          icon="body-outline"
          title="No BMI readings yet"
          subtitle="Log height and weight to start tracking."
        />
      )}
      <Button label="Log BMI" onPress={() => router.push("/log-bmi")} />
    </Card>
  );
}

// ── BMI reading history (with delete) ────────────────────────────────────────
export function BmiHistory({ records }: { records: BmiRecord[] }) {
  const del = useDeleteBmi();

  function confirmDelete(r: BmiRecord) {
    Alert.alert(
      "Delete reading?",
      `Remove the ${r.bmi.toFixed(1)} BMI reading from ${shortDay(r.record_date)}? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            del.mutate(r.id, {
              onError: (e) => Alert.alert("Couldn't delete", e.message),
            }),
        },
      ],
    );
  }

  return (
    <View>
      <SectionHeader title="Reading history" />
      <Card style={{ gap: spacing.md }}>
        {records.map((r, i) => {
          const cat = bmiCategory(r.bmi);
          const deleting = del.isPending && del.variables === r.id;
          return (
            <View key={r.id} style={[styles.listRow, i > 0 && styles.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {r.bmi.toFixed(1)} · {cat.label}
                </Text>
                <Text style={styles.rowSub}>
                  {Math.round(r.height)} cm · {Math.round(r.weight)} kg · {shortDay(r.record_date)}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmDelete(r)}
                hitSlop={8}
                disabled={deleting}
                style={styles.trashBtn}
                accessibilityLabel="Delete reading"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.red} />
                ) : (
                  <Ionicons name="trash-outline" size={19} color={colors.red} />
                )}
              </Pressable>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

// ── Consultations ────────────────────────────────────────────────────────────
export function ConsultationsSection({ rows }: { rows: ConsultationRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="medkit-outline"
          title="No consultations yet"
          subtitle="Schedule a doctor consultation to see it here."
        />
      </Card>
    );
  }
  return (
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
  );
}

// ── Diet plans ───────────────────────────────────────────────────────────────
export function DietPlansSection({ rows }: { rows: DietPlanRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="nutrition-outline"
          title="No diet plans shared"
          subtitle="Diet plans shared by the consultant will appear here."
        />
      </Card>
    );
  }
  return (
    <Card style={{ gap: spacing.md }}>
      {rows.map((r, i) => (
        <DietPlanItem key={r.id} plan={r} divider={i > 0} />
      ))}
    </Card>
  );
}

function DietPlanItem({ plan, divider }: { plan: DietPlanRow; divider: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const fileUrl = resolveFileUrl(plan.file_path);

  async function download() {
    if (!fileUrl) return;
    setDownloading(true);
    await downloadAndShare(fileUrl, plan.title || "diet-plan");
    setDownloading(false);
  }

  return (
    <View style={[styles.listRow, divider && styles.rowDivider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{plan.title}</Text>
        {plan.description ? (
          <Text style={styles.rowSub} numberOfLines={2}>{plan.description}</Text>
        ) : null}
        <Text style={styles.rowDate}>{shortDay(plan.share_date)}</Text>
      </View>
      {fileUrl ? (
        <Pressable onPress={download} hitSlop={8} disabled={downloading} style={styles.dlBtn}>
          {downloading ? (
            <ActivityIndicator size="small" color={colors.navy} />
          ) : (
            <Ionicons name="download-outline" size={20} color={colors.navy} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Lab reports ──────────────────────────────────────────────────────────────
export function LabReportsSection({ rows }: { rows: LabReportRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="flask-outline"
          title="No lab reports shared"
          subtitle="Lab reports shared by the consultant will appear here."
        />
      </Card>
    );
  }
  return (
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
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO date/datetime → "2 Jul". */
export function shortDay(iso: string): string {
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

export function bmiCategory(bmi: number): { label: string; tone: PillTone } {
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
  bmiHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  bmiValue: { fontSize: 40, fontWeight: "800", color: colors.ink, letterSpacing: -1 },
  bmiMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  row: { gap: spacing.xs },
  listRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowTitle: { ...typography.label, color: colors.ink, fontSize: 13.5, flexShrink: 1 },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  rowDate: { ...typography.caption, color: colors.textMuted },
  dlBtn: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: palette.primary50,
    alignItems: "center", justifyContent: "center",
  },
  trashBtn: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.redBg,
    alignItems: "center", justifyContent: "center",
  },
  feedback: { flexDirection: "row", gap: 6, marginTop: spacing.xs, alignItems: "flex-start" },
  feedbackText: { ...typography.caption, color: colors.text, flex: 1 },
});
