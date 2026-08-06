import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { useDashboard, useTimetable } from "@/api/hooks";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar, Card } from "@/components/ui";
import { SectionHeader, SourceBadge, EmptyState } from "@/components/data-ui";
import { t } from "@/lib/copy";
import { time12, pct, scoreColor, gradeColor, isGraded, shortMonth } from "@/lib/format";
import { HOME_EXPLORE, type ExploreItem } from "@/lib/explore";
import { gradients, colors, palette, spacing, radius, typography, shadow } from "@/theme";
import type { DashboardData, TimetableData, SelfTimetableRow } from "@/api/student-types";

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

/** A single class row after both sources are normalised to one shape. */
type DisplayClass = { key: string | number; time: string; subject: string; meta: string };

/** "HH:MM[:SS]" → minutes since midnight; -1 when empty/unparseable. */
function hmsToMinutes(hms: string | null | undefined): number {
  if (!hms) return -1;
  const [h, m] = hms.split(":");
  const mins = Number(h) * 60 + Number(m ?? 0);
  return Number.isFinite(mins) ? mins : -1;
}

/** Current local time as minutes since midnight — the flip clock. */
function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Parse "YYYY-MM-DD" as a LOCAL date (avoids the UTC-midnight day shift). */
function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** "Today" / "Tomorrow" / "Wed, 6 Aug" for a local date. */
function relDay(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const n = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "5:00 PM" from a Date. */
function clock(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${s}`;
}

/**
 * Tomorrow's classes derived from the weekly timetable grid. Enrolled joins the
 * day's subject slots onto the period rows for their start times; self filters
 * the flat recurring rows. Both normalise to DisplayClass and sort by the raw
 * (24h) start time before formatting. Weekday conventions differ per source:
 * enrolled slots are 1=Sun..7=Sat, self rows and JS getDay() are 0=Sun..6=Sat.
 */
function tomorrowClasses(
  data: TimetableData | SelfTimetableRow[] | undefined,
  source: "enrolled" | "self",
): DisplayClass[] {
  if (!data) return [];
  const jsTomorrow = (new Date().getDay() + 1) % 7; // 0=Sun..6=Sat
  if (source === "enrolled") {
    const grid = data as TimetableData;
    const periodStart = new Map(grid.periods.map((p) => [p.period_number, p.start_time]));
    return grid.slots
      .filter((s) => s.day_of_week === jsTomorrow + 1 && s.subject_name)
      .map((s) => ({ s, start: periodStart.get(s.period_number) ?? "" }))
      .sort((a, b) => a.start.localeCompare(b.start))
      .map(({ s, start }) => ({
        key: s.period_number,
        time: time12(start),
        subject: s.subject_name ?? "—",
        meta: [s.teacher_name, s.room_number].filter(Boolean).join(" · "),
      }));
  }
  return (data as SelfTimetableRow[])
    .filter((r) => r.day_of_week === jsTomorrow)
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((r) => ({
      key: r.id,
      time: time12(r.start_time),
      subject: r.subject,
      meta: [r.teacher_name, r.location].filter(Boolean).join(" · "),
    }));
}

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

  // Holistic rating for the most recent rated month (typically the previous
  // month, since the current one isn't rated yet). Enrolled is normalised to a
  // percentage; self is a raw average rating.
  const holisticMonth = school?.holistic_month ?? null;
  const holisticValue =
    source === "enrolled"
      ? holisticMonth?.avg_pct != null
        ? `${holisticMonth.avg_pct}%`
        : "—"
      : self?.holistic.avg != null
        ? String(self.holistic.avg)
        : "—";
  // The month the holistic figure covers — the most recent RATED month, which
  // is normally the previous month (the current month isn't rated yet). Shown
  // as the tile's sub-caption so it's clear which month the % is for.
  const holisticMonthLabel =
    source === "enrolled" ? holisticMonth?.month ?? null : self?.holistic.month ?? null;

  const showUpgrade = user != null && user.plan_id == null && source !== "enrolled";

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <View style={styles.glow} />
        <View style={styles.glow2} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.heroTop}>
            <View style={styles.heroIdentity}>
              <Pressable
                onPress={() => router.push("/profile-details")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View profile"
              >
                <Avatar name={user?.name ?? "?"} size={44} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow} numberOfLines={1}>
                  {partOfDay()} · {todayLabel()}
                </Text>
                <Text style={styles.greet} numberOfLines={1}>
                  {t("home.greeting", { name: firstName })}
                </Text>
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
            sub={source === "enrolled" ? "This session" : "Overall"}
            value={attendancePct != null ? `${attendancePct}%` : "—"}
            icon="pulse-outline"
            tint={colors.greenBg}
            fg={colors.green}
            loading={query.isLoading}
          />
          <HeroStat
            label={source === "enrolled" ? "Upcoming exams" : "Recorded exams"}
            value={String(examsCount)}
            icon="reader-outline"
            tint={colors.blueBg}
            fg={colors.blue}
            loading={query.isLoading}
          />
          <HeroStat
            label="Holistic"
            sub={holisticMonthLabel ? shortMonth(holisticMonthLabel) : undefined}
            value={holisticValue}
            icon="sparkles-outline"
            tint={palette.accent100}
            fg={palette.accent600}
            loading={query.isLoading}
          />
        </View>

        {query.isError ? (
          <Card>
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load the dashboard"
              subtitle="Pull to refresh once you're back online."
            />
          </Card>
        ) : null}

        {showUpgrade ? <UpgradeCard onPress={() => router.push("/subscription")} /> : null}

        {data ? <HomeBody data={data} school={school} self={self} source={source} /> : null}

        {/* Explore launcher — Home shows two tidy rows: the curated
            HOME_EXPLORE shortlist plus a "View all" tile that opens the
            full list. See /explore-all. */}
        <View>
          <SectionHeader title="Explore" />
          <View style={styles.exploreGrid}>
            {HOME_EXPLORE.map((e) => (
              <ExploreTile key={e.label} item={e} onPress={() => router.push(e.href)} />
            ))}
            <ViewAllTile onPress={() => router.push("/explore-all")} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Floating glance stat ─────────────────────────────────────────────────────
function HeroStat({
  label,
  sub,
  value,
  icon,
  tint,
  fg,
  loading,
}: {
  label: string;
  /** Optional qualifier under the label (e.g. the period the value covers). */
  sub?: string;
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
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
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
  const recent = school?.recent_marks ?? [];
  const recentSelf = self?.recent_marks ?? [];
  const personal = data.personal;

  // Tolerate an older backend that predates these fields (nullish fallbacks).
  const liveClass = personal.next_live_class ?? null;
  const reminder = personal.next_reminder ?? null;
  const hasUpNext = liveClass != null || reminder != null;
  const courses = personal.enrolled_courses ?? [];

  // ── Classes card: today's full list until the last period ends, then flip ──
  // The card shows every one of today's classes right up to the last period's
  // end time, then flips (title + data) to tomorrow's schedule. Today comes
  // from the dashboard payload; tomorrow is derived client-side from the weekly
  // timetable grid, which is only fetched once we've actually flipped.
  const todayDisplay: DisplayClass[] =
    source === "enrolled"
      ? (school?.today_timetable ?? [])
          .filter((p) => p.subject_name)
          .map((p) => ({
            key: p.period_number,
            time: time12(p.start_time),
            subject: p.subject_name ?? p.label ?? "—",
            meta: [p.teacher_name, p.room_number].filter(Boolean).join(" · "),
          }))
      : (self?.today_timetable ?? []).map((p, i) => ({
          key: i,
          time: time12(p.start_time),
          subject: p.subject,
          meta: [p.teacher_name, p.location].filter(Boolean).join(" · "),
        }));

  // Latest end_time among today's classes (minutes since midnight); -1 if none.
  const lastEnd = (
    source === "enrolled" ? school?.today_timetable ?? [] : self?.today_timetable ?? []
  ).reduce((max, p) => Math.max(max, hmsToMinutes(p.end_time)), -1);

  // Flip once today's last class has ended — or immediately if nothing today.
  const showTomorrow = todayDisplay.length === 0 || nowMinutes() >= lastEnd;

  // Only hit the weekly-timetable endpoint when we actually need tomorrow.
  const tt = useTimetable(showTomorrow);
  const displayClasses = showTomorrow ? tomorrowClasses(tt.query.data, source) : todayDisplay;
  const cardTitle = showTomorrow ? "Tomorrow's classes" : "Today's classes";
  const loadingTomorrow = showTomorrow && tt.query.isLoading;

  return (
    <>
      {/* Classes — today's list until the last period ends, then tomorrow's */}
      <Card style={{ gap: spacing.md }}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{cardTitle}</Text>
          <SourceBadge source={source} schoolLabel={data.student.school_name} />
        </View>
        {loadingTomorrow ? (
          <EmptyState icon="time-outline" title="Loading…" subtitle="Fetching tomorrow's schedule." />
        ) : displayClasses.length === 0 ? (
          <EmptyState
            icon="cafe-outline"
            title="Nothing scheduled"
            subtitle={showTomorrow ? "Nothing on the timetable for tomorrow." : "Enjoy the free time today."}
          />
        ) : (
          <View style={styles.timeline}>
            {displayClasses.map((c, i) => (
              <ClassRow
                key={c.key}
                time={c.time}
                subject={c.subject}
                meta={c.meta}
                first={i === 0}
                last={i === displayClasses.length - 1}
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
          <EmptyState icon="ribbon-outline" title="No marks yet" subtitle="Record marks to track progress." />
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

      {/* Up next — nearest live class + health appointment (learning + health) */}
      {hasUpNext ? (
        <Card style={{ gap: spacing.sm }}>
          <SectionHeader title="Up next" />
          {liveClass ? (
            <UpNextRow
              icon="videocam-outline"
              tint={colors.redBg}
              fg={colors.red}
              title={liveClass.title}
              meta={`${relDay(new Date(liveClass.start_time))} · ${clock(new Date(liveClass.start_time))}`}
              onPress={() => router.push("/live-classes")}
            />
          ) : null}
          {reminder ? (
            <UpNextRow
              icon="medkit-outline"
              tint={colors.greenBg}
              fg={colors.green}
              title={reminder.title}
              meta={relDay(parseYmd(reminder.appointment_date))}
              onPress={() => router.push("/reminders")}
              divider={liveClass != null}
            />
          ) : null}
        </Card>
      ) : null}

      {/* Continue learning — most recent enrolled courses */}
      {courses.length > 0 ? (
        <Card style={{ gap: spacing.sm }}>
          <SectionHeader title="Continue learning" action="See all" onAction={() => router.push("/courses")} />
          {courses.slice(0, 3).map((c, i) => (
            <UpNextRow
              key={c.id}
              icon="play-circle-outline"
              tint={palette.accent100}
              fg={palette.accent600}
              title={c.title}
              meta="Tap to resume"
              onPress={() => router.push(`/course/${c.slug}`)}
              divider={i > 0}
            />
          ))}
        </Card>
      ) : null}
    </>
  );
}

function UpNextRow({
  icon,
  tint,
  fg,
  title,
  meta,
  onPress,
  divider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  fg: string;
  title: string;
  meta: string;
  onPress: () => void;
  divider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.upRow, divider && styles.upDivider, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.upIc, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.classSubject} numberOfLines={1}>{title}</Text>
        <Text style={styles.classMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
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
      {isGraded(grade) ? (
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

/** The 8th Home tile: opens the full Explore list at /explore-all. */
function ViewAllTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
      <View style={[styles.tileIc, styles.viewAllIc]}>
        <Ionicons name="ellipsis-horizontal" size={21} color={colors.navy} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>View all</Text>
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
  statSub: { fontSize: 10, color: colors.textMuted, opacity: 0.8, marginTop: 1 },
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

  // Up next / continue learning rows
  upRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  upDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: 2 },
  upIc: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },

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
  viewAllIc: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  tileLabel: { ...typography.caption, color: colors.text, fontWeight: "600" },
});
