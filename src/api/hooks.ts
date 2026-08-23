/**
 * Per-screen data hooks for the Phase 2 read screens. Each resolves the right
 * source (enrolled `erp_*` vs independent `/self/*`) via `useSourceQuery`, so a
 * screen just calls e.g. `useAttendance(month)` and renders — the source split,
 * `?enrollment_id=` override, gating and cache keys are handled underneath.
 *
 * Where enrolled and self return DIFFERENT shapes (reports, timetable, calendar,
 * marks), the hook's payload is a union; the screen narrows on `source`.
 */
import { FEATURE } from "@/lib/features";
import {
  useSourceQuery,
  useSourceInfiniteQuery,
  useApiQuery,
  type SourceQueryResult,
  type SourceInfiniteQueryResult,
} from "@/api/query";
import { useApiMutation } from "@/api/mutations";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useEnrollment } from "@/features/enrollment/EnrollmentContext";
import { useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type {
  AdviceRow,
  ArticleDetail,
  ArticleRow,
  AssignmentRow,
  AttendanceData,
  BmiHistoryPage,
  BmiHistoryRow,
  BmiRecord,
  CalendarData,
  CertificateRow,
  ConsultationRow,
  ContributorGrant,
  CourseDetailResponse,
  CourseReviewsData,
  MyCourseReview,
  CourseEnrolResponse,
  CourseListResponse,
  DashboardData,
  DietPlanRow,
  EnrollmentRow,
  ExamRow,
  FeedData,
  GrantRelationship,
  HealthData,
  HolisticParamGroup,
  InsightsData,
  LabReportRow,
  LiveClassRow,
  MarksData,
  Paged,
  ProfileData,
  ReminderRow,
  ReportCardRow,
  SelfCalendarData,
  SelfHolisticRow,
  SelfReportData,
  SelfTimetableRow,
  SubscriptionData,
  TeacherFeedbackRow,
  TimetableData,
  WorkshopRow,
} from "@/api/student-types";

/**
 * Every class/section this student is enrolled in (current + past). Backs the
 * class switcher. Uses a bare `useApiQuery` — NOT `useSourceQuery` — because the
 * list is the same whichever class is selected; folding the `?enrollment_id=`
 * override in would needlessly refetch on every switch. Only enrolled accounts
 * have enrollments, so it's gated on `source === "enrolled"`; the account id is
 * in the cache key so siblings don't share a list.
 */
export function useEnrollments(): UseQueryResult<EnrollmentRow[]> {
  const { activeStudentId } = useAuth();
  const { source } = useEnrollment();
  return useApiQuery<EnrollmentRow[]>(
    ["enrollments", activeStudentId],
    "/api/student/enrollments",
    source === "enrolled" && activeStudentId != null,
  );
}

/**
 * All of the student's enrollments including PENDING join requests. Unlike
 * useEnrollments (gated on source==='enrolled'), this fetches for INDEPENDENT
 * students too — they're exactly the ones who receive join requests. Filter the
 * result to status==='pending' at the call site.
 */
export function useJoinRequests(): UseQueryResult<EnrollmentRow[]> {
  const { activeStudentId } = useAuth();
  return useApiQuery<EnrollmentRow[]>(
    ["join-requests", activeStudentId],
    "/api/student/enrollments",
    activeStudentId != null,
  );
}

/** Approve a school's join request (id → pending becomes active). */
export function useApproveEnrollment() {
  return useApiMutation<{ id: number; status: string }, number>({
    method: "post",
    path: (id) => `/api/student/enrollments/${id}/approve`,
    invalidate: [["join-requests"], ["enrollments"], ["dashboard"], ["profile"]],
  });
}

/** Decline a school's join request (id → pending becomes rejected). */
export function useDeclineEnrollment() {
  return useApiMutation<{ id: number; status: string }, number>({
    method: "post",
    path: (id) => `/api/student/enrollments/${id}/decline`,
    invalidate: [["join-requests"], ["enrollments"]],
  });
}

/**
 * The full student record for the profile-details screen (opened from the home
 * header avatar). A bare `useApiQuery` — the profile isn't source- or
 * enrollment-scoped, so no `?enrollment_id=` override is threaded; the backend
 * resolves the record from identity alone and returns it for independent
 * students too. Account id is in the cache key so siblings don't share.
 */
export function useProfile(): UseQueryResult<ProfileData> {
  const { activeStudentId } = useAuth();
  return useApiQuery<ProfileData>(
    ["profile", activeStudentId],
    "/api/student/profile",
    activeStudentId != null,
  );
}

/** The profile fields a student may edit from the app (mirrors the backend's
 * ALLOWED_FIELDS + the independent-student grade). All optional — only send
 * what changed. */
export interface ProfileUpdate {
  phone?: string;
  alternate_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  grade_level?: number | null;
}

/** Save edited profile fields (POST /profile), then refresh the profile and
 * dashboard (the header/grade may change). */
export function useUpdateProfile() {
  return useApiMutation<unknown, ProfileUpdate>({
    method: "post",
    path: "/api/student/profile",
    body: (vars) => vars,
    invalidate: [["profile"], ["dashboard"]],
  });
}

/** Upload a new profile photo (multipart). The picked image is appended as
 * `file`; on success the profile (and the avatar it feeds) refreshes. */
export function useUploadProfileImage() {
  const qc = useQueryClient();
  return useMutation<{ profile_image: string | null }, Error, FormData>({
    mutationFn: async (form) => {
      const res = await api.upload<{ profile_image: string | null }>(
        "/api/student/profile/image",
        form,
      );
      if (res.error) throw new Error(res.error);
      return res.data as { profile_image: string | null };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Home — always-allowed; one endpoint handles both sources internally. */
export function useDashboard(): SourceQueryResult<DashboardData> {
  return useSourceQuery<DashboardData>({
    key: "dashboard",
    build: () => ({ path: "/api/student/dashboard" }),
  });
}

/** Insights — new aggregate endpoint; handles both sources internally. */
export function useInsights(): SourceQueryResult<InsightsData> {
  return useSourceQuery<InsightsData>({
    key: "insights",
    build: () => ({ path: "/api/student/insights" }),
  });
}

export function useAttendance(month: string): SourceQueryResult<AttendanceData> {
  return useSourceQuery<AttendanceData>({
    key: "attendance",
    feature: FEATURE.attendance,
    keyExtra: [month],
    build: (source) => ({
      path: source === "enrolled"
        ? "/api/student/attendance"
        : "/api/student/self/attendance",
      params: { month },
    }),
  });
}

export function useExams(): SourceQueryResult<ExamRow[]> {
  return useSourceQuery<ExamRow[]>({
    key: "exams",
    feature: FEATURE.exams,
    build: (source) => ({
      path: source === "enrolled" ? "/api/student/exams" : "/api/student/self/exams",
    }),
  });
}

/**
 * Marks for one exam. Enrolled keys by numeric `exam_id`; self keys by the exam
 * `name` (its `id` is a synthetic row number). Disabled until an exam is chosen.
 */
export function useMarks(exam: ExamRow | null): SourceQueryResult<MarksData> {
  return useSourceQuery<MarksData>({
    key: "marks",
    feature: FEATURE.marks,
    enabled: exam != null,
    keyExtra: [exam?.id, exam?.name],
    build: (source) =>
      source === "enrolled"
        ? { path: "/api/student/marks", params: { exam_id: exam?.id } }
        : { path: "/api/student/self/exam-marks", params: { exam: exam?.name } },
  });
}

/** Report card — enrolled returns a list of stored cards; self a live summary. */
export function useReports(): SourceQueryResult<ReportCardRow[] | SelfReportData> {
  return useSourceQuery<ReportCardRow[] | SelfReportData>({
    key: "reports",
    feature: FEATURE.report,
    build: (source) => ({
      path: source === "enrolled" ? "/api/student/reports" : "/api/student/self/report",
    }),
  });
}

/**
 * Holistic development for one month. Enrolled returns parameter groups (each
 * with its sub-parameters); self returns a flat list of dimension rows filled
 * by a contributor. Month-scoped via `?month=YYYY-MM`; the override enrollment
 * is threaded automatically for enrolled students.
 */
export function useHolistic(month: string): SourceQueryResult<HolisticParamGroup[] | SelfHolisticRow[]> {
  return useSourceQuery<HolisticParamGroup[] | SelfHolisticRow[]>({
    key: "holistic",
    feature: FEATURE.holistic,
    keyExtra: [month],
    build: (source) => ({
      path: source === "enrolled" ? "/api/student/holistic" : "/api/student/self/holistic",
      params: { month },
    }),
  });
}

/** Timetable — enrolled returns periods+slots grid; self a flat slot list. */
export function useTimetable(enabled = true): SourceQueryResult<TimetableData | SelfTimetableRow[]> {
  return useSourceQuery<TimetableData | SelfTimetableRow[]>({
    key: "timetable",
    feature: FEATURE.timetable,
    enabled,
    build: (source) => ({
      path: source === "enrolled" ? "/api/student/timetable" : "/api/student/self/timetable",
    }),
  });
}

/** Calendar — enrolled has a days grid + summary; self overlays timetable only. */
export function useCalendar(month: string): SourceQueryResult<CalendarData | SelfCalendarData> {
  return useSourceQuery<CalendarData | SelfCalendarData>({
    key: "calendar",
    feature: FEATURE.calendar,
    keyExtra: [month],
    build: (source) => ({
      path: source === "enrolled" ? "/api/student/calendar" : "/api/student/self/calendar",
      params: { month },
    }),
  });
}

// ── Phase 3: retention + write surfaces ─────────────────────────────────────
// The feed and the legacy student_id-keyed resources (health, advice, feedback,
// assignments, contributors) aren't source-split, so `build` ignores `source`
// and hits one path — but useSourceQuery still folds the active account into the
// cache key and gates on the plan feature.

/**
 * Activity feed — always-allowed; backend resolves enrolled/self internally.
 *
 * Cursor-paginated: `/feed` returns 25 items plus a `nextCursor`, and older
 * pages are fetched by feeding that back as `?before=`. This used to be a plain
 * query with no params, which meant the screen showed the first 25 events and
 * nothing older was reachable at all.
 *
 * `NotificationBell` shares this cache and reads `pages[0]` for its badge.
 */
export function useFeed(): SourceInfiniteQueryResult<FeedData> {
  return useSourceInfiniteQuery<FeedData>({
    key: "feed",
    cursorParam: "before",
    build: () => ({ path: "/api/student/feed" }),
  });
}

/** Health overview — BMI history + consultation/diet/lab counts. */
export function useHealth(): SourceQueryResult<HealthData> {
  return useSourceQuery<HealthData>({
    key: "health",
    feature: FEATURE.health,
    build: () => ({ path: "/api/student/health" }),
  });
}

export function useConsultations(): SourceQueryResult<ConsultationRow[]> {
  return useSourceQuery<ConsultationRow[]>({
    key: "consultations",
    feature: FEATURE.health,
    build: () => ({ path: "/api/student/health/doctor-consultations" }),
  });
}

export function useDietPlans(): SourceQueryResult<DietPlanRow[]> {
  return useSourceQuery<DietPlanRow[]>({
    key: "dietPlans",
    feature: FEATURE.health,
    build: () => ({ path: "/api/student/health/diet-plans" }),
  });
}

export function useLabReports(): SourceQueryResult<LabReportRow[]> {
  return useSourceQuery<LabReportRow[]>({
    key: "labReports",
    feature: FEATURE.health,
    build: () => ({ path: "/api/student/health/lab-reports" }),
  });
}

/** Advice requests to the assigned consultant (list + thread). */
export function useAdvice(): SourceQueryResult<AdviceRow[]> {
  return useSourceQuery<AdviceRow[]>({
    key: "advice",
    feature: FEATURE.advice,
    build: () => ({ path: "/api/student/advice" }),
  });
}

/** Teacher feedback (read-only). */
export function useFeedback(): SourceQueryResult<TeacherFeedbackRow[]> {
  return useSourceQuery<TeacherFeedbackRow[]>({
    key: "feedback",
    feature: FEATURE.feedback,
    build: () => ({ path: "/api/student/feedback" }),
  });
}

/** Assignments — paginated; grows across the whole academic year. */
export function useAssignments(): SourceInfiniteQueryResult<Paged<AssignmentRow>> {
  return useSourceInfiniteQuery<Paged<AssignmentRow>>({
    key: "assignments",
    feature: FEATURE.assignments,
    cursorParam: "page",
    build: () => ({ path: "/api/student/assignments" }),
  });
}

/** Contributors (access grants) — only meaningful for independent students. */
export function useContributors(): SourceQueryResult<ContributorGrant[]> {
  return useSourceQuery<ContributorGrant[]>({
    key: "contributors",
    build: () => ({ path: "/api/student/access-grants" }),
  });
}

/**
 * Subscription state + plan catalog (Phase 4). Always-allowed and not
 * source-split — one endpoint returns the current/scheduled subscription and
 * the full plan catalog. The purchase flow (order → Razorpay → verify) lives in
 * the screen; this hook is just the read side.
 */
export function useSubscription(): SourceQueryResult<SubscriptionData> {
  return useSourceQuery<SubscriptionData>({
    key: "subscription",
    build: () => ({ path: "/api/student/subscription" }),
  });
}

// ── Mutations (Phase 3 writes) ──────────────────────────────────────────────

/** Mark an assignment submitted (id → POST /assignments/[id]/submit). */
export function useSubmitAssignment() {
  return useApiMutation<{ id: number; assignment_status: string }, number>({
    path: (id) => `/api/student/assignments/${id}/submit`,
    invalidate: [["assignments"], ["feed"]],
  });
}

/**
 * Full BMI history, cursor-paginated (`/api/student/bmi`).
 *
 * Separate from `useHealth()` on purpose: `/health` is an OVERVIEW (latest
 * reading + counts) and returns a capped preview of readings, so driving the
 * history list off it meant anything older than that cap was unreachable.
 * `/bmi` is the paginated history endpoint.
 */
export function useBmiHistory(): SourceInfiniteQueryResult<BmiHistoryPage> {
  return useSourceInfiniteQuery<BmiHistoryPage>({
    key: "bmi-history",
    feature: FEATURE.health,
    cursorParam: "before",
    build: () => ({ path: "/api/student/bmi" }),
  });
}

/**
 * `/bmi` returns the raw column names as DECIMAL strings; `/health` aliases and
 * casts them. Normalise here so both paths hand the UI the same `BmiRecord`.
 */
export function toBmiRecord(row: BmiHistoryRow): BmiRecord {
  return {
    id: row.id,
    height: Number(row.height_cm),
    weight: Number(row.weight_kg),
    bmi: Number(row.bmi),
    record_date: row.record_date,
    created_at: row.created_at,
  };
}

/** Log a BMI reading. */
export function useLogBmi() {
  return useApiMutation<{ id: number; bmi: number }, { height_cm: number; weight_kg: number }>({
    path: "/api/student/bmi",
    body: (v) => v,
    invalidate: [["health"], ["bmi-history"], ["dashboard"], ["feed"]],
  });
}

/** Delete a BMI reading (id → DELETE /bmi/[id]). Ownership is enforced
 * server-side. Refreshes the health overview + history + dashboard latest-BMI. */
export function useDeleteBmi() {
  return useApiMutation<{ id: number }, number>({
    method: "delete",
    path: (id) => `/api/student/bmi/${id}`,
    invalidate: [["health"], ["bmi-history"], ["dashboard"]],
  });
}

/** Book a doctor consultation. */
export function useBookConsultation() {
  return useApiMutation<
    { id: number },
    { patient_name: string; problem: string; symptoms: string; scheduled_at: string }
  >({
    path: "/api/student/health/doctor-consultations",
    body: (v) => v,
    invalidate: [["consultations"], ["health"], ["feed"]],
  });
}

/** Send an advice request to the assigned consultant. */
export function useAskAdvice() {
  return useApiMutation<{ id: number }, { message: string; preferred_time?: string | null }>({
    path: "/api/student/advice",
    body: (v) => v,
    invalidate: [["advice"], ["feed"]],
  });
}

/** Invite a contributor (access grant). */
export function useInviteContributor() {
  return useApiMutation<
    ContributorGrant,
    {
      invite_email: string;
      invite_name?: string | null;
      relationship: GrantRelationship;
      scope_attendance?: boolean;
      scope_marks?: boolean;
      scope_timetable?: boolean;
      scope_holistic?: boolean;
    }
  >({
    path: "/api/student/access-grants",
    body: (v) => v,
    invalidate: [["contributors"]],
  });
}

/** Revoke a contributor grant (id → DELETE /access-grants/[id]). */
export function useRevokeContributor() {
  return useApiMutation<{ ok: boolean }, number>({
    method: "delete",
    path: (id) => `/api/student/access-grants/${id}`,
    invalidate: [["contributors"]],
  });
}

/**
 * Dispute a school enrollment (id → POST /enrollments/[id]/dispute). Use only
 * when a school added the student by mistake — the enrollment is flagged
 * 'disputed' (data preserved), drops out of the active view, and contributor
 * editing resumes. Refreshes enrollments + the home dashboard.
 */
export function useDisputeEnrollment() {
  return useApiMutation<{ id: number; status: string }, number>({
    method: "post",
    path: (id) => `/api/student/enrollments/${id}/dispute`,
    invalidate: [["enrollments"], ["dashboard"], ["profile"]],
  });
}

/** Mark the whole feed read (POST /feed). */
export function useMarkFeedRead() {
  return useApiMutation<{ ok: boolean }, void>({
    path: "/api/student/feed",
    invalidate: [["feed"]],
  });
}

// ── Phase 4: content read screens ───────────────────────────────────────────

/**
 * Course catalog + the student's enrolled courses (always-allowed).
 *
 * Only `catalog` pages — `enrolled` is bounded by what the student has bought
 * and arrives whole on every page, so read it from `pages[0]`.
 */
export function useCourses(): SourceInfiniteQueryResult<CourseListResponse> {
  return useSourceInfiniteQuery<CourseListResponse>({
    key: "courses",
    cursorParam: "page",
    build: () => ({ path: "/api/student/courses" }),
  });
}

/** One course's detail (enrolled only — the endpoint 403s otherwise). */
export function useCourse(slug: string): SourceQueryResult<CourseDetailResponse> {
  return useSourceQuery<CourseDetailResponse>({
    key: "course",
    enabled: !!slug,
    keyExtra: [slug],
    build: () => ({ path: `/api/student/courses/${slug}` }),
  });
}

/**
 * Reviews for a course: rating summary, the student's own review, and recent
 * reviews. A plain `useApiQuery` (not source-split) — reviews are a per-student
 * course endpoint, not an enrolled/self split. Account id + slug are in the
 * cache key so switching account or course refetches.
 */
export function useCourseReviews(slug: string): UseQueryResult<CourseReviewsData> {
  const { activeStudentId } = useAuth();
  return useApiQuery<CourseReviewsData>(
    ["course-reviews", activeStudentId, slug],
    `/api/student/courses/${slug}/reviews`,
    !!slug && activeStudentId != null,
  );
}

/**
 * Post (or update) the student's review for a course. Upserts server-side, so
 * re-submitting edits the existing review. Refreshes the reviews list on success.
 */
export function useSubmitCourseReview(slug: string) {
  return useApiMutation<{ my_review: MyCourseReview }, { rating: number; feedback: string | null }>({
    method: "post",
    path: `/api/student/courses/${slug}/reviews`,
    body: (vars) => vars,
    invalidate: [["course-reviews"]],
  });
}

/** Certificates issued to the student — paginated. */
export function useCertificates(): SourceInfiniteQueryResult<Paged<CertificateRow>> {
  return useSourceInfiniteQuery<Paged<CertificateRow>>({
    key: "certificates",
    feature: FEATURE.certificates,
    cursorParam: "page",
    build: () => ({ path: "/api/student/certificates" }),
  });
}

/** Live classes the student is enrolled in — paginated. */
export function useLiveClasses(): SourceInfiniteQueryResult<Paged<LiveClassRow>> {
  return useSourceInfiniteQuery<Paged<LiveClassRow>>({
    key: "liveClasses",
    feature: FEATURE.liveClasses,
    cursorParam: "page",
    build: () => ({ path: "/api/student/live-classes" }),
  });
}

/** Workshops & webinars (student-specific + broadcast) — paginated. */
export function useWorkshops(): SourceInfiniteQueryResult<Paged<WorkshopRow>> {
  return useSourceInfiniteQuery<Paged<WorkshopRow>>({
    key: "workshops",
    feature: FEATURE.workshops,
    cursorParam: "page",
    build: () => ({ path: "/api/student/workshops" }),
  });
}

/** Reminders (appointments / tests). */
export function useReminders(): SourceQueryResult<ReminderRow[]> {
  return useSourceQuery<ReminderRow[]>({
    key: "reminders",
    feature: FEATURE.reminders,
    build: () => ({ path: "/api/student/reminders" }),
  });
}

/** Learning articles (always-allowed) — paginated; the library keeps growing. */
export function useArticles(): SourceInfiniteQueryResult<Paged<ArticleRow>> {
  return useSourceInfiniteQuery<Paged<ArticleRow>>({
    key: "articles",
    cursorParam: "page",
    build: () => ({ path: "/api/student/articles" }),
  });
}

/** One article's full content. */
export function useArticle(slug: string): SourceQueryResult<ArticleDetail> {
  return useSourceQuery<ArticleDetail>({
    key: "article",
    enabled: !!slug,
    keyExtra: [slug],
    build: () => ({ path: `/api/student/articles/${slug}` }),
  });
}

// ── Phase 4 mutations ───────────────────────────────────────────────────────

/** Free enrolment into a published course (id → POST /courses). */
export function useEnrollCourse() {
  return useApiMutation<CourseEnrolResponse, number>({
    path: "/api/student/courses",
    body: (course_id) => ({ course_id }),
    invalidate: [["courses"], ["course"], ["dashboard"]],
  });
}

/** Change the signed-in account's password. */
export function useChangePassword() {
  return useApiMutation<
    { ok: boolean },
    { current_password: string; new_password: string }
  >({
    path: "/api/student/account/change-password",
    body: (v) => v,
  });
}
