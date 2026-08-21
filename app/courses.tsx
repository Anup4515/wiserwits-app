import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useCourses, useEnrollCourse } from "@/api/hooks";
import { useAuth } from "@/auth/AuthContext";
import { api } from "@/api/client";
import { QueryView, LoadMoreRow } from "@/components/QueryView";
import type { SourceQueryResult } from "@/api/query";
import { Pill } from "@/components/ui";
import { SectionHeader, EmptyState } from "@/components/data-ui";
import { track } from "@/lib/analytics";
import {
  isRazorpayAvailable,
  isRazorpayCancel,
  openRazorpayCheckout,
  RazorpayUnavailableError,
} from "@/lib/razorpay";
import { colors, spacing, radius, typography } from "@/theme";
import type {
  CourseCardRow,
  CourseListResponse,
  CourseOrderResponse,
  CourseVerifyResponse,
} from "@/api/student-types";
import { ListCard, CardFooter, CardAction, CardDescription } from "@/components/list-card";

/**
 * Courses / Learning (Phase 4.5). Enrolled courses (tap to open) + a catalog
 * with free enrolment and à-la-carte paid purchase over the Razorpay native
 * checkout — the same order → checkout → verify round-trip as subscriptions,
 * followed by a session refresh so newly-unlocked course access takes effect.
 */
export default function CoursesScreen() {
  const result = useCourses();
  const { query } = result;

  // The endpoint pages only its CATALOGUE; `enrolled` is repeated whole on
  // every page. Rebuild the single response shape CoursesBody expects:
  // enrolled from the first page, catalogue concatenated across all of them.
  const flatResult = {
    ...result,
    query: {
      ...query,
      data: query.data
        ? {
            enrolled: query.data.pages[0]?.enrolled ?? [],
            catalog: query.data.pages.flatMap((pg) => pg.catalog),
            nextCursor: query.data.pages[query.data.pages.length - 1]?.nextCursor ?? null,
          }
        : undefined,
    },
  } as unknown as SourceQueryResult<CourseListResponse>;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={flatResult} loadingLabel="Loading courses…">
        {(data) => <CoursesBody data={data} />}
      </QueryView>
      <LoadMoreRow query={query} label="Load more courses" />
    </ScrollView>
  );
}

function CoursesBody({ data }: { data: CourseListResponse }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { refreshSession } = useAuth();
  const enroll = useEnrollCourse();
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const enrolledIds = new Set(data.enrolled.map((c) => c.id));
  const catalog = data.catalog.filter((c) => !enrolledIds.has(c.id));

  async function afterAcquire(course: CourseCardRow, paid: boolean) {
    track("course_acquired", { course_id: course.id, paid });
    await refreshSession();
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["courses"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  }

  async function enrolFree(course: CourseCardRow) {
    setBusySlug(course.slug);
    try {
      await new Promise<void>((resolve, reject) =>
        enroll.mutate(course.id, {
          onSuccess: () => resolve(),
          onError: (err) => reject(err),
        }),
      );
      await afterAcquire(course, false);
      Alert.alert("Enrolled", `Now enrolled in ${course.title}.`);
    } catch (err) {
      Alert.alert("Couldn't enrol", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusySlug(null);
    }
  }

  async function purchase(course: CourseCardRow) {
    if (!isRazorpayAvailable()) {
      Alert.alert(
        "Not available here",
        "Checkout opens in a secure payment screen that only works in the installed WiserWits app, not in Expo Go.",
      );
      return;
    }
    setBusySlug(course.slug);
    try {
      const orderRes = await api.post<CourseOrderResponse>("/api/student/courses/order", {
        course_id: course.id,
      });
      if (orderRes.error || !orderRes.data) {
        throw new Error(orderRes.error ?? "Could not start the payment.");
      }
      const order = orderRes.data;

      const payment = await openRazorpayCheckout({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "WiserWits",
        description: order.course_title,
        prefill: order.prefill,
        theme: { color: colors.navy },
      });

      const verifyRes = await api.post<CourseVerifyResponse>("/api/student/courses/verify", {
        course_id: course.id,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      });
      if (verifyRes.error || !verifyRes.data) {
        throw new Error(
          verifyRes.error ??
            "We couldn't confirm your payment. If you were charged, contact support.",
        );
      }

      await afterAcquire(course, true);
      Alert.alert("All set", `${course.title} is now in the course list.`);
    } catch (err) {
      if (err instanceof RazorpayUnavailableError) {
        Alert.alert("Not available here", err.message);
      } else if (isRazorpayCancel(err)) {
        // dismissed — no-op
      } else {
        Alert.alert(
          "Payment problem",
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <>
      {data.enrolled.length > 0 ? (
        <>
          <SectionHeader title="My courses" />
          <View style={{ gap: spacing.md }}>
            {data.enrolled.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                busy={false}
                onOpen={() => router.push(`/course/${c.slug}`)}
              />
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Explore courses" />
      {catalog.length === 0 ? (
        <EmptyState icon="school-outline" title="No courses available" subtitle="Check back soon for new courses." />
      ) : (
        <View style={{ gap: spacing.md }}>
          {catalog.map((c) => {
            const price = Number(c.price);
            const free = !Number.isFinite(price) || price <= 0;
            return (
              <CourseCard
                key={c.id}
                course={c}
                busy={busySlug === c.slug}
                onAcquire={() => (free ? enrolFree(c) : purchase(c))}
                acquireLabel={free ? "Enrol free" : `Buy ₹${formatInr(price)}`}
              />
            );
          })}
        </View>
      )}

      {!isRazorpayAvailable() ? (
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.noteText}>
            Paid courses open checkout in the installed WiserWits app. In Expo Go you can browse but not pay.
          </Text>
        </View>
      ) : null}
    </>
  );
}

function CourseCard({
  course,
  busy,
  onOpen,
  onAcquire,
  acquireLabel,
}: {
  course: CourseCardRow;
  busy: boolean;
  onOpen?: () => void;
  onAcquire?: () => void;
  acquireLabel?: string;
}) {
  const price = Number(course.price);
  const free = !Number.isFinite(price) || price <= 0;

  return (
    <ListCard>
      <Pressable
        onPress={onOpen}
        disabled={!onOpen}
        style={styles.courseHead}
      >
        {course.image ? (
          <Image source={{ uri: course.image }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name="book-outline" size={22} color={colors.navy} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
          <View style={styles.metaRow}>
            {course.level ? <Pill label={course.level} tone="blue" /> : null}
            {course.duration_hours ? (
              <Text style={styles.metaText}>{course.duration_hours}h</Text>
            ) : null}
            {course.is_enrolled ? <Pill label="Enrolled" tone="green" /> : null}
          </View>
        </View>
        {onOpen ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
      </Pressable>

      {course.description ? <CardDescription text={course.description} numberOfLines={2} /> : null}

      {onAcquire ? (
        <CardFooter
          left={<Text style={styles.price}>{free ? "Free" : `₹${formatInr(price)}`}</Text>}
          right={
            <CardAction
              icon={free ? "download-outline" : "card-outline"}
              label={busy ? "Processing…" : acquireLabel ?? "Get"}
              tone="gold"
              loading={busy}
              disabled={busy}
              onPress={onAcquire}
            />
          }
        />
      ) : null}
    </ListCard>
  );
}

function formatInr(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  courseHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.card },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  courseTitle: { ...typography.label, color: colors.ink, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4, flexWrap: "wrap" },
  metaText: { ...typography.caption, color: colors.textMuted },
  price: { fontSize: 18, fontWeight: "800", color: colors.navy },

  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.xs },
  noteText: { ...typography.caption, color: colors.textMuted, flex: 1 },
});
