import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useHealth } from "@/api/hooks";
import { bmiCategory } from "@/features/health/sections";
import { gradients, colors, spacing, radius, typography, shadow } from "@/theme";
import { TileIcon, type TileIconName } from "@/components/icons/tile-icon";

/**
 * Health hub (mirrors the Academics hub) — fans out to the BMI, consultations,
 * diet-plan and lab-report screens. The `/health` overview call feeds each row
 * a live count / latest reading; if it hasn't resolved yet the rows fall back to
 * a static description, so the hub never blocks on the network.
 */
export default function HealthHub() {
  const router = useRouter();
  const { data } = useHealth().query;

  const latestBmi = data?.bmi_records[0];
  const bmiDesc = latestBmi
    ? `${latestBmi.bmi.toFixed(1)} · ${bmiCategory(latestBmi.bmi).label}`
    : "Log height & weight";

  const items: {
    href: Href;
    icon: TileIconName;
    label: string;
    desc: string;
  }[] = [
    { href: "/(tabs)/health/bmi", icon: "bmi", label: "Body mass index", desc: bmiDesc },
    {
      href: "/(tabs)/health/consultations",
      icon: "consultation",
      label: "Consultations",
      desc: countDesc(data?.consultations_count, "consultation", "Schedule a doctor consultation"),
    },
    {
      href: "/(tabs)/health/diet",
      icon: "diet",
      label: "Diet plans",
      desc: countDesc(data?.diet_plans_count, "diet plan", "Plans shared by the consultant"),
    },
    {
      href: "/(tabs)/health/labs",
      icon: "labs",
      label: "Lab reports",
      desc: countDesc(data?.lab_reports_count, "lab report", "Reports shared by the consultant"),
    },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <SafeAreaView edges={["top"]}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            hitSlop={8}
            style={({ pressed }) => [
              { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
              pressed && { opacity: 0.6 },
            ]}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
          </Pressable>
          <Text style={styles.heroTitle}>Health</Text>
          <Text style={styles.heroSub}>BMI, consultations, diet & lab reports</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.pad}>
        {items.map((it) => (
          <Pressable
            key={it.label}
            onPress={() => router.push(it.href)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.rowIc}>
              <TileIcon name={it.icon} size={30} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{it.label}</Text>
              <Text style={styles.rowDesc}>{it.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** "3 diet plans" / "1 consultation" — or the fallback line while unknown/zero. */
function countDesc(n: number | undefined, noun: string, fallback: string): string {
  if (n == null || n === 0) return fallback;
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
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
  heroSub: { color: colors.textInverse, opacity: 0.85, ...typography.caption, marginTop: 2 },

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
  // Neutral plate — the 3D artwork carries the colour (see tile-icon).
  rowIc: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { ...typography.h2, fontSize: 15, color: colors.ink },
  rowDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
