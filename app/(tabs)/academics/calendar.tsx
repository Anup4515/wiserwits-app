import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useCalendar } from "@/api/hooks";
import { FEATURE } from "@/lib/features";
import { Card, Pill } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { MonthStepper, SectionHeader, EmptyState } from "@/components/data-ui";
import { longMonth, currentMonth, addMonths, shortDate, time12 } from "@/lib/format";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type {
  CalendarData,
  SelfCalendarData,
  CalendarWorkshop,
  CalendarLiveClass,
} from "@/api/student-types";

/**
 * Calendar (backed, unmocked — plan §7). Month-scoped. Enrolled shows the school
 * calendar (working days / holidays summary + holiday list); self has no school
 * calendar, so it just overlays the month's workshops and live classes. Both
 * share the workshop / live-class sections.
 */
export default function CalendarScreen() {
  const [month, setMonth] = useState(currentMonth());
  const result = useCalendar(month);
  const { query } = result;

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <MonthStepper
        label={longMonth(month)}
        onPrev={() => setMonth((m) => addMonths(m, -1))}
        onNext={() => setMonth((m) => addMonths(m, 1))}
      />

      <QueryView result={result} feature={FEATURE.calendar}>
        {(data, source) =>
          source === "enrolled" ? (
            <EnrolledCalendar data={data as CalendarData} />
          ) : (
            <SelfCalendar data={data as SelfCalendarData} />
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function EnrolledCalendar({ data }: { data: CalendarData }) {
  const holidays = data.days.filter((d) => d.is_holiday === 1);
  return (
    <>
      <View style={{ height: spacing.lg }} />
      <Card style={styles.summary}>
        <SummaryStat label="Working days" value={data.summary.total_working_days} color={colors.green} icon="briefcase-outline" />
        <View style={styles.summaryDivider} />
        <SummaryStat label="Holidays" value={data.summary.total_holidays} color={colors.red} icon="sunny-outline" />
      </Card>

      {holidays.length > 0 ? (
        <>
          <View style={{ height: spacing.lg }} />
          <SectionHeader title="Holidays" />
          <Card style={{ paddingVertical: spacing.xs }}>
            {holidays.map((d, i) => (
              <View key={d.date} style={[styles.holidayRow, i > 0 && styles.divider]}>
                <View style={styles.holidayDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.holidayName}>{d.holiday_reason || "Holiday"}</Text>
                  <Text style={styles.holidayDate}>{d.day_of_week}, {shortDate(d.date)}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <EventSections workshops={data.workshops} liveClasses={data.liveClasses} />
    </>
  );
}

function SelfCalendar({ data }: { data: SelfCalendarData }) {
  const nothing = data.workshops.length === 0 && data.liveClasses.length === 0;
  return (
    <>
      <View style={{ height: spacing.lg }} />
      <Card>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.blue} />
          <Text style={styles.infoText}>
            Your weekly classes are on the Timetable screen. This month's workshops and
            live classes show below.
          </Text>
        </View>
      </Card>
      {nothing ? (
        <>
          <View style={{ height: spacing.lg }} />
          <Card>
            <EmptyState icon="today-outline" title="Nothing scheduled" subtitle="No workshops or live classes this month." />
          </Card>
        </>
      ) : (
        <EventSections workshops={data.workshops} liveClasses={data.liveClasses} />
      )}
    </>
  );
}

function EventSections({
  workshops,
  liveClasses,
}: {
  workshops: CalendarWorkshop[];
  liveClasses: CalendarLiveClass[];
}) {
  return (
    <>
      {liveClasses.length > 0 ? (
        <>
          <View style={{ height: spacing.lg }} />
          <SectionHeader title="Live classes" />
          <View style={{ gap: spacing.md }}>
            {liveClasses.map((lc) => (
              <Card key={lc.id} style={{ gap: spacing.sm }}>
                <View style={styles.eventHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{lc.title}</Text>
                    <Text style={styles.eventMeta}>
                      {shortDate(lc.start_date)}
                      {lc.duration_minutes ? ` · ${lc.duration_minutes} min` : ""}
                    </Text>
                  </View>
                  <LiveStatus status={lc.status} />
                </View>
                {lc.description ? <Text style={styles.eventDesc}>{lc.description}</Text> : null}
                <View style={styles.eventActions}>
                  {lc.join_link ? <LinkBtn icon="videocam-outline" label="Join" url={lc.join_link} /> : null}
                  {lc.recording_url ? <LinkBtn icon="play-circle-outline" label="Recording" url={lc.recording_url} /> : null}
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {workshops.length > 0 ? (
        <>
          <View style={{ height: spacing.lg }} />
          <SectionHeader title="Workshops" />
          <View style={{ gap: spacing.md }}>
            {workshops.map((w) => (
              <Card key={w.id} style={{ gap: spacing.sm }}>
                <Text style={styles.eventTitle}>{w.title}</Text>
                <Text style={styles.eventMeta}>{shortDate(w.start_date)}</Text>
                {w.description ? <Text style={styles.eventDesc}>{w.description}</Text> : null}
                {w.join_link ? (
                  <View style={styles.eventActions}>
                    <LinkBtn icon="open-outline" label="Open" url={w.join_link} />
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

function LiveStatus({ status }: { status: string }) {
  if (status === "live") return <Pill label="Live" tone="red" />;
  if (status === "scheduled") return <Pill label="Scheduled" tone="blue" />;
  return <Pill label={status} tone="navy" />;
}

function LinkBtn({ icon, label, url }: { icon: keyof typeof Ionicons.glyphMap; label: string; url: string }) {
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}>
      <Ionicons name={icon} size={15} color={colors.navy} />
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

function SummaryStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.summaryStat}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },

  summary: { flexDirection: "row", alignItems: "center" },
  summaryStat: { flex: 1, alignItems: "center", gap: 3 },
  summaryValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summaryDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.border },

  holidayRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  holidayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  holidayName: { ...typography.label, color: colors.ink, fontSize: 13.5 },
  holidayDate: { ...typography.caption, color: colors.textMuted, marginTop: 1 },

  infoRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  infoText: { ...typography.body, color: colors.textMuted, flex: 1 },

  eventHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eventTitle: { ...typography.h2, fontSize: 14.5, color: colors.ink },
  eventMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  eventDesc: { ...typography.body, color: colors.text },
  eventActions: { flexDirection: "row", gap: spacing.sm, marginTop: 2 },
  linkBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: palette.primary50, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  linkText: { ...typography.label, color: colors.navy },
});
