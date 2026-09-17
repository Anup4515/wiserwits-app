import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing } from "@/theme";

/** Diameter shared with other round header buttons (e.g. Explore's settings). */
export const HEADER_BUTTON_SIZE = 40;

/**
 * The one back button used across the app: a round, translucent chip with a
 * chevron, drawn for the navy headers every screen uses (native stack headers
 * via `headerLeft`, and the custom gradient heroes on Insights, Health,
 * Explore and the auth screens).
 *
 * With no history (e.g. opened from a notification on a cold start) it goes
 * Home instead of doing nothing.
 */
export function BackButton({
  onPress,
  style,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const goBack = onPress ?? (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)")));

  return (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
    >
      {/* Nudged left: a chevron's visual weight sits right of its box centre. */}
      <Ionicons name="chevron-back" size={22} color={colors.textInverse} style={{ marginLeft: -2 }} />
    </Pressable>
  );
}

/**
 * For a native stack header's `headerLeft`. The header lays the title right
 * after this element with almost no gap, so the spacing lives here.
 */
export function HeaderBackButton() {
  return <BackButton style={styles.headerGap} />;
}

const styles = StyleSheet.create({
  headerGap: { marginRight: spacing.md },
  btn: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: HEADER_BUTTON_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: "rgba(255,255,255,0.26)" },
});
