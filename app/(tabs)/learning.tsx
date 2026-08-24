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
 * Learning hub — fans out to the learning screens (courses, assignments, live
 * classes, workshops, certificates), mirroring the Academics/Health hubs. Each
 * row shows a lock hint when the enrolled student's plan doesn't include that
 * feature; independent (self) students are never locked. The destination
 * screens live at the app root (/courses, /assignments, …) and open over the
 * tab, exactly like the Home "Continue learning" shortcuts already do.
 */
export default function LearningHub() {
  const router = useRouter();
  const { user } = useAuth();
  const { source } = useEnrollment();

  const items: {
    href: Href;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    desc: string;
    feature?: string; // omitted for always-free features (courses)
  }[] = [
    { href: "/courses", icon: "book-outline", label: "Courses", desc: "Enrolled & available courses" },
    { href: "/assignments", icon: "clipboard-outline", label: "Assignments", desc: "Tasks to submit & track", feature: FEATURE.assignments },
    { href: "/live-classes", icon: "videocam-outline", label: "Live classes", desc: "Upcoming & past sessions", feature: FEATURE.liveClasses },
    { href: "/workshops", icon: "easel-outline", label: "Workshops", desc: "Hands-on learning events", feature: FEATURE.workshops },
    { href: "/certificates", icon: "ribbon-outline", label: "Certificates", desc: "Your earned certificates", feature: FEATURE.certificates },
    { href: "/advice", icon: "chatbubble-ellipses-outline", label: "Consultant Advice", desc: "Ask & view mentor advice", feature: FEATURE.advice },
    { href: "/feedback", icon: "star-outline", label: "Consultant Feedback", desc: "Feedback from your consultant", feature: FEATURE.feedback },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <SafeAreaView edges={["top"]}>
          <Text style={styles.heroTitle}>Learning</Text>
          <View style={{ marginTop: spacing.sm }}>
            <SourceBadge source={source} schoolLabel={user?.enrollment_id != null ? "School records" : null} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.pad}>
        {items.map((it) => {
          const locked = !!it.feature && source === "enrolled" && !hasFeature(user, it.feature);
          return (
            <Pressable
              key={it.label}
              onPress={() => router.push(locked ? "/subscription" : it.href)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
              accessibilityLabel={locked ? `${it.label} — locked, view plans` : it.label}
            >
              <View style={styles.rowIc}>
                <Ionicons name={it.icon} size={22} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Text style={styles.rowDesc}>{locked ? "Part of a plan — tap to upgrade" : it.desc}</Text>
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
