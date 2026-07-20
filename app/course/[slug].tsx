import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";

import { useCourse } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { Card, Pill } from "@/components/ui";
import { SectionHeader, EmptyState } from "@/components/data-ui";
import { colors, spacing, radius, typography } from "@/theme";
import type { CourseDetail } from "@/api/student-types";

/**
 * Course detail (Phase 4.5). Enrolled-only content — the backend 403s if the
 * student isn't enrolled, which surfaces as the QueryView error state. Lists the
 * course's videos and documents, each opening in the device browser/player.
 */
export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const result = useCourse(slug ?? "");
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} loadingLabel="Loading course…">
        {(data) => <CourseBody course={data.course} />}
      </QueryView>
    </ScrollView>
  );
}

async function openLink(url: string) {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (ok) {
    await Linking.openURL(url);
  } else {
    Alert.alert("Can't open", "This link can't be opened on your device.");
  }
}

function CourseBody({ course }: { course: CourseDetail }) {
  const hasContent = course.videos.length > 0 || course.documents.length > 0;

  return (
    <>
      {course.image ? (
        <Image source={{ uri: course.image }} style={styles.hero} contentFit="cover" />
      ) : null}

      <Text style={styles.title}>{course.title}</Text>
      <View style={styles.metaRow}>
        {course.level ? <Pill label={course.level} tone="blue" /> : null}
        {course.duration_hours ? <Text style={styles.metaText}>{course.duration_hours} hours</Text> : null}
        {course.type_of_course ? <Text style={styles.metaText}>{course.type_of_course}</Text> : null}
      </View>

      {course.description ? <Text style={styles.desc}>{course.description}</Text> : null}

      {course.videos.length > 0 ? (
        <>
          <SectionHeader title="Videos" />
          <Card style={styles.listCard}>
            {course.videos.map((url, i) => (
              <ContentRow key={`v${i}`} first={i === 0} icon="play-circle-outline" label={fileName(url, `Video ${i + 1}`)} onPress={() => openLink(url)} />
            ))}
          </Card>
        </>
      ) : null}

      {course.documents.length > 0 ? (
        <>
          <SectionHeader title="Documents" />
          <Card style={styles.listCard}>
            {course.documents.map((url, i) => (
              <ContentRow key={`d${i}`} first={i === 0} icon="document-text-outline" label={fileName(url, `Document ${i + 1}`)} onPress={() => openLink(url)} />
            ))}
          </Card>
        </>
      ) : null}

      {!hasContent ? (
        <EmptyState icon="book-outline" title="No content yet" subtitle="Course materials will appear here once added." />
      ) : null}
    </>
  );
}

function ContentRow({
  first,
  icon,
  label,
  onPress,
}: {
  first: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <View>
      {!first ? <View style={styles.divider} /> : null}
      <Pressable style={styles.row} onPress={onPress}>
        <Ionicons name={icon} size={20} color={colors.navy} />
        <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
        <Ionicons name="open-outline" size={17} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function fileName(url: string, fallback: string): string {
  try {
    const path = url.split("?")[0];
    const name = path.substring(path.lastIndexOf("/") + 1);
    return name || fallback;
  } catch {
    return fallback;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  hero: { width: "100%", height: 160, borderRadius: radius.lg, backgroundColor: colors.card },
  title: { ...typography.h1, color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  metaText: { ...typography.caption, color: colors.textMuted },
  desc: { ...typography.body, color: colors.text },

  listCard: { padding: 0, gap: 0 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  rowLabel: { ...typography.body, color: colors.ink, flex: 1 },
});
