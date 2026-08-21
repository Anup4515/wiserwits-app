/** Search (Phase 4.8) — client-side search over enrolled/catalog courses and articles. */
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, typography } from "@/theme";
import { Card, Field } from "@/components/ui";
import { SectionHeader, EmptyState } from "@/components/data-ui";
import { useArticles, useCourses } from "@/api/hooks";
import type { ArticleRow, CourseCardRow } from "@/api/student-types";

export default function Search() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const articlesR = useArticles();
  const coursesR = useCourses();

  const term = q.trim().toLowerCase();
  const active = term.length >= 1;

  // Both sources are paginated now; search only over what has been loaded.
  const coursePages = coursesR.query.data?.pages ?? [];
  const merged: CourseCardRow[] = [];
  if (coursePages.length > 0) {
    const seen = new Set<number>();
    const all = [
      ...(coursePages[0]?.enrolled ?? []),
      ...coursePages.flatMap((pg) => pg.catalog),
    ];
    for (const c of all) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        merged.push(c);
      }
    }
  }

  const courses: CourseCardRow[] = active
    ? merged.filter((c) => c.title.toLowerCase().includes(term))
    : [];
  const articles: ArticleRow[] = active
    ? (articlesR.query.data?.pages.flatMap((pg) => pg.items) ?? []).filter((a) =>
        a.title.toLowerCase().includes(term)
      )
    : [];

  const hasResults = courses.length > 0 || articles.length > 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      keyboardShouldPersistTaps="handled"
    >
      <Field
        label="Search"
        icon="search-outline"
        value={q}
        onChangeText={setQ}
        placeholder="Search courses and articles"
        autoCapitalize="none"
      />

      {!active ? (
        <EmptyState
          icon="search-outline"
          title="Search WiserWits"
          subtitle="Find courses and articles by name."
        />
      ) : !hasResults ? (
        <EmptyState
          icon="search-outline"
          title="No results"
          subtitle={`No matches for “${q}”.`}
        />
      ) : (
        <>
          {courses.length > 0 ? (
            <>
              <SectionHeader title="Courses" />
              <Card style={styles.card}>
                {courses.map((c, i) => (
                  <View key={c.id}>
                    {i > 0 ? <View style={styles.divider} /> : null}
                    <Pressable
                      style={styles.row}
                      onPress={() => router.push(`/course/${c.slug}`)}
                      accessibilityRole="button"
                      accessibilityLabel={c.title}
                    >
                      <Ionicons name="school-outline" size={20} color={colors.navy} style={styles.rowIcon} />
                      <Text style={styles.rowLabel}>{c.title}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {articles.length > 0 ? (
            <>
              <SectionHeader title="Articles" />
              <Card style={styles.card}>
                {articles.map((a, i) => (
                  <View key={a.slug}>
                    {i > 0 ? <View style={styles.divider} /> : null}
                    <Pressable
                      style={styles.row}
                      onPress={() => router.push(`/article/${a.slug}`)}
                      accessibilityRole="button"
                      accessibilityLabel={a.title}
                    >
                      <Ionicons name="document-text-outline" size={20} color={colors.navy} style={styles.rowIcon} />
                      <Text style={styles.rowLabel}>{a.title}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { padding: 0, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowIcon: { width: 24, textAlign: "center" },
  rowLabel: { ...typography.body, color: colors.ink, flex: 1, fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg },
});
