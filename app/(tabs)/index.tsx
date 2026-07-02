import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { Card, Pill } from "@/components/ui";
import { t } from "@/lib/copy";
import { gradients, colors, spacing, radius, typography, shadow } from "@/theme";

/**
 * Home (mock 2) — navy hero + glance tiles. Phase 1 ships the hero + styled
 * placeholders; live data lands in Phase 2. Neutral dual-audience copy (§9a).
 */
export default function Home() {
  const { user, accounts } = useAuth();
  const router = useRouter();
  const firstName = user?.name?.split(" ")[0];

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <View style={styles.glow} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greet}>{t("home.greeting", { name: firstName })}</Text>
              <Text style={styles.plan}>{user?.plan_name ?? "Free plan"}</Text>
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.pad}>
        <View style={styles.statGrid}>
          <StatTile label="Attendance" tint={colors.greenBg} fg={colors.green} icon="calendar-outline" />
          <StatTile label="Overall" tint={colors.blueBg} fg={colors.blue} icon="ribbon-outline" />
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>You're all set 🎉</Text>
            <Pill label="Phase 1" tone="gold" />
          </View>
          <Text style={styles.cardBody}>
            Foundations and sign-in are wired. Glance cards, insights and the
            activity feed arrive in the next phases.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function StatTile({
  label,
  value,
  tint,
  fg,
  icon,
}: {
  label: string;
  value?: string;
  tint: string;
  fg: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIc, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={16} color={fg} />
      </View>
      <Text style={styles.statLab}>{label}</Text>
      {value ? (
        <Text style={styles.statVal}>{value}</Text>
      ) : (
        // Phase 1: no live data yet — intentional skeleton placeholder.
        <View style={styles.statSkeleton} />
      )}
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
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -40,
    top: -50,
    backgroundColor: "rgba(240,194,39,0.18)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  greet: { color: colors.textInverse, fontSize: 21, fontWeight: "800" },
  plan: { color: "#b9c0e0", fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { flex: 1 },
  pad: { padding: spacing.lg, gap: spacing.lg },

  statGrid: { flexDirection: "row", gap: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.card,
  },
  statIc: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statLab: { fontSize: 11.5, color: colors.textMuted, fontWeight: "600" },
  statVal: { fontSize: 25, fontWeight: "800", color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  statSkeleton: {
    height: 20,
    width: "55%",
    borderRadius: 6,
    backgroundColor: "#eef1f6",
    marginTop: 6,
  },

  card: { gap: spacing.sm },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { ...typography.h2, color: colors.ink },
  cardBody: { ...typography.body, color: colors.textMuted },
});
