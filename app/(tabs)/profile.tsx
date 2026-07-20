import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { Card, Avatar, Pill } from "@/components/ui";
import { colors, palette, spacing, radius, typography } from "@/theme";

/**
 * Profile (mock 10) — account header + management (switch / add / sign out,
 * §5a) plus entry points to learning, plans, settings and account security.
 */
export default function Profile() {
  const { user, accounts, signOut } = useAuth();
  const router = useRouter();
  const enrolled = user?.enrollment_id != null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Card style={styles.header}>
        <Pressable style={styles.searchBtn} onPress={() => router.push("/search")} accessibilityRole="button" accessibilityLabel="Search">
          <Ionicons name="search-outline" size={20} color={colors.navy} />
        </Pressable>
        <Avatar name={user?.name ?? "?"} size={64} />
        <Text style={styles.name}>{user?.name ?? "—"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.pills}>
          <Pill label={user?.plan_name ?? "Free plan"} tone="gold" />
          <Pill label={enrolled ? "Enrolled" : "Self-tracked"} tone={enrolled ? "navy" : "blue"} />
        </View>
      </Card>

      <Text style={styles.sectionH}>More</Text>
      <Card style={styles.list}>
        <Row
          icon="notifications-outline"
          title="Activity"
          subtitle="Your recent updates"
          onPress={() => router.push("/feed")}
        />
        <Row
          icon="heart-outline"
          title="Health & wellness"
          subtitle="BMI, consultations, diet & lab reports"
          onPress={() => router.push("/health")}
        />
        <Row
          icon="chatbubbles-outline"
          title="Advice & feedback"
          subtitle="Ask a consultant, read teacher feedback"
          onPress={() => router.push("/advice")}
        />
        <Row
          icon="clipboard-outline"
          title="Assignments"
          subtitle="Tasks and submissions"
          onPress={() => router.push("/assignments")}
        />
        <Row
          icon="people-circle-outline"
          title="Contributors"
          subtitle={enrolled ? "Managed by your school" : "People who can fill your data"}
          onPress={() => router.push("/contributors")}
          last
        />
      </Card>

      <Text style={styles.sectionH}>Learn</Text>
      <Card style={styles.list}>
        <Row
          icon="school-outline"
          title="Courses"
          subtitle="Browse, enrol and continue learning"
          onPress={() => router.push("/courses")}
        />
        <Row
          icon="videocam-outline"
          title="Live classes"
          subtitle="Upcoming and recorded sessions"
          onPress={() => router.push("/live-classes")}
        />
        <Row
          icon="easel-outline"
          title="Workshops"
          subtitle="Workshops & webinars"
          onPress={() => router.push("/workshops")}
        />
        <Row
          icon="ribbon-outline"
          title="Certificates"
          subtitle="Your earned certificates"
          onPress={() => router.push("/certificates")}
        />
        <Row
          icon="book-outline"
          title="Learn"
          subtitle="Articles & guides"
          onPress={() => router.push("/articles")}
        />
        <Row
          icon="alarm-outline"
          title="Reminders"
          subtitle="Appointments & tests"
          onPress={() => router.push("/reminders")}
          last
        />
      </Card>

      <Text style={styles.sectionH}>Account</Text>
      <Card style={styles.list}>
        <Row
          icon="card-outline"
          title="Plans & subscription"
          subtitle={user?.plan_name ? `Current: ${user.plan_name}` : "View and change your plan"}
          onPress={() => router.push("/subscription")}
        />
        <Row
          icon="lock-closed-outline"
          title="Account & Security"
          subtitle="Password and devices"
          onPress={() => router.push("/account-security")}
        />
        <Row
          icon="people-outline"
          title={accounts.length > 1 ? "Switch or manage accounts" : "Add another account"}
          subtitle={accounts.length > 1 ? `${accounts.length} accounts on this device` : "e.g. a sibling"}
          onPress={() => router.push("/account-switcher")}
        />
        <Row
          icon="help-circle-outline"
          title="Help & Legal"
          subtitle="Support, privacy and terms"
          onPress={() => router.push("/help")}
        />
        <Row icon="log-out-outline" title="Sign out" danger onPress={() => void signOut()} last />
      </Card>
    </ScrollView>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowIc, danger && { backgroundColor: colors.redBg }]}>
        <Ionicons name={icon} size={19} color={danger ? colors.red : colors.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.red }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md },
  header: { alignItems: "center", gap: spacing.xs },
  searchBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: palette.primary50,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  name: { ...typography.h1, color: colors.ink, marginTop: spacing.sm },
  email: { ...typography.body, color: colors.textMuted },
  pills: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },

  sectionH: { ...typography.label, color: colors.textMuted, marginTop: spacing.sm, marginLeft: spacing.xs, textTransform: "uppercase", letterSpacing: 0.5 },
  list: { padding: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIc: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.primary50,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { ...typography.h2, fontSize: 14, color: colors.ink },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  note: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.md, paddingHorizontal: spacing.lg },
});
