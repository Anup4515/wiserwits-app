import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { useReports } from "@/api/hooks";
import { FEATURE } from "@/lib/features";
import { Card, Pill } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { SectionHeader, EmptyState } from "@/components/data-ui";
import { ProgressRing, BarRow } from "@/components/charts";
import { t } from "@/lib/copy";
import { longMonth, longDate, pct, num, scoreColor, gradeColor } from "@/lib/format";
import { downloadAndShare } from "@/lib/download";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { ReportCardRow, SelfReportData } from "@/api/student-types";

/**
 * Report Card (mock 7). Enrolled students get a list of school-issued cards
 * (with PDF links); independent students get a live-generated summary from their
 * self-tracked marks/attendance/holistic. The two shapes are narrowed on source.
 */
export default function ReportScreen() {
  const { user } = useAuth();
  const result = useReports();
  const { query } = result;
  const name = user?.name?.split(" ")[0];

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <Text style={styles.pageTitle}>{t("report.title", { name })}</Text>
      <QueryView result={result} feature={FEATURE.report}>
        {(data, source) =>
          source === "enrolled" ? (
            <EnrolledReports cards={data as ReportCardRow[]} />
          ) : (
            <SelfReport data={data as SelfReportData} />
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function EnrolledReports({ cards }: { cards: ReportCardRow[] }) {
  if (cards.length === 0) {
    return (
      <Card>
        <EmptyState icon="document-text-outline" title="No report cards yet" subtitle="Published term reports will appear here." />
      </Card>
    );
  }
  return (
    <View style={{ gap: spacing.md }}>
      {cards.map((c) => (
        <Card key={c.id} style={{ gap: spacing.md }}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {c.reference_month ? longMonth(c.reference_month) : c.type}
              </Text>
              <Text style={styles.cardSub}>{longDate(c.generated_at.slice(0, 10))}</Text>
            </View>
            {c.overall_grade ? (
              <View style={[styles.gradeChip, { backgroundColor: gradeColor(c.overall_grade) }]}>
                <Text style={styles.gradeChipText}>{c.overall_grade}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metrics}>
            <Metric label="Overall" value={pct(c.overall_percentage)} color={scoreColor(Number(c.overall_percentage))} />
            <Metric label="Attendance" value={pct(c.attendance_percentage)} color={scoreColor(Number(c.attendance_percentage))} />
            <Metric label="Rank" value={c.rank_in_class != null ? `#${c.rank_in_class}` : "—"} color={colors.navy} />
          </View>

          {c.teacher_remarks ? (
            <View style={styles.remark}>
              <Text style={styles.remarkText}>“{c.teacher_remarks}”</Text>
            </View>
          ) : null}

          {c.pdf_url ? (
            <PdfDownloadButton
              url={c.pdf_url}
              filename={`report-${c.reference_month ?? c.type}.pdf`}
            />
          ) : null}
        </Card>
      ))}
    </View>
  );
}

/**
 * Downloads the report PDF to the device and opens the native share/save sheet.
 * Uses downloadAndShare (auth-aware for same-host URLs; works with the public
 * report URLs too) instead of Linking.openURL, which can't save the file.
 */
function PdfDownloadButton({ url, filename }: { url: string; filename: string }) {
  const [downloading, setDownloading] = useState(false);
  return (
    <Pressable
      disabled={downloading}
      onPress={async () => {
        setDownloading(true);
        try {
          await downloadAndShare(url, filename);
        } finally {
          setDownloading(false);
        }
      }}
      style={({ pressed }) => [styles.pdfBtn, (pressed || downloading) && { opacity: 0.85 }]}
    >
      <Ionicons name="download-outline" size={16} color={colors.navy} />
      <Text style={styles.pdfText}>{downloading ? "Downloading…" : "Download PDF"}</Text>
    </Pressable>
  );
}

function SelfReport({ data }: { data: SelfReportData }) {
  const hasAnything =
    data.overall != null || data.exams.length > 0 || data.attendance.total_days > 0 || data.holistic != null;
  if (!hasAnything) {
    return (
      <Card>
        <EmptyState icon="document-text-outline" title="Nothing to summarise yet" subtitle="Record some marks and attendance to generate a summary." />
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Overall + attendance */}
      <Card style={styles.summary}>
        <ProgressRing
          value={data.overall?.percentage ?? 0}
          size={116}
          color={scoreColor(data.overall?.percentage ?? null)}
          centerLabel={
            data.overall?.grade ??
            (data.overall ? `${Math.round(data.overall.percentage)}%` : "—")
          }
          centerSub={
            data.overall?.grade
              ? `${Math.round(data.overall.percentage)}%`
              : data.overall
                ? "Overall"
                : "No marks"
          }
        />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Metric label="Overall" value={data.overall ? `${Math.round(data.overall.percentage)}%` : "—"} color={colors.navy} />
          <Metric
            label="Attendance"
            value={pct(data.attendance.percentage)}
            color={scoreColor(data.attendance.percentage)}
          />
          <Text style={styles.cardSub}>
            {data.attendance.present}/{data.attendance.total_days} days present
          </Text>
        </View>
      </Card>

      {/* Per-exam breakdown */}
      {data.exams.length > 0 ? (
        <View>
          <SectionHeader title="Exams" />
          <View style={{ gap: spacing.md }}>
            {data.exams.map((e, i) => (
              <Card key={i} style={{ gap: spacing.sm }}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{e.exam_name}</Text>
                    <Text style={styles.cardSub}>{longDate(e.exam_date)}</Text>
                  </View>
                  <Text style={[styles.examPct, { color: scoreColor(e.percentage) }]}>
                    {Math.round(e.percentage)}%
                  </Text>
                  {e.grade ? (
                    <View style={[styles.gradeChip, { backgroundColor: gradeColor(e.grade) }]}>
                      <Text style={styles.gradeChipText}>{e.grade}</Text>
                    </View>
                  ) : null}
                </View>
                {e.subjects.map((s, j) => (
                  <View key={j} style={styles.subjLine}>
                    <Text style={styles.subjName}>{s.subject}</Text>
                    <Text style={styles.subjMarks}>
                      {num(s.obtained)}/{num(s.maximum)}
                    </Text>
                    {s.grade ? <Pill label={s.grade} tone="navy" /> : null}
                  </View>
                ))}
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      {/* Holistic */}
      {data.holistic ? (
        <Card>
          <SectionHeader title="Holistic development" />
          <Text style={styles.cardSub}>
            {longMonth(data.holistic.period_month.slice(0, 7))} · avg {data.holistic.average.toFixed(1)}/10
          </Text>
          <View style={{ height: spacing.sm }} />
          {data.holistic.dimensions.map((d) => (
            <BarRow
              key={d.dimension}
              label={d.dimension}
              value={d.rating * 10}
              valueLabel={`${d.rating}/10`}
              color={scoreColor(d.rating * 10)}
            />
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { ...typography.h1, color: colors.ink, marginBottom: spacing.lg },

  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardTitle: { ...typography.h2, fontSize: 15, color: colors.ink },
  cardSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  metrics: { flexDirection: "row", gap: spacing.sm },
  metric: { flex: 1, gap: 2 },
  metricLabel: { ...typography.caption, color: colors.textMuted },
  metricValue: { fontSize: 18, fontWeight: "800" },

  remark: { backgroundColor: palette.primary50, borderRadius: radius.md, padding: spacing.md },
  remarkText: { ...typography.body, color: colors.text, fontStyle: "italic" },

  pdfBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md,
  },
  pdfText: { ...typography.label, color: colors.navy },

  summary: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  examPct: { fontSize: 16, fontWeight: "800" },

  subjLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  subjName: { ...typography.label, color: colors.text, flex: 1 },
  subjMarks: { ...typography.label, color: colors.textMuted },

  gradeChip: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, minWidth: 30, alignItems: "center" },
  gradeChipText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
