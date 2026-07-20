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
import { useSourceQuery, type SourceQueryResult } from "@/api/query";
import { useApiMutation } from "@/api/mutations";
import type {
  AdviceRow,
  ArticleDetail,
  ArticleRow,
  AssignmentRow,
  AttendanceData,
  CalendarData,
  CertificateRow,
  ConsultationRow,
  ContributorGrant,
  CourseDetailResponse,
  CourseEnrolResponse,
  CourseListResponse,
  DashboardData,
  DietPlanRow,
  ExamRow,
  FeedData,
  GrantRelationship,
  HealthData,
  InsightsData,
  LabReportRow,
  LiveClassRow,
  MarksData,
  ReminderRow,
  ReportCardRow,
  SelfCalendarData,
  SelfReportData,
  SelfTimetableRow,
  SubscriptionData,
  TeacherFeedbackRow,
  TimetableData,
  WorkshopRow,
} from "@/api/student-types";

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

/** Timetable — enrolled returns periods+slots grid; self a flat slot list. */
export function useTimetable(): SourceQueryResult<TimetableData | SelfTimetableRow[]> {
  return useSourceQuery<TimetableData | SelfTimetableRow[]>({
    key: "timetable",
    feature: FEATURE.timetable,
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

/** Activity feed — always-allowed; backend resolves enrolled/self internally. */
export function useFeed(): SourceQueryResult<FeedData> {
  return useSourceQuery<FeedData>({
    key: "feed",
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

/** Assignments — list with status/marks. */
export function useAssignments(): SourceQueryResult<AssignmentRow[]> {
  return useSourceQuery<AssignmentRow[]>({
    key: "assignments",
    feature: FEATURE.assignments,
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

/** Log a BMI reading. */
export function useLogBmi() {
  return useApiMutation<{ id: number; bmi: number }, { height_cm: number; weight_kg: number }>({
    path: "/api/student/bmi",
    body: (v) => v,
    invalidate: [["health"], ["dashboard"], ["feed"]],
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

/** Mark the whole feed read (POST /feed). */
export function useMarkFeedRead() {
  return useApiMutation<{ ok: boolean }, void>({
    path: "/api/student/feed",
    invalidate: [["feed"]],
  });
}

// ── Phase 4: content read screens ───────────────────────────────────────────

/** Course catalog + the student's enrolled courses (always-allowed). */
export function useCourses(): SourceQueryResult<CourseListResponse> {
  return useSourceQuery<CourseListResponse>({
    key: "courses",
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

/** Certificates issued to the student. */
export function useCertificates(): SourceQueryResult<CertificateRow[]> {
  return useSourceQuery<CertificateRow[]>({
    key: "certificates",
    feature: FEATURE.certificates,
    build: () => ({ path: "/api/student/certificates" }),
  });
}

/** Live classes the student is enrolled in. */
export function useLiveClasses(): SourceQueryResult<LiveClassRow[]> {
  return useSourceQuery<LiveClassRow[]>({
    key: "liveClasses",
    feature: FEATURE.liveClasses,
    build: () => ({ path: "/api/student/live-classes" }),
  });
}

/** Workshops & webinars (student-specific + broadcast). */
export function useWorkshops(): SourceQueryResult<WorkshopRow[]> {
  return useSourceQuery<WorkshopRow[]>({
    key: "workshops",
    feature: FEATURE.workshops,
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

/** Learning articles (always-allowed). */
export function useArticles(): SourceQueryResult<ArticleRow[]> {
  return useSourceQuery<ArticleRow[]>({
    key: "articles",
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
