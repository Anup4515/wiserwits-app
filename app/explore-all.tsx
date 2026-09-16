import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { EXPLORE, EXPLORE_GROUP_ORDER, type ExploreGroup, type ExploreItem } from "@/lib/explore";
import { TileIcon, type TileIconName } from "@/components/icons/tile-icon";
import { EmptyState } from "@/components/data-ui";
import { colors, gradients, palette, spacing, radius, shadow, typography } from "@/theme";

/**
 * The full Explore list — every destination, opened from the "View all" tile on
 * Home. A curved navy header with a floating search card, then each group as a
 * titled card of rows (tinted icon plate + label + subtitle + chevron). The
 * search filters these destinations in place; for course/article content it
 * hands off to /search. Both screens read the shared EXPLORE list so they
 * never drift.
 */

/** Section heading icon, colour and tagline per group. */
const GROUP_META: Record<ExploreGroup, { icon: keyof typeof Ionicons.glyphMap; color: string; tagline: string }> = {
  Academics: { icon: "school", color: colors.navy, tagline: "Build your future" },
  Learning: { icon: "book", color: colors.navy, tagline: "Learn. Grow. Achieve." },
  "Wellness & support": { icon: "heart", color: "#ec4899", tagline: "Your well-being matters" },
  Account: { icon: "person-circle", color: colors.navy, tagline: "Manage your account" },
};

/** Soft plate colour behind each 3D icon, picked to echo the artwork. */
const TINTS: Partial<Record<TileIconName, string>> = {
  attendance: "#e7f7ed",
  exams: "#fdecef",
  assignments: "#fff3df",
  report: "#eceefe",
  timetable: "#e6f0fd",
  calendar: "#fdecee",
  insights: "#efeafd",
  courses: "#efeafd",
  "live-classes": "#e7f7ed",
  workshops: "#e6f0fd",
  certificates: "#fff3df",
  learn: "#fdecef",
  activity: "#f1eafd",
  health: "#fdeaf1",
  advice: "#fff5dc",
  reminders: "#fdecec",
  contributors: "#e6f0fd",
  plans: "#e6f0fd",
  security: "#fff3df",
  accounts: "#eceefe",
};

export default function ExploreAll() {
  const router = useRouter();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const enrolled = user?.enrollment_id != null;
  // Hide self-tracked-only destinations (e.g. Contributors) for enrolled students.
  const visible = EXPLORE.filter((e) => !e.selfOnly || !enrolled);

  const term = q.trim().toLowerCase();
  const matches = term
    ? visible.filter((e) => e.label.toLowerCase().includes(term) || e.subtitle.toLowerCase().includes(term))
    : visible;

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.navyHero} style={styles.header}>
        <View style={styles.glow} />
        <View style={styles.glow2} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={22} color={colors.textInverse} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Explore</Text>
              <Text style={styles.subtitle} numberOfLines={1}>Discover tools, resources and more</Text>
            </View>
            <Pressable
              onPress={() => router.push("/account-security")}
              hitSlop={8}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-sharp" size={20} color={colors.textInverse} />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Floats over the header's curved lower edge. */}
      <View style={styles.searchCard}>
        <View style={styles.searchField}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search anything…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search features"
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {/* Content search (courses, articles) lives on its own screen. */}
        <Pressable
          onPress={() => router.push("/search")}
          style={({ pressed }) => [styles.searchSide, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Search courses and articles"
        >
          <Ionicons name="options-outline" size={20} color={colors.navy} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {matches.length === 0 ? (
          <View style={styles.card}>
            <EmptyState
              icon="search-outline"
              title="No matching feature"
              subtitle="Looking for a course or article? Search the library instead."
            />
            <Pressable
              onPress={() => router.push("/search")}
              style={({ pressed }) => [styles.libraryLink, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.libraryText}>Search courses & articles</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.navy} />
            </Pressable>
          </View>
        ) : null}

        {EXPLORE_GROUP_ORDER.map((group) => {
          const items = matches.filter((e) => e.group === group);
          if (items.length === 0) return null;
          const meta = GROUP_META[group];
          return (
            <View key={group} style={styles.section}>
              <View style={styles.sectionHead}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
                <Text style={styles.sectionTitle}>{group}</Text>
                <Text style={styles.tagline} numberOfLines={1}>{meta.tagline}</Text>
              </View>
              <View style={styles.card}>
                {items.map((item, i) => (
                  <Row
                    key={item.label}
                    item={item}
                    last={i === items.length - 1}
                    onPress={() => router.push(item.href)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Row({ item, last, onPress }: { item: ExploreItem; last: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.rowIc, { backgroundColor: TINTS[item.icon] ?? palette.primary50 }]}>
        <TileIcon name={item.icon} size={28} />
      </View>
      {/* The divider starts after the icon plate, like an inset list. */}
      <View style={[styles.rowBody, !last && styles.rowBorder]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.label}</Text>
          <Text style={styles.rowSub} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const SEARCH_OVERLAP = 34;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg + SEARCH_OVERLAP,
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 220, height: 220, borderRadius: 110,
    right: -70, top: -90, backgroundColor: "rgba(255,255,255,0.06)",
  },
  glow2: {
    position: "absolute",
    width: 160, height: 160, borderRadius: 80,
    left: -60, top: -40, backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.md },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.h1, fontSize: 24, color: colors.textInverse },
  subtitle: { ...typography.label, fontWeight: "500", color: colors.navyTint, marginTop: 1 },

  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: -SEARCH_OVERLAP,
    marginHorizontal: spacing.lg,
    padding: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    ...shadow.card,
    shadowOpacity: 0.1,
    elevation: 4,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.primary50,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.ink, paddingVertical: 0 },
  searchSide: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: palette.primary50,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  section: { gap: spacing.sm + 2 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xs },
  sectionTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tagline: { ...typography.caption, color: colors.textMuted, flex: 1, textAlign: "right" },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...shadow.card,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowPressed: { opacity: 0.6 },
  rowBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIc: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { ...typography.label, fontSize: 15, fontWeight: "700", color: colors.ink },
  rowSub: { ...typography.caption, fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  pressed: { opacity: 0.6 },

  libraryLink: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "center", paddingBottom: spacing.md },
  libraryText: { color: colors.navy, fontWeight: "700" },
});
