import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useInsights } from "@/api/hooks";
import { InsightsContent } from "@/features/insights/InsightsContent";
import { gradients, colors, spacing, radius } from "@/theme";

/**
 * Insights (mock 3) — dedicated screen. The cards live in <InsightsContent/>,
 * shared with the Home tab. This screen adds the navy hero + pull-to-refresh.
 * (React Query dedupes useInsights, so the hook here + inside InsightsContent
 * share one request.)
 */
export default function InsightsScreen() {
  const { query } = useInsights();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.hero}>
        <SafeAreaView edges={["top"]}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
          </Pressable>
          <Text style={styles.heroTitle}>Insights</Text>
          <Text style={styles.heroSub}>A quick read on how things are going</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
        }
      >
        <InsightsContent />
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
  heroSub: { color: "#b9c0e0", fontSize: 13, fontWeight: "600", marginTop: 3 },
  scroll: { flex: 1 },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
