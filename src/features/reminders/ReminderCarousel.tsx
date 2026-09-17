import { View, Text, StyleSheet, Pressable, FlatList, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";

import { SectionHeader } from "@/components/data-ui";
import { useOpenInTab } from "@/lib/tab-nav";
import { REMINDER_TYPE_META, relativeReminderWhen } from "@/lib/reminders";
import { colors, spacing, radius, typography } from "@/theme";
import type { SourceQueryResult } from "@/api/query";
import type { ReminderRow } from "@/api/student-types";

/**
 * Home reminder cards — a swipeable strip of the student's Today + Upcoming
 * reminders (same `/api/student/reminders` data as the Reminders screen, which
 * already drops cancelled / submitted items and sorts soonest first). Cards
 * snap one at a time with the next one peeking in. The whole section hides when
 * there is nothing coming up or the request fails — Home has its own error card.
 */

const MAX_CARDS = 8;
const CARD_GAP = spacing.md;

export function ReminderCarousel({ result }: { result: SourceQueryResult<ReminderRow[]> }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { query } = result;

  // ~80% of the content width so the next card visibly peeks in.
  const cardWidth = Math.round((width - spacing.lg * 2) * 0.8);

  const items = (query.data ?? [])
    .filter((r) => r.bucket === "today" || r.bucket === "upcoming")
    .slice(0, MAX_CARDS);

  if (query.isError) return null;
  if (!query.isLoading && items.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title="Reminders" action="See all" onAction={() => router.push("/reminders")} />
      {query.isLoading ? (
        <View style={styles.skeletonRow}>
          <View style={[styles.card, styles.skeleton, { width: cardWidth }]} />
          <View style={[styles.card, styles.skeleton, { width: cardWidth }]} />
        </View>
      ) : (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <ReminderSlide row={item} width={cardWidth} />}
          ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + CARD_GAP}
          snapToAlignment="start"
          decelerationRate="fast"
          // Bleed to the screen edges while the first card stays on the gutter.
          style={styles.bleed}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function ReminderSlide({ row, width }: { row: ReminderRow; width: number }) {
  const openInTab = useOpenInTab();
  const meta = REMINDER_TYPE_META[row.type] ?? REMINDER_TYPE_META.appointment;
  const when = relativeReminderWhen(row.when);
  // Consultant reminders have no screen of their own — their note and
  // attachment live on /reminders.
  const href = meta.href ?? "/reminders";
  // Assignment rows carry a generic "Assignment due" subtitle; skip it when it
  // would only repeat the heading.
  const subtitle = row.subtitle && !row.subtitle.toLowerCase().startsWith(meta.label.toLowerCase()) ? row.subtitle : null;

  return (
    <Pressable
      onPress={() => openInTab(href)}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}, ${row.title}, ${when}`}
      style={({ pressed }) => [
        styles.card,
        { width, backgroundColor: meta.tint },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.chip}>
        <Text style={[styles.chipText, { color: meta.fg }]} numberOfLines={1}>
          {when}
        </Text>
      </View>

      <View>
        <Text style={[styles.heading, { color: meta.fg }]} numberOfLines={1}>
          {meta.label}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {row.title}
        </Text>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.lg },
  listContent: { paddingHorizontal: spacing.lg },
  skeletonRow: { flexDirection: "row", gap: CARD_GAP, overflow: "hidden", marginRight: -spacing.lg },
  skeleton: { backgroundColor: "#eef1f6" },

  card: {
    height: 124,
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: "hidden",
    justifyContent: "space-between",
  },

  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "80%",
  },
  chipText: { ...typography.caption, fontWeight: "700" },

  heading: { ...typography.caption, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  title: { ...typography.h2, fontSize: 15, lineHeight: 20, color: colors.ink, marginTop: 2 },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
