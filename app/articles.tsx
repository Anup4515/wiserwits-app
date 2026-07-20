import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useArticles } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card, Pill } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing, typography } from "@/theme";
import type { ArticleRow } from "@/api/student-types";

/** Articles list (Phase 4.7). Tap a card to open its detail by slug. */
export default function ArticlesScreen() {
  const result = useArticles();
  const { query } = result;
  const router = useRouter();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} loadingLabel="Loading articles…">
        {(data) =>
          data.length === 0 ? (
            <EmptyState icon="book-outline" title="No articles yet" />
          ) : (
            <View style={{ gap: spacing.md }}>
              {data.map((a) => (
                <ArticleCard
                  key={a.slug}
                  article={a}
                  onPress={() => router.push(`/article/${a.slug}`)}
                />
              ))}
            </View>
          )
        }
      </QueryView>
    </ScrollView>
  );
}

function ArticleCard({ article, onPress }: { article: ArticleRow; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ gap: spacing.sm }}>
        <View style={styles.head}>
          <Ionicons name="document-text-outline" size={20} color={colors.navy} />
          {article.badge ? <Pill label={article.badge} tone="gold" /> : null}
        </View>
        <Text style={styles.title}>{article.title}</Text>
        {article.excerpt ? (
          <Text style={styles.excerpt} numberOfLines={2}>
            {article.excerpt}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h2, color: colors.ink },
  excerpt: { ...typography.body, color: colors.textMuted },
});
