import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { useDashboard } from "@/api/hooks";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar, Card } from "@/components/ui";
import { SectionHeader, SourceBadge, EmptyState } from "@/components/data-ui";
import { t } from "@/lib/copy";
import { time12, pct, scoreColor, gradeColor } from "@/lib/format";
import { gradients, colors, palette, spacing, radius, typography, shadow } from "@/theme";
import type { DashboardData } from "@/api/student-types";

/**
 * Home (mock 2, modernised) — a navy gradient hero with a time-aware greeting
 * and avatar, a row of glance stats that FLOAT over the hero's lower edge, and
 * below it today's classes (as a timeline), recent marks, an upgrade nudge for
 * free accounts, and a colourful Explore launcher. One `/dashboard` call serves
 * both enrolled (school) and independent (self) students; the layout adapts to
 * whichever block is present. Neutral copy (§9a).
 */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Good morning" / "Good afternoon" / "Good evening" by local hour. */
function partOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** "Tue, 7 Jul" — short so the hero eyebrow stays on one line. */
function todayLabel(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

interface ExploreItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href: Href;
  tint: string;
  fg: string;
}

const EXPLORE: ExploreItem[] = [
  { icon: "notifications-outline", label: "Activity", href: "/feed", tint: colors.amberBg, fg: colors.amber },
  { icon: "calendar-outline", label: "Attendance", href: "/(tabs)/academics/attendance", tint: colors.greenBg, fg: colors.green },
  { icon: "reader-outline", label: "Exams", href: "/(tabs)/academics/exams", tint: colors.blueBg, fg: colors.blue },
  { icon: "clipboard-outline", label: "Assignments", href: "/assignments", tint: palette.accent100, fg: palette.accent600 },
  { icon: "heart-outline", label: "Health", href: "/health", tint: colors.redBg, fg: colors.red },
  { icon: "chatbubbles-outline", label: "Advice", href: "/advice", tint: palette.primary50, fg: colors.navy },
  { icon: "document-text-outline", label: "Report", href: "/(tabs)/academics/report", tint: colors.blueBg, fg: colors.blue },
  { icon: "time-outline", label: "Timetable", href: "/(tabs)/academics/timetable", tint: colors.greenBg, fg: colors.green },
  { icon: "today-outline", label: "Calendar", href: "/(tabs)/academics/calendar", tint: colors.amberBg, fg: colors.amber },
  { icon: "stats-chart-outline", label: "Insights", href: "/(tabs)/insights", tint: palette.accent100, fg: palette.accent600 },
  { icon: "card-outline", label: "Plans", href: "/subscription", tint: palette.primary50, fg: colors.navy },
];

export default function Home() {
  const { user, accounts } = useAuth();
  const router = useRouter();
  const { query } = useDashboard();
  const data = query.data;
  const firstName = user?.name?.split(" ")[0];

  const school = data?.school ?? null;
  const self = data?.self ?? null;
  const source = user?.enrollment_id != null ? "enrolled" : "self";

  const attendancePct = school?.attendance.percentage ?? self?.attendance.percentage ?? null;
  const examsCount =
    source === "enrolled" ? school?.upcoming_exams.length ?? 0 : self?.exams.count ?? 0;
  const classesToday =
    source === "enrolled"
      ? school?.today_timetable.filter((p) => p.subject_name).length ?? 0
      : self?.today_timetable?.length ?? 0;

  const subtitle = data?.student.school_name
    ? `${data.student.class_name ?? ""}${data.student.section_name ? " · " + data.student.section_name : ""} · ${data.student.school_name}`
    : user?.plan_name ?? "Self-tracked";

  const showUpgrade = user != null && user.plan_id == null && source !== "enrolled";

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <View style={styles.glow} />
        <View style={styles.glow2} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.heroTop}>
            <View style={styles.heroIdentity}>
              <Avatar name={user?.name ?? "?"} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow} numberOfLines={1}>
                  {partOfDay()} · {todayLabel()}
                </Text>
                <Text style={styles.greet} numberOfLines={1}>
                  {t("home.greeting", { name: firstName })}
                </Text>
                <Text style={styles.plan} numberOfLines={1}>{subtitle}</Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <NotificationBell />
              <Pressable
                onPress={() => router.push("/account-switcher")}
                hitSlop={8}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={accounts.length > 1 ? "Switch account" : "Add account"}
              >
                <Ionicons
                  name={accounts.length > 1 ? "people-outline" : "person-add-outline"}
                  size={20}
                  color={colors.textInverse}
                />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.pad}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.navy} />
        }
      >
        {/* Floating glance stats — overlap the hero's lower edge */}
        <View style={styles.statRow}>
          <HeroStat
            label="Attendance"
            value={attendancePct != null ? `${attendancePct}%` : "—"}
            icon="pulse-outline"
            tint={colors.greenBg}
            fg={colors.green}
            loading={query.isLoading}
          />
          <HeroStat
            label={source === "enrolled" ? "Upcoming" : "Exams"}
            value={String(examsCount)}
            icon="reader-outline"
            tint={colors.blueBg}
            fg={colors.blue}
            loading={query.isLoading}
          />
          <HeroStat
            label="Classes today"
            value={String(classesToday)}
            icon="today-outline"
            tint={palette.accent100}
            fg={palette.accent600}
            loading={query.isLoading}
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

        {showUpgrade ? <UpgradeCard onPress={() => router.push("/subscription")} /> : null}

        {data ? <HomeBody data={data} school={school} self={self} source={source} /> : null}

        {/* Explore launcher */}
        <View>
          <SectionHeader title="Explore" />
          <View style={styles.exploreGrid}>
            {EXPLORE.map((e) => (
              <ExploreTile key={e.label} item={e} onPress={() => router.push(e.href)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Floating glance stat ─────────────────────────────────────────────────────
function HeroStat({
  label,
  value,
  icon,
  tint,
  fg,
  loading,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  fg: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIc, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={16} color={fg} />
      </View>
      {loading ? <View style={styles.statSkeleton} /> : <Text style={styles.statVal}>{value}</Text>}
      <Text style={styles.statLab}>{label}</Text>
    </View>
  );
}

// ── Upgrade nudge (free accounts) ────────────────────────────────────────────
function UpgradeCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.92 }}>
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.upgrade}
      >
        <View style={styles.upgradeIc}>
          <Ionicons name="sparkles" size={20} color={palette.primary700} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.upgradeTitle}>Unlock everything</Text>
          <Text style={styles.upgradeSub}>Attendance, marks, health & more with a plan.</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={palette.primary700} />
      </LinearGradient>
    </Pressable>
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

  const enrolledClasses = today.filter((p) => p.subject_name);
  const hasClasses = source === "enrolled" ? enrolledClasses.length > 0 : todaySelf.length > 0;

  return (
    <>
      {/* Today's classes */}
      <Card style={{ gap: spacing.md }}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Today's classes</Text>
          <SourceBadge source={source} schoolLabel={data.student.school_name} />
        </View>
        {!hasClasses ? (
          <EmptyState icon="cafe-outline" title="Nothing scheduled" subtitle="Enjoy the free time today." />
        ) : source === "enrolled" ? (
          <View style={styles.timeline}>
            {enrolledClasses.map((p, i) => (
              <ClassRow
                key={p.period_number}
                time={time12(p.start_time)}
                subject={p.subject_name ?? p.label ?? "—"}
                meta={[p.teacher_name, p.room_number].filter(Boolean).join(" · ")}
                first={i === 0}
                last={i === enrolledClasses.length - 1}
              />
            ))}
          </View>
        ) : (
          <View style={styles.timeline}>
            {todaySelf.map((p, i) => (
              <ClassRow
                key={i}
                time={time12(p.start_time)}
                subject={p.subject}
                meta={[p.teacher_name, p.location].filter(Boolean).join(" · ")}
                first={i === 0}
                last={i === todaySelf.length - 1}
              />
            ))}
          </View>
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
            <EmptyState icon="ribbon-outline" title="No marks yet" subtitle="Published marks will show up here." />
          ) : (
            recent.slice(0, 4).map((m, i) => (
              <MarkRow
                key={i}
                subject={m.subject_name}
                exam={m.exam_name}
                percentage={pct(m.percentage)}
                grade={m.grade}
                pctNum={parseFloat(m.percentage)}
                divider={i > 0}
              />
            ))
          )
        ) : recentSelf.length === 0 ? (
          <EmptyState icon="ribbon-outline" title="No marks yet" subtitle="Record marks to track your progress." />
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
                divider={i > 0}
              />
            );
          })
        )}
      </Card>
    </>
  );
}

function ClassRow({
  time,
  subject,
  meta,
  first,
  last,
}: {
  time: string;
  subject: string;
  meta: string;
  first: boolean;
  last: boolean;
}) {
  return (
    <View style={styles.classRow}>
      <View style={styles.rail}>
        {!first ? <View style={styles.railLineTop} /> : <View style={styles.railSpacer} />}
        <View style={styles.railDot} />
        {!last ? <View style={styles.railLineBottom} /> : <View style={styles.railSpacer} />}
      </View>
      <View style={styles.timePill}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.classSubject} numberOfLines={1}>{subject}</Text>
        {meta ? <Text style={styles.classMeta} numberOfLines={1}>{meta}</Text> : null}
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
  divider,
}: {
  subject: string;
  exam: string;
  percentage: string;
  grade: string | null;
  pctNum: number;
  divider: boolean;
}) {
  return (
    <View style={[styles.markRow, divider && styles.markDivider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.classSubject} numberOfLines={1}>{subject}</Text>
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

function ExploreTile({ item, onPress }: { item: ExploreItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
      <View style={[styles.tileIc, { backgroundColor: item.tint }]}>
        <Ionicons name={item.icon} size={21} color={item.fg} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>{item.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 200, height: 200, borderRadius: 100,
    right: -50, top: -60, backgroundColor: "rgba(240,194,39,0.18)",
  },
  glow2: {
    position: "absolute",
    width: 150, height: 150, borderRadius: 75,
    left: -50, bottom: -30, backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroTop: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: spacing.md, gap: spacing.sm,
  },
  heroIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eyebrow: { color: "#aeb6dc", fontSize: 11.5, fontWeight: "700", letterSpacing: 0.2 },
  greet: { color: colors.textInverse, fontSize: 20, fontWeight: "800", marginTop: 3 },
  plan: { color: "#b9c0e0", fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  scroll: { flex: 1 },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  // Glance stats sit cleanly below the hero (no overlap — reliable on Android).
  statRow: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadow.card,
  },
  statIc: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  statVal: { fontSize: 22, fontWeight: "800", color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  statLab: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  statSkeleton: { height: 22, width: "60%", borderRadius: 6, backgroundColor: "#eef1f6", marginTop: 4 },

  upgrade: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderRadius: radius.lg, padding: spacing.lg, ...shadow.gold,
  },
  upgradeIc: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  upgradeTitle: { fontSize: 15, fontWeight: "800", color: palette.primary700 },
  upgradeSub: { fontSize: 12, fontWeight: "600", color: palette.primary700, opacity: 0.85, marginTop: 1 },

  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  cardTitle: { ...typography.h2, color: colors.ink },

  // Timeline
  timeline: { gap: 2 },
  classRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 46 },
  rail: { width: 12, alignSelf: "stretch", alignItems: "center" },
  railSpacer: { flex: 1 },
  railLineTop: { flex: 1, width: 2, backgroundColor: colors.border },
  railLineBottom: { flex: 1, width: 2, backgroundColor: colors.border },
  railDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.gold, borderWidth: 2, borderColor: "#fff" },
  timePill: {
    backgroundColor: palette.primary50, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 5, minWidth: 68, alignItems: "center",
  },
  timeText: { ...typography.caption, color: colors.navy, fontWeight: "700" },
  classSubject: { ...typography.label, color: colors.ink, fontSize: 13.5 },
  classMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },

  markRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
  markDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: 2 },
  markPct: { fontSize: 15, fontWeight: "800" },
  gradeChip: { borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 2, minWidth: 26, alignItems: "center" },
  gradeChipText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  // Explore launcher
  exploreGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg, columnGap: spacing.sm },
  tile: { width: "22%", alignItems: "center", gap: spacing.xs },
  tileIc: {
    width: 54, height: 54, borderRadius: radius.lg,
    alignItems: "center", justifyContent: "center",
    ...shadow.card,
  },
  tileLabel: { ...typography.caption, color: colors.text, fontWeight: "600" },
});
