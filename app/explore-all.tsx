import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { EXPLORE, EXPLORE_GROUP_ORDER, type ExploreItem } from "@/lib/explore";
import { Card } from "@/components/ui";
import { colors, palette, spacing, radius, typography } from "@/theme";

/**
 * The full Explore list — every destination, opened from the "View all" tile on
 * Home. Rendered as grouped list rows (icon + label + subtitle + chevron) so a
 * long list stays scannable, unlike Home's compact icon grid. Both read the
 * shared EXPLORE list so they never drift.
 */
export default function ExploreAll() {
  const router = useRouter();
  const { user } = useAuth();
  const enrolled = user?.enrollment_id != null;
  // Hide self-tracked-only destinations (e.g. Contributors) for enrolled students.
  const visible = EXPLORE.filter((e) => !e.selfOnly || !enrolled);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.search, pressed && styles.pressed]}
        onPress={() => router.push("/search")}
        accessibilityRole="button"
        accessibilityLabel="Search"
      >
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <Text style={styles.searchText}>Search</Text>
      </Pressable>

      {EXPLORE_GROUP_ORDER.map((group) => {
        const items = visible.filter((e) => e.group === group);
        if (items.length === 0) return null;
        return (
          <View key={group} style={styles.section}>
            <Text style={styles.sectionH}>{group}</Text>
            <Card style={styles.list}>
              {items.map((item, i) => (
                <Row
                  key={item.label}
                  item={item}
                  last={i === items.length - 1}
                  onPress={() => router.push(item.href)}
                />
              ))}
            </Card>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Row({ item, last, onPress }: { item: ExploreItem; last: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.rowIc, { backgroundColor: item.tint }]}>
        <Ionicons name={item.icon} size={20} color={item.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.label}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.primary50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchText: { ...typography.body, color: colors.textMuted },

  section: { gap: spacing.sm },
  sectionH: {
    ...typography.label,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  list: { padding: 0, paddingHorizontal: spacing.lg },

  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { opacity: 0.6 },
  rowIc: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { ...typography.h2, fontSize: 15, color: colors.ink },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
