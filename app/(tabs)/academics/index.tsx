import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { useEnrollment } from "@/features/enrollment/EnrollmentContext";
import { SourceBadge } from "@/components/data-ui";
import { hasFeature, FEATURE } from "@/lib/features";
import { gradients, colors, palette, spacing, radius, typography, shadow } from "@/theme";

/**
 * Academics hub (plan §7) — fans out to the read screens. Each row shows a
 * lock hint when the enrolled student's plan doesn't include that feature;
 * independent (self) students are never locked (their `/self/*` routes are open).
 */
export default function AcademicsHub() {
  const router = useRouter();
  const { user } = useAuth();
  const { source } = useEnrollment();

  const items: {
    href: Href;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    desc: string;
    feature: string;
  }[] = [
    { href: "/(tabs)/academics/attendance", icon: "calendar-outline", label: "Attendance", desc: "Daily record & percentage", feature: FEATURE.attendance },
    { href: "/(tabs)/academics/exams", icon: "reader-outline", label: "Exams & Marks", desc: "Results by exam and subject", feature: FEATURE.exams },
    { href: "/(tabs)/academics/report", icon: "document-text-outline", label: "Report Card", desc: "Term summaries & grades", feature: FEATURE.report },
    { href: "/(tabs)/academics/timetable", icon: "time-outline", label: "Timetable", desc: "Weekly class schedule", feature: FEATURE.timetable },
    { href: "/(tabs)/academics/calendar", icon: "today-outline", label: "Calendar", desc: "Holidays, workshops & live classes", feature: FEATURE.calendar },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <SafeAreaView edges={["top"]}>
          <Text style={styles.heroTitle}>Academics</Text>
          <View style={{ marginTop: spacing.sm }}>
            <SourceBadge source={source} schoolLabel={user?.enrollment_id != null ? "School records" : null} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.pad}>
        {items.map((it) => {
          const locked = source === "enrolled" && !hasFeature(user, it.feature);
          return (
            <Pressable
              key={it.label}
              onPress={() => router.push(it.href)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.rowIc}>
                <Ionicons name={it.icon} size={22} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Text style={styles.rowDesc}>{it.desc}</Text>
              </View>
              {locked ? (
                <Ionicons name="lock-closed" size={16} color={colors.gold} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTitle: { color: colors.textInverse, fontSize: 24, fontWeight: "800", marginTop: spacing.sm },

  pad: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  rowIc: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: palette.primary50,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { ...typography.h2, fontSize: 15, color: colors.ink },
  rowDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
