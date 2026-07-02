import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";

/**
 * First-run onboarding (plan §7, execution Phase 1). Phase 1 scope: the
 * notification opt-in *intent*. The actual OS permission prompt + push-token
 * registration is wired in Phase 4 via the push client — `expo-notifications`
 * remote push was removed from Expo Go (SDK 53+) and needs a development build,
 * so we intentionally do NOT import it here. Copy is neutral/dual-audience (§9a).
 */
export default function Onboarding() {
  const router = useRouter();
  const finish = () => router.replace("/(tabs)");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Ionicons name="notifications-outline" size={56} color={colors.gold} />
        <Text style={styles.title}>Stay in the loop</Text>
        <Text style={styles.body}>
          Get a heads-up when new marks, attendance or a report card are posted —
          so nothing slips by.
        </Text>
        <Text style={styles.note}>You can turn on notifications anytime in Settings.</Text>
      </View>

      <View style={styles.actions}>
        <Button label="Continue" onPress={finish} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy, justifyContent: "space-between" },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  title: { ...typography.display, color: colors.textInverse, textAlign: "center" },
  body: { ...typography.body, color: colors.navyTint, textAlign: "center" },
  note: { ...typography.caption, color: colors.navyTint, textAlign: "center", opacity: 0.8 },
  actions: { padding: spacing.xl, gap: spacing.sm },
});
