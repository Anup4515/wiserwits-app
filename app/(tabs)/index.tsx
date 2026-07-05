import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { useDashboard } from "@/api/hooks";
import { Card } from "@/components/ui";
import { StatTile, SectionHeader, SourceBadge, EmptyState } from "@/components/data-ui";
import { t } from "@/lib/copy";
import { time12, pct, scoreColor, gradeColor } from "@/lib/format";
import { gradients, colors, palette, spacing, radius, typography, shadow } from "@/theme";
import type { DashboardData } from "@/api/student-types";

/**
 * Home (mock 2) — navy hero + glance tiles, today's classes and recent marks.
 * One `/dashboard` call serves both enrolled (school) and independent (self)
 * students; the layout adapts to whichever block is present. Neutral copy (§9a).
 */
export default function Home() {
  const { user, accounts } = useAuth();
  const router = useRouter();
  const { query } = useDashboard();
  const data = query.data;
  const firstName = user?.name?.split(" ")[0];

  const school = data?.school ?? null;
  const self = data?.self ?? null;
  const attendancePct = school?.attendance.percentage ?? self?.attendance.percentage ?? null;
  const source = user?.enrollment_id != null ? "enrolled" : "self";

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <View style={styles.glow} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greet}>{t("home.greeting", { name: firstName })}</Text>
              <Text style={styles.plan} numberOfLines={1}>
                {data?.student.school_name
                  ? `${data.student.class_name ?? ""}${data.student.section_name ? " · " + data.student.section_name : ""} · ${data.student.school_name}`
                  : user?.plan_name ?? "Self-tracked"}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/account-switcher")}
              hitSlop={8}
              style={styles.bell}
            >
              <Ionicons
                name={accounts.length > 1 ? "people-outline" : "notifications-outline"}
                size={20}
                color={colors.textInverse}
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
        }
      >
        {/* Glance tiles */}
        <View style={styles.statGrid}>
          <StatTile
            label="Attendance"
            icon="calendar-outline"
            tint={colors.greenBg}
            fg={colors.green}
            loading={query.isLoading}
            value={attendancePct != null ? `${attendancePct}%` : "—"}
          />
          <StatTile
            label={source === "enrolled" ? "Upcoming exams" : "Exams tracked"}
            icon="reader-outline"
            tint={colors.blueBg}
            fg={colors.blue}
            loading={query.isLoading}
            value={String(
              source === "enrolled"
                ? school?.upcoming_exams.length ?? 0
                : self?.exams.count ?? 0
            )}
          />
        </View>

        {query.isError ? (
          <Card>
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load your dashboard"
              subtitle="Pull to refresh once you're back online."
            />
          </Card>
        ) : null}

        {data ? <HomeBody data={data} school={school} self={self} source={source} /> : null}

        {/* Explore academics */}
        <View>
          <SectionHeader title="Explore" />
          <View style={styles.quickGrid}>
            <QuickLink icon="calendar-outline" label="Attendance" onPress={() => router.push("/(tabs)/academics/attendance")} />
            <QuickLink icon="reader-outline" label="Exams" onPress={() => router.push("/(tabs)/academics/exams")} />
            <QuickLink icon="document-text-outline" label="Report" onPress={() => router.push("/(tabs)/academics/report")} />
            <QuickLink icon="time-outline" label="Timetable" onPress={() => router.push("/(tabs)/academics/timetable")} />
            <QuickLink icon="today-outline" label="Calendar" onPress={() => router.push("/(tabs)/academics/calendar")} />
            <QuickLink icon="stats-chart-outline" label="Insights" onPress={() => router.push("/(tabs)/insights")} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function HomeBody({
  data,
  school,
  self,
  source,
}: {
  data: DashboardData;
  school: DashboardData["school"];
  self: DashboardData["self"];
  source: "enrolled" | "self";
}) {
  const router = useRouter();
  const today = school?.today_timetable ?? [];
  const todaySelf = self?.today_timetable ?? [];
  const recent = school?.recent_marks ?? [];
  const recentSelf = self?.recent_marks ?? [];

  return (
    <>
      {/* Today's classes */}
      <Card style={{ gap: spacing.md }}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Today's classes</Text>
          <SourceBadge source={source} schoolLabel={data.student.school_name} />
        </View>
        {source === "enrolled" ? (
          today.length === 0 ? (
            <Text style={styles.muted}>No classes scheduled today.</Text>
          ) : (
            today
              .filter((p) => p.subject_name)
              .map((p) => (
                <ClassRow
                  key={p.period_number}
                  time={`${time12(p.start_time)}`}
                  subject={p.subject_name ?? p.label ?? "—"}
                  meta={[p.teacher_name, p.room_number].filter(Boolean).join(" · ")}
                />
              ))
          )
        ) : todaySelf.length === 0 ? (
          <Text style={styles.muted}>No classes scheduled today.</Text>
        ) : (
          todaySelf.map((p, i) => (
            <ClassRow
              key={i}
              time={time12(p.start_time)}
              subject={p.subject}
              meta={[p.teacher_name, p.location].filter(Boolean).join(" · ")}
            />
          ))
        )}
      </Card>

      {/* Recent marks */}
      <Card style={{ gap: spacing.sm }}>
        <SectionHeader
          title="Recent marks"
          action="See all"
          onAction={() => router.push("/(tabs)/academics/exams")}
        />
        {source === "enrolled" ? (
          recent.length === 0 ? (
            <Text style={styles.muted}>No marks published yet.</Text>
          ) : (
            recent.slice(0, 4).map((m, i) => (
              <MarkRow
                key={i}
                subject={m.subject_name}
                exam={m.exam_name}
                percentage={pct(m.percentage)}
                grade={m.grade}
                pctNum={parseFloat(m.percentage)}
              />
            ))
          )
        ) : recentSelf.length === 0 ? (
          <Text style={styles.muted}>No marks recorded yet.</Text>
        ) : (
          recentSelf.slice(0, 4).map((m, i) => {
            const p = Number(m.maximum) > 0 ? (Number(m.obtained) / Number(m.maximum)) * 100 : null;
            return (
              <MarkRow
                key={i}
                subject={m.subject}
                exam={m.exam_name}
                percentage={pct(p)}
                grade={m.grade}
                pctNum={p ?? 0}
              />
            );
          })
        )}
      </Card>
    </>
  );
}

function ClassRow({ time, subject, meta }: { time: string; subject: string; meta: string }) {
  return (
    <View style={styles.classRow}>
      <View style={styles.timePill}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.classSubject}>{subject}</Text>
        {meta ? <Text style={styles.classMeta}>{meta}</Text> : null}
      </View>
    </View>
  );
}

function MarkRow({
  subject,
  exam,
  percentage,
  grade,
  pctNum,
}: {
  subject: string;
  exam: string;
  percentage: string;
  grade: string | null;
  pctNum: number;
}) {
  return (
    <View style={styles.markRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.classSubject}>{subject}</Text>
        <Text style={styles.classMeta} numberOfLines={1}>{exam}</Text>
      </View>
      <Text style={[styles.markPct, { color: scoreColor(pctNum) }]}>{percentage}</Text>
      {grade ? (
        <View style={[styles.gradeChip, { backgroundColor: gradeColor(grade) }]}>
          <Text style={styles.gradeChipText}>{grade}</Text>
        </View>
      ) : null}
    </View>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quick, pressed && { opacity: 0.85 }]}>
      <View style={styles.quickIc}>
        <Ionicons name={icon} size={20} color={colors.navy} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 180, height: 180, borderRadius: 90,
    right: -40, top: -50, backgroundColor: "rgba(240,194,39,0.18)",
  },
  heroTop: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: spacing.md, paddingBottom: spacing.xs, gap: spacing.md,
  },
  greet: { color: colors.textInverse, fontSize: 21, fontWeight: "800" },
  plan: { color: "#b9c0e0", fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  bell: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },

  scroll: { flex: 1 },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  statGrid: { flexDirection: "row", gap: spacing.md },

  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  cardTitle: { ...typography.h2, color: colors.ink },
  muted: { ...typography.body, color: colors.textMuted },

  classRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  timePill: {
    backgroundColor: palette.primary50, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 5, minWidth: 68, alignItems: "center",
  },
  timeText: { ...typography.caption, color: colors.navy, fontWeight: "700" },
  classSubject: { ...typography.label, color: colors.ink, fontSize: 13.5 },
  classMeta: { ...typography.caption, color: colors.textMuted },

  markRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  markPct: { fontSize: 15, fontWeight: "800" },
  gradeChip: { borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 2, minWidth: 26, alignItems: "center" },
  gradeChipText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  quick: {
    width: "30%", flexGrow: 1, minWidth: 96,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: "center", gap: spacing.sm,
    ...shadow.card,
  },
  quickIc: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: palette.primary50,
    alignItems: "center", justifyContent: "center",
  },
  quickLabel: { ...typography.label, color: colors.text },
});
