import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { onlineManager } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, typography } from "@/theme";
import { t } from "@/lib/copy";

/**
 * Global offline banner (audit H2). Reads the SAME connectivity source that
 * drives TanStack Query's online state (`onlineManager`, wired to NetInfo in
 * query-client.ts), so the banner and the query layer never disagree. Pinned to
 * the bottom as an overlay so it never fights the navigation headers. Renders
 * nothing while online.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  if (online) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}
    >
      <Ionicons name="cloud-offline-outline" size={15} color={colors.textInverse} />
      <Text style={styles.text}>{t("state.offline")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.navyDark,
  },
  text: { ...typography.caption, color: colors.textInverse, textAlign: "center" },
});
