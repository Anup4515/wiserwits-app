import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useInsights } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card } from "@/components/ui";
import { InsightsContent } from "@/features/insights/InsightsContent";
import { ClassInsightsContent } from "@/features/insights/ClassInsightsContent";
import { gradients, colors, spacing, radius, typography } from "@/theme";

/**
 * Insights — dedicated screen. Enrolled students get the "me vs my class" view
 * (<ClassInsightsContent/>, insights_class_compare_plan.md); independent
 * students have no class, so they keep the personal cards in <InsightsContent/>
 * (also used, unchanged, by the Home tab). React Query dedupes useInsights, so
 * every hook call here shares one request.
 */
export default function InsightsScreen() {
  const result = useInsights();
  const { query } = result;
  const router = useRouter();
  const cls = query.data?.class ?? null;

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
          <Text style={styles.heroSub}>
            {cls ? `${cls.label} · ${cls.size} students` : "A quick read on how things are going"}
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
        }
      >
        <QueryView result={result} feature="student insights">
          {(data) =>
            data.class ? (
              <ClassInsightsContent data={data.class} />
            ) : (
              <>
                {data.source === "enrolled" ? null : (
                  <Card>
                    <Text style={styles.note}>
                      Class comparison appears once you are linked to your school.
                    </Text>
                  </Card>
                )}
                <InsightsContent />
              </>
            )
          }
        </QueryView>
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
  note: { ...typography.caption, color: colors.textMuted },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
