import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useHealth } from "@/api/hooks";
import { bmiCategory } from "@/features/health/sections";
import { gradients, colors, palette, spacing, radius, typography, shadow } from "@/theme";

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
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    desc: string;
  }[] = [
    { href: "/(tabs)/health/bmi", icon: "body-outline", label: "Body mass index", desc: bmiDesc },
    {
      href: "/(tabs)/health/consultations",
      icon: "medkit-outline",
      label: "Consultations",
      desc: countDesc(data?.consultations_count, "consultation", "Schedule a doctor consultation"),
    },
    {
      href: "/(tabs)/health/diet",
      icon: "nutrition-outline",
      label: "Diet plans",
      desc: countDesc(data?.diet_plans_count, "diet plan", "Plans shared by the consultant"),
    },
    {
      href: "/(tabs)/health/labs",
      icon: "flask-outline",
      label: "Lab reports",
      desc: countDesc(data?.lab_reports_count, "lab report", "Reports shared by the consultant"),
    },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <SafeAreaView edges={["top"]}>
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
              <Ionicons name={it.icon} size={22} color={colors.navy} />
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
  rowIc: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: palette.primary50,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { ...typography.h2, fontSize: 15, color: colors.ink },
  rowDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
