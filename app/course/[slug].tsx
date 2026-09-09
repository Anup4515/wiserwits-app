import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import { useCourse, useCourseReviews, useSubmitCourseReview } from "@/api/hooks";
import { downloadAndShare, resolveFileUrl } from "@/lib/download";
import { AuthedImage } from "@/components/AuthedImage";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { QueryView } from "@/components/QueryView";
import { Card, Pill, Button, Field } from "@/components/ui";
import { SectionHeader, EmptyState } from "@/components/data-ui";
import { shortDate } from "@/lib/format";
import { colors, spacing, radius, typography } from "@/theme";
import type { CourseDetail, CourseReviewRow } from "@/api/student-types";

const FEEDBACK_MAX = 1000;

/**
 * Course detail (Phase 4.5). Enrolled-only content — the backend 403s if the
 * student isn't enrolled, which surfaces as the QueryView error state.
 *
 * Videos stream in an in-app player; documents download through the OS share
 * sheet. Everything here is a BARE storage relPath from the API, so it has to
 * go through `resolveFileUrl()` first — the screen used to hand those paths
 * straight to `Linking.openURL`, which could only ever answer "this link can't
 * be opened", and to `downloadAndShare`, which failed for the same reason.
 * Handing the resolved URL to the device browser wouldn't work either: it
 * carries no Bearer token, so /api/files would 401. Both paths below attach the
 * token themselves.
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

function CourseBody({ course }: { course: CourseDetail }) {
  const hasContent = course.videos.length > 0 || course.documents.length > 0;
  const [playing, setPlaying] = useState<{ uri: string; title: string } | null>(null);
  const heroUri = resolveFileUrl(course.image);

  return (
    <>
      {heroUri ? (
        <AuthedImage uri={heroUri} style={styles.hero} contentFit="cover" />
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
            {course.videos.map((path, i) => {
              const label = fileName(path, `Video ${i + 1}`);
              const uri = resolveFileUrl(path);
              return (
                <ContentRow
                  key={`v${i}`}
                  first={i === 0}
                  icon="play-circle-outline"
                  label={label}
                  url={uri}
                  onPress={uri ? () => setPlaying({ uri, title: label }) : undefined}
                  actionIcon="play-outline"
                  actionLabel="Play video"
                />
              );
            })}
          </Card>
        </>
      ) : null}

      {course.documents.length > 0 ? (
        <>
          <SectionHeader title="Documents" />
          <Card style={styles.listCard}>
            {course.documents.map((path, i) => (
              <ContentRow
                key={`d${i}`}
                first={i === 0}
                icon="document-text-outline"
                label={fileName(path, `Document ${i + 1}`)}
                url={resolveFileUrl(path)}
              />
            ))}
          </Card>
        </>
      ) : null}

      {!hasContent ? (
        <EmptyState icon="book-outline" title="No content yet" subtitle="Course materials will appear here once added." />
      ) : null}

      <CourseReviews slug={course.slug} />

      <VideoPlayerModal
        visible={playing != null}
        uri={playing?.uri ?? null}
        title={playing?.title ?? ""}
        onClose={() => setPlaying(null)}
      />
    </>
  );
}

// ── Reviews ──────────────────────────────────────────────────────────────────
function CourseReviews({ slug }: { slug: string }) {
  const { data } = useCourseReviews(slug);
  const submit = useSubmitCourseReview(slug);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Seed the form from the student's existing review once, when it first loads.
  // Guarded so a post-submit refetch doesn't stomp on in-progress edits.
  useEffect(() => {
    if (data && !prefilled) {
      if (data.my_review) {
        setRating(data.my_review.rating);
        setFeedback(data.my_review.feedback ?? "");
      }
      setPrefilled(true);
    }
  }, [data, prefilled]);

  if (!data) return null;

  const { summary, is_enrolled, my_review, recent } = data;

  function onSubmit() {
    if (rating < 1) {
      Alert.alert("Add a rating", "Tap the stars to rate this course.");
      return;
    }
    submit.mutate(
      { rating, feedback: feedback.trim() || null },
      {
        onSuccess: () => Alert.alert("Thanks!", "Review has been saved."),
        onError: (e) => Alert.alert("Couldn't submit", e.message),
      },
    );
  }

  return (
    <>
      <SectionHeader title="Reviews" />

      {/* Summary */}
      <Card style={styles.summaryCard}>
        {summary.count > 0 ? (
          <>
            <Text style={styles.avgNum}>{summary.avg_rating?.toFixed(1) ?? "—"}</Text>
            <View style={{ gap: 4 }}>
              <Stars value={summary.avg_rating ?? 0} size={18} />
              <Text style={styles.summaryMeta}>
                {summary.count} review{summary.count === 1 ? "" : "s"}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.summaryMeta}>No reviews yet — be the first.</Text>
        )}
      </Card>

      {/* Your review (enrolled only) */}
      {is_enrolled ? (
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.yourTitle}>{my_review ? "Submitted review" : "Rate this course"}</Text>
          <Stars value={rating} size={30} onChange={setRating} />
          <Field
            label="Feedback (optional)"
            value={feedback}
            onChangeText={(v) => setFeedback(v.slice(0, FEEDBACK_MAX))}
            placeholder="Share what you thought of this course"
            multiline
            numberOfLines={4}
          />
          <Button
            label={submit.isPending ? "Saving…" : my_review ? "Update review" : "Submit review"}
            onPress={onSubmit}
            loading={submit.isPending}
            disabled={submit.isPending}
          />
        </Card>
      ) : null}

      {/* Recent reviews */}
      {recent.length > 0 ? (
        <Card style={styles.listCard}>
          {recent.map((r, i) => (
            <ReviewRow key={r.id} review={r} first={i === 0} />
          ))}
        </Card>
      ) : null}
    </>
  );
}

function ReviewRow({ review, first }: { review: CourseReviewRow; first: boolean }) {
  return (
    <View>
      {!first ? <View style={styles.divider} /> : null}
      <View style={styles.reviewRow}>
        <View style={styles.reviewHead}>
          <Text style={styles.reviewName} numberOfLines={1}>{review.student_name}</Text>
          <Text style={styles.reviewDate}>{shortDate(review.updated_at)}</Text>
        </View>
        <Stars value={review.rating} size={13} />
        {review.feedback ? <Text style={styles.reviewText}>{review.feedback}</Text> : null}
      </View>
    </View>
  );
}

function Stars({
  value,
  size = 16,
  onChange,
}: {
  value: number;
  size?: number;
  onChange?: (n: number) => void;
}) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const icon = (
          <Ionicons name={filled ? "star" : "star-outline"} size={size} color={colors.gold} />
        );
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}>
            {icon}
          </Pressable>
        ) : (
          <View key={n}>{icon}</View>
        );
      })}
    </View>
  );
}

/**
 * One video or document. `url` is the resolved absolute URL, or null when the
 * stored path couldn't be resolved — in that case the row renders inert rather
 * than firing a request that can only fail.
 *
 * `onPress` is what separates the two kinds: a video opens the in-app player,
 * a document has no press action and is reached through Download, which streams
 * it with the student's token and hands it to the OS share sheet.
 */
function ContentRow({
  first,
  icon,
  label,
  url,
  onPress,
  actionIcon,
  actionLabel,
}: {
  first: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  url: string | null;
  onPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    if (!url) return;
    setDownloading(true);
    await downloadAndShare(url, label);
    setDownloading(false);
  }

  return (
    <View>
      {!first ? <View style={styles.divider} /> : null}
      <View style={styles.row}>
        <Ionicons name={icon} size={20} color={url ? colors.navy : colors.textMuted} />
        <Pressable style={styles.rowTap} onPress={onPress} disabled={!onPress}>
          <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
        </Pressable>
        {/* Play in the in-app player — streams, nothing is downloaded first. */}
        {onPress && actionIcon ? (
          <Pressable onPress={onPress} hitSlop={8} style={styles.rowAction} accessibilityLabel={actionLabel}>
            <Ionicons name={actionIcon} size={19} color={colors.navy} />
          </Pressable>
        ) : null}
        {/* Download for offline: saves via the OS share sheet (Files / Photos). */}
        <Pressable onPress={download} hitSlop={8} disabled={downloading || !url} style={styles.rowAction} accessibilityLabel={`Download ${label}`}>
          {downloading ? (
            <ActivityIndicator size="small" color={colors.navy} />
          ) : (
            <Ionicons name="download-outline" size={19} color={url ? colors.navy : colors.textMuted} />
          )}
        </Pressable>
      </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  rowTap: { flex: 1 },
  rowLabel: { ...typography.body, color: colors.ink },
  rowAction: { width: 30, alignItems: "center", justifyContent: "center" },

  stars: { flexDirection: "row", gap: 2 },

  summaryCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avgNum: { fontSize: 40, fontWeight: "800", color: colors.ink, letterSpacing: -1 },
  summaryMeta: { ...typography.caption, color: colors.textMuted },

  yourTitle: { ...typography.h2, fontSize: 15, color: colors.ink },
  reviewRow: { padding: spacing.md, gap: 6 },
  reviewHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  reviewName: { ...typography.label, color: colors.ink, flex: 1 },
  reviewDate: { ...typography.caption, color: colors.textMuted },
  reviewText: { ...typography.body, color: colors.text },
});
