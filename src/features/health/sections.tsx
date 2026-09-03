import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useDeleteBmi } from "@/api/hooks";
import { Card, Button, Pill, type PillTone } from "@/components/ui";
import {
  ListCard,
  DateChip,
  IconTile,
  CardHead,
  CardFooter,
  CardAction,
  CardBlock,
  CardDescription,
  Note,
  groupStyle,
} from "@/components/list-card";
import { SectionHeader, EmptyState } from "@/components/data-ui";
import { TrendChart } from "@/components/charts";
import { downloadAndShare, resolveFileUrl } from "@/lib/download";
import { colors, spacing, radius, typography } from "@/theme";
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

/**
 * Consultations split into Upcoming / Past.
 *
 * An appointment list's most important question is "when is my next one", so
 * the split is the structure rather than one flat chronological list. Each
 * entry is its own card with a status-tinted icon and a date block, and the
 * next upcoming appointment is highlighted.
 */
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

  const now = Date.now();
  const isUpcoming = (r: ConsultationRow) => {
    const t = new Date(r.scheduled_at).getTime();
    const done = ["completed", "cancelled", "rejected"].includes(r.status?.toLowerCase());
    return !done && !Number.isNaN(t) && t >= now;
  };

  // Upcoming: soonest first (that is the one you act on). Past: most recent first.
  const upcoming = rows.filter(isUpcoming).sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
  const past = rows.filter((r) => !isUpcoming(r)).sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at));

  return (
    <View style={{ gap: spacing.lg }}>
      {upcoming.length > 0 ? (
        <View style={groupStyle}>
          <SectionHeader title={`Upcoming · ${upcoming.length}`} />
          {upcoming.map((r, i) => (
            <ConsultationCard key={r.id} row={r} isNext={i === 0} />
          ))}
        </View>
      ) : null}

      {past.length > 0 ? (
        <View style={groupStyle}>
          <SectionHeader title={`Past · ${past.length}`} />
          {past.map((r) => (
            <ConsultationCard key={r.id} row={r} isNext={false} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// `isNext` no longer changes the card chrome — every card looks the same.
// It only decides whether the "Next" pill is shown.
function ConsultationCard({ row, isNext }: { row: ConsultationRow; isNext: boolean }) {
  const tone = statusTone(row.status);
  const valid = !Number.isNaN(new Date(row.scheduled_at).getTime());

  return (
    <ListCard>
      <CardHead
        left={<DateChip iso={row.scheduled_at} />}
        title={row.problem || row.patient_name}
        meta={[
          { icon: "person-outline", text: row.patient_name },
          ...(valid ? [{ icon: "time-outline" as const, text: timeOnly(row.scheduled_at) }] : []),
        ]}
        right={<IconTile icon="medkit-outline" tone={tone} />}
      />

      <CardFooter
        left={
          <>
            {isNext ? <Pill label="Next" tone="gold" /> : null}
            <Pill label={statusText(row.status)} tone={tone} />
          </>
        }
      />

      {/* `symptoms` and `feedback` were both being dropped by the old layout. */}
      {row.symptoms ? (
        <Note icon="fitness-outline" label="Symptoms" text={row.symptoms} tone="blue" />
      ) : null}
      {row.feedback ? (
        <Note icon="chatbox-ellipses-outline" label="Consultant note" text={row.feedback} tone="green" />
      ) : null}
    </ListCard>
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
    <View style={groupStyle}>
      <SectionHeader title={`Shared plans · ${rows.length}`} />
      {rows.map((r) => (
        <DietPlanItem key={r.id} plan={r} />
      ))}
    </View>
  );
}

function DietPlanItem({ plan }: { plan: DietPlanRow }) {
  const [downloading, setDownloading] = useState(false);
  const fileUrl = resolveFileUrl(plan.file_path);
  const validity = validityOf(plan.valid_upto);

  async function download() {
    if (!fileUrl) return;
    setDownloading(true);
    await downloadAndShare(fileUrl, plan.title || "diet-plan");
    setDownloading(false);
  }

  return (
    <ListCard>
      <CardHead
        left={<DateChip iso={plan.share_date} />}
        title={plan.title}
        meta={[{ icon: "person-outline", text: "Shared by consultant" }]}
        right={<IconTile icon="nutrition-outline" tone="green" />}
      />

      {plan.description ? <CardDescription text={plan.description} /> : null}

      {/* `valid_upto` was stored and never shown — it is the one field that
          tells a student whether the plan still applies. */}
      <CardFooter
        left={validity ? <Pill label={validity.label} tone={validity.tone} /> : null}
        right={
          fileUrl ? (
            <CardAction
              icon="download-outline"
              label="Download"
              loading={downloading}
              onPress={download}
            />
          ) : null
        }
      />
    </ListCard>
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
    <View style={groupStyle}>
      <SectionHeader title={`Reports · ${rows.length}`} />
      {rows.map((r) => (
        <LabReportItem key={r.id} report={r} />
      ))}
    </View>
  );
}

function LabReportItem({ report }: { report: LabReportRow }) {
  const [downloading, setDownloading] = useState(false);
  // The consultant attaches the actual PDF/scan; the API returns its path but
  // the screen had no way to open it, so a student could read the summary line
  // and never the report.
  const fileUrl = resolveFileUrl(report.file_path);

  async function download() {
    if (!fileUrl) return;
    setDownloading(true);
    await downloadAndShare(fileUrl, report.title || "lab-report");
    setDownloading(false);
  }

  return (
    <ListCard>
      <CardHead
        left={<DateChip iso={report.created_at} />}
        title={report.title}
        meta={[{ icon: "document-text-outline", text: "Shared by consultant" }]}
        right={<IconTile icon="flask-outline" tone="amber" />}
      />
      {/* The result text IS the report — give it its own readable block
          rather than a two-line muted subtitle. */}
      {report.report_data ? (
        <CardBlock>
          <Text style={styles.resultText}>{report.report_data}</Text>
        </CardBlock>
      ) : null}
      {fileUrl ? (
        <CardFooter
          right={
            <CardAction
              icon="download-outline"
              label="Download"
              loading={downloading}
              onPress={download}
            />
          }
        />
      ) : null}
    </ListCard>
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

/** ISO datetime → "2:30 PM". The date is shown separately in the date block. */
function timeOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${suffix}`;
}

/**
 * Turn a diet plan's `valid_upto` into a status pill. Expired plans matter —
 * a student following an out-of-date plan is the failure this surfaces.
 */
function validityOf(validUpto: string | null): { label: string; tone: PillTone } | null {
  if (!validUpto) return null;
  const end = new Date(validUpto);
  if (Number.isNaN(end.getTime())) return null;
  // Compare date-only so a plan valid "today" does not read as expired.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const days = Math.round((end.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: "Expired", tone: "red" };
  if (days === 0) return { label: "Ends today", tone: "amber" };
  if (days <= 7) return { label: `${days} day${days === 1 ? "" : "s"} left`, tone: "amber" };
  return { label: `Valid till ${shortDay(validUpto)}`, tone: "green" };
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

  listRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  rowTitle: { ...typography.label, color: colors.ink, fontSize: 13.5, flexShrink: 1 },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  trashBtn: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.redBg,
    alignItems: "center", justifyContent: "center",
  },

  // Body text on a list card. The rest of the card system lives in
  // components/list-card.tsx and is shared with the non-health lists.
  itemBody: { ...typography.body, color: colors.textMuted },
  resultText: { ...typography.body, color: colors.text, fontSize: 13, lineHeight: 20 },
});
