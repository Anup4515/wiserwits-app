import { Pressable, View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useFeed } from "@/api/hooks";
import { colors } from "@/theme";

/**
 * Header notification bell (Phase 3). Reuses the activity feed's unread state —
 * `useFeed()` shares the TanStack cache with the Feed screen, so the badge and
 * the list stay in sync, and opening the feed (which marks it read) clears the
 * dot here too. Tapping the bell routes to `/feed`.
 *
 * Defaults suit a dark (navy hero) header; pass `iconColor` / `bg` to place it
 * on a light surface.
 */
export function NotificationBell({
  iconColor = colors.textInverse,
  bg = "rgba(255,255,255,0.1)",
}: {
  iconColor?: string;
  bg?: string;
}) {
  const router = useRouter();
  const { query } = useFeed();
  const unread = query.data?.items.reduce((n, i) => n + (i.unread ? 1 : 0), 0) ?? 0;

  return (
    <Pressable
      onPress={() => router.push("/feed")}
      hitSlop={8}
      style={[styles.bell, { backgroundColor: bg }]}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <Ionicons name="notifications-outline" size={20} color={iconColor} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? "9+" : String(unread)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
});
