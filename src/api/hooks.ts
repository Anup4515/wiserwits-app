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
import type {
  AttendanceData,
  CalendarData,
  DashboardData,
  ExamRow,
  InsightsData,
  MarksData,
  ReportCardRow,
  SelfCalendarData,
  SelfReportData,
  SelfTimetableRow,
  TimetableData,
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
