import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { useArticle } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Pill } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";
import type { ArticleDetail } from "@/api/student-types";

/** Article detail (Phase 4.7). Renders badge, excerpt and ordered sections by slug. */
export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const result = useArticle(slug ?? "");
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} loadingLabel="Loading article…">
        {(data) => <ArticleBody article={data} />}
      </QueryView>
    </ScrollView>
  );
}

function ArticleBody({ article }: { article: ArticleDetail }) {
  return (
    <>
      {article.badge ? (
        <View style={styles.badgeRow}>
          <Pill label={article.badge} tone="gold" />
        </View>
      ) : null}

      <Text style={styles.title}>{article.title}</Text>
      {article.excerpt ? <Text style={styles.excerpt}>{article.excerpt}</Text> : null}

      {article.sections.length === 0 ? (
        <EmptyState icon="book-outline" title="Nothing here yet" />
      ) : (
        article.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
            <Text style={styles.paragraph}>{section.paragraph}</Text>
          </View>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  badgeRow: { flexDirection: "row", alignItems: "center" },
  title: { ...typography.h1, color: colors.ink },
  excerpt: { ...typography.body, color: colors.textMuted },

  section: { gap: spacing.sm },
  heading: { ...typography.h2, color: colors.ink },
  paragraph: { ...typography.body, color: colors.text },
});
