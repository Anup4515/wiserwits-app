/**
 * Response types for the `/api/student/*` read endpoints consumed in Phase 2.
 * These mirror the exact JSON the backend returns (see the route handlers in
 * `ww-student-dashboard`). Every endpoint wraps its payload in `{ data: ... }`;
 * the types below describe the inner `data`.
 *
 * String-vs-number gotchas are preserved verbatim: fields the backend selects
 * raw from numeric columns arrive as STRINGS; fields cast with `::float8` /
 * run through `parseFloat` arrive as NUMBERS. Booleans arrive as 0 | 1.
 */

// ── Source ──────────────────────────────────────────────────────────────────
export type Source = "enrolled" | "self";

// ── Enrollments (/enrollments) ───────────────────────────────────────────────
// One row per class/section a student belongs to (current + past, across
// schools if transferred). Drives the class switcher so an enrolled student can
// browse each enrolled class's academic data. `is_current` arrives as 0 | 1 —
// use a truthy check. Mirrors the backend's EnrollmentRow verbatim.
export interface EnrollmentRow {
  enrollment_id: number;
  class_section_id: number;
  session_id: number;
  session_name: string;
  session_start_date: string;
  session_end_date: string;
  class_name: string;
  section_name: string;
  partner_id: number;
  partner_name: string | null;
  is_current: boolean;
  status: string;
  enrollment_date: string | null;
  roll_number: number | null;
}

// ── Profile (/profile) ───────────────────────────────────────────────────────
// Full student record shown on the profile-details screen (opened from the
// home header avatar). Mirrors the dashboard's profile page: personal, contact,
// guardian, health and (for enrolled students) enrollment/consultant fields.
// Loads for INDEPENDENT students too — the backend uses `getStudentIdentity`,
// not context, so no active enrollment is required. `enrollment` is null for
// self-tracked students; the screen hides the academic card then.
export interface StudentProfile {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  father_name: string | null;
  mother_name: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  profile_image: string | null;
  status: string | null;
  height: string | null;
  weight: string | null;
  blood_group: string | null;
  grade_level: number | null;
  consultant_name: string | null;
  consultant_email: string | null;
}

export interface ProfileEnrollment {
  school_name: string | null;
  class_name: string;
  section_name: string;
  roll_number: string | null;
  session_name: string;
}

export interface ProfileData {
  student: StudentProfile;
  enrollment: ProfileEnrollment | null;
}

// ── Dashboard (/dashboard) ──────────────────────────────────────────────────
export interface DashboardData {
  student: {
    id: number;
    name: string;
    email: string;
    has_active_enrollment: boolean;
    has_past_enrollment: boolean;
    school_id: number | null;
    school_name: string | null;
    class_name: string | null;
    section_name: string | null;
    grade_level: number | null;
  };
  school: DashboardSchool | null;
  self: DashboardSelf | null;
  personal: DashboardPersonal;
}

export interface DashboardSchool {
  attendance: { total: number; present: number; percentage: number };
  attendance_trend: { month: string; percentage: number }[];
  assignments: { total: number; pending: number };
  upcoming_exams: {
    id: number; name: string; start_date: string; end_date: string; subject_count: number;
  }[];
  today_timetable: {
    period_number: number; start_time: string; end_time: string;
    slot_type: string; label: string | null;
    subject_name: string | null; teacher_name: string | null; room_number: string | null;
  }[];
  recent_marks: {
    exam_name: string; subject_name: string;
    obtained_marks: string; maximum_marks: string; percentage: string; grade: string | null;
  }[];
  holistic_avg: { parameter_name: string; average_pct: number; rated_count: number }[];
  // Overall holistic average for the most recent rated month (normalised 0–100).
  holistic_month: { avg_pct: number | null; month: string | null; rated_count: number };
}

export interface DashboardSelf {
  attendance: { total: number; present: number; percentage: number };
  exams: { count: number };
  recent_marks: {
    exam_name: string; subject: string; obtained: string; maximum: string;
    exam_date: string; grade: string | null;
  }[];
  timetable: { slot_count: number };
  today_timetable: {
    start_time: string; end_time: string; subject: string;
    teacher_name: string | null; location: string | null;
  }[];
  holistic: { avg: number | null; rated_count: number; month: string | null };
}

export interface DashboardPersonal {
  subscription: { plan_name: string; status: string; expires_at: string | null } | null;
  latest_bmi: { height_cm: string; weight_kg: string; bmi: string; record_date: string } | null;
  counts: {
    report_cards: number; teacher_feedbacks: number; advice_requests: number;
    certificates: number; doctor_consultations: number; workshops: number;
  };
  upcoming_workshops: {
    id: number; title: string; start_date: string; description: string | null; join_link: string | null;
  }[];
  recent_consultations: {
    id: number; scheduled_at: string; status: string | null; doctor_name: string | null;
  }[];
  // Learning — most recent enrolled courses (for a "Continue learning" card).
  enrolled_courses: { id: number; title: string; slug: string }[];
  // Learning — the single nearest upcoming live class, or null.
  next_live_class: { id: number; title: string; start_time: string; join_link: string | null } | null;
  // Health — the single nearest upcoming appointment/test reminder, or null.
  next_reminder: { id: number; title: string; appointment_date: string } | null;
}

// ── Insights (/insights — NEW in Phase 2) ───────────────────────────────────
export interface InsightsData {
  source: Source;
  student_name: string;
  overall: { percentage: number | null; grade: string | null; exams_counted: number };
  attendance: {
    percentage: number; present: number; total: number;
    trend: { month: string; percentage: number }[];
  };
  holistic: {
    month: string | null;
    average_pct: number | null;
    dimensions: { name: string; pct: number }[];
  };
  // Every subject with its overall %, best-first — rendered as colour-coded
  // bars (no strengths/focus split, which mislabels strong subjects).
  subjects: { subject: string; percentage: number }[];
  insight_of_the_day: { title: string; body: string; tone: "positive" | "warning" | "neutral" };
  // Wellness read — BMI + a short trend + consult/diet/lab counts.
  wellness: {
    latest_bmi: { bmi: number; record_date: string } | null;
    bmi_trend: { date: string; bmi: number }[];
    consultations_count: number;
    diet_plans_count: number;
    lab_reports_count: number;
  };
  // Learning read — courses/certificates counts + next live class.
  learning: {
    courses_enrolled: number;
    certificates: number;
    next_live_class: { id: number; title: string; start_time: string } | null;
  };
}

// ── Attendance (/attendance, /self/attendance) ──────────────────────────────
export interface AttendanceData {
  records: {
    id: number; date: string; status: string; remarks: string | null;
    marked_by: string | null; created_at: string;
  }[];
  stats: {
    total_days: number; present: number; absent: number;
    late: number; half_day: number; attendance_percentage: number;
  };
}

// ── Exams (/exams, /self/exams) ─────────────────────────────────────────────
export interface ExamRow {
  id: number;
  name: string;
  code: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  subject_count: number;
}

// ── Marks (/marks?exam_id, /self/exam-marks?exam) ───────────────────────────
export interface MarksData {
  marks: {
    id: number; subject_id: number; subject_name: string;
    obtained_marks: number | null; maximum_marks: number;
    is_absent: number; percentage: number | null; grade: string | null;
  }[];
  summary: {
    total_obtained: number; total_max: number; percentage: number; grade: string | null;
  };
  schedule: {
    subject_id: number; subject_name: string;
    exam_date: string | null; exam_time: string | null;
    duration_minutes: number | null; maximum_marks: number; room_number: string | null;
  }[];
}

// ── Reports: enrolled list (/reports) ───────────────────────────────────────
export interface ReportCardRow {
  id: number;
  type: string;
  reference_month: string | null;
  exam_id: number | null;
  attendance_percentage: string | null;
  overall_percentage: string | null;
  overall_grade: string | null;
  rank_in_class: number | null;
  teacher_remarks: string | null;
  pdf_url: string | null;
  generated_at: string;
}

// ── Reports: self live summary (/self/report) ───────────────────────────────
export interface SelfReportData {
  overall: { obtained: number; maximum: number; percentage: number; grade: string } | null;
  attendance: { total_days: number; present: number; percentage: number };
  exams: {
    exam_name: string; exam_date: string; obtained: number; maximum: number;
    percentage: number; grade: string | null;
    subjects: { subject: string; obtained: number; maximum: number; grade: string | null }[];
  }[];
  holistic: {
    period_month: string;
    dimensions: { dimension: string; rating: number }[];
    average: number;
  } | null;
}

// ── Timetable: enrolled (/timetable) ────────────────────────────────────────
export interface TimetableData {
  periods: {
    period_number: number; start_time: string; end_time: string;
    slot_type: string; label: string | null;
  }[];
  slots: {
    day_of_week: number; // 1=Sun .. 7=Sat
    period_number: number;
    subject_name: string | null; teacher_name: string | null; room_number: string | null;
  }[];
}

// ── Timetable: self (/self/timetable) — flat recurring slots ────────────────
export type SelfTimetableRow = {
  id: number;
  day_of_week: number; // 0=Sun .. 6=Sat
  start_time: string;
  end_time: string;
  subject: string;
  teacher_name: string | null;
  location: string | null;
  filled_by_user_id: number | null;
  filled_by_name: string | null;
};

// ── Calendar: enrolled (/calendar) ──────────────────────────────────────────
export interface CalendarData {
  days: {
    date: string; day_of_week: string;
    is_holiday: number; is_working_saturday: number; holiday_reason: string | null;
  }[];
  summary: { total_working_days: number; total_holidays: number };
  workshops: CalendarWorkshop[];
  liveClasses: CalendarLiveClass[];
}

// ── Calendar: self (/self/calendar) — no days grid ──────────────────────────
export interface SelfCalendarData {
  timetable: SelfTimetableRow[];
  workshops: CalendarWorkshop[];
  liveClasses: CalendarLiveClass[];
}

export interface CalendarWorkshop {
  id: number; title: string; description: string | null;
  join_link: string | null; start_date: string;
}
export interface CalendarLiveClass {
  id: number; title: string; description: string | null;
  start_time: string; start_date: string; duration_minutes: number | null;
  join_link: string | null; status: string; recording_url: string | null;
}

// ── Activity feed (/feed — NEW in Phase 3) ──────────────────────────────────
export type FeedCategory =
  | "assignment" | "advice" | "feedback" | "consultation"
  | "diet" | "lab" | "report" | "marks" | "attendance"
  | "reminder" | "holistic" | "timetable" | "calendar"
  | "live_class" | "workshop" | "certificate";

export interface FeedItem {
  id: string;             // stable across categories, e.g. "event:123"
  category: FeedCategory;
  title: string;
  body: string | null;
  ts: string;             // ISO — screen groups by calendar day
  unread: boolean;
}

export interface FeedData {
  items: FeedItem[];
  nextCursor: string | null;
}

// ── Health & wellness (/health + sub-routes — Phase 3) ──────────────────────
// height/weight/bmi arrive as NUMBERS (::float8 in /health).
export interface BmiRecord {
  id: number; height: number; weight: number; bmi: number;
  record_date: string; created_at: string;
}

/**
 * A row as `/api/student/bmi` returns it — raw column names, and DECIMALs as
 * strings (pg's DECIMAL parser is left alone server-side to keep precision).
 * `/health` aliases and casts these; `toBmiRecord()` normalises this shape to
 * the `BmiRecord` the UI uses.
 */
export interface BmiHistoryRow {
  id: number;
  height_cm: string | number;
  weight_kg: string | number;
  bmi: string | number;
  record_date: string;
  created_at: string;
}

/** One cursor page of BMI history; `nextCursor` is null once exhausted. */
export interface BmiHistoryPage {
  items: BmiHistoryRow[];
  nextCursor: string | null;
}
export interface HealthData {
  bmi_records: BmiRecord[];
  consultations_count: number;
  diet_plans_count: number;
  lab_reports_count: number;
}
export interface ConsultationRow {
  id: number; patient_name: string; problem: string; symptoms: string | null;
  scheduled_at: string; status: string; feedback: string | null; created_at: string;
}
export interface DietPlanRow {
  id: number; title: string; description: string | null; shared_by_id: number | null;
  share_date: string; valid_upto: string; file_path: string | null; created_at: string;
}
export interface LabReportRow {
  id: number; title: string; report_data: string | null;
  shared_by_id: number | null; created_at: string;
}

// ── Advice & feedback (/advice, /feedback — Phase 3) ─────────────────────────
export interface AdviceRow {
  id: number; message: string | null; preferred_time: string | null;
  status: string; feedback: string | null; file_path: string | null; created_at: string;
}
export interface TeacherFeedbackRow {
  id: number; subject: string | null; feedback: string | null;
  file_path: string | null; teacher_name: string | null; created_at: string;
}

// ── Assignments (/assignments — Phase 3) ────────────────────────────────────
// marks_obtained / total_marks arrive as STRINGS (raw numeric columns).
export interface AssignmentRow {
  id: number; title: string; description: string | null; deadline: string | null;
  status: string; assignment_status: string | null; quiz_for: string | null;
  assignment_link: string | null; marks_obtained: string | null;
  total_marks: string | null; created_at: string;
}

// ── Contributors / access grants (/access-grants — Phase 3) ─────────────────
export type GrantRelationship =
  | "self" | "parent" | "class_teacher" | "tuition_teacher" | "mentor";

// scope_* arrive as 0 | 1.
export interface ContributorGrant {
  id: number; invite_email: string; invite_name: string | null;
  relationship: GrantRelationship; status: string;
  scope_attendance: number; scope_marks: number; scope_timetable: number; scope_holistic: number;
  contributor_name: string | null;
  invited_at: string; accepted_at: string | null; expires_at: string | null;
}

// ── Subscription & plans (/subscription — Phase 4) ──────────────────────────
// `price_inr` arrives as a STRING (pg DECIMAL). `feature_labels` is the
// human-readable list shown on each plan card (null when a plan bundles none).
export interface PlanRow {
  id: number; slug: string; name: string; description: string | null;
  price_inr: string; duration_days: number; sort_order: number;
  feature_labels: string[] | null;
}

// One row of student_subscriptions_v2 joined to its plan. `currentSubscription`
// drives features today; `scheduledSubscription` is a queued downgrade.
export interface SubscriptionRow {
  id: number; plan_id: number; plan_slug: string; plan_name: string;
  status: string; starts_at: string | null; expires_at: string | null;
  payer_type: "student" | "partner" | "platform"; payer_partner_id: number | null;
}

export interface SubscriptionData {
  currentSubscription: SubscriptionRow | null;
  scheduledSubscription: SubscriptionRow | null;
  plans: PlanRow[];
}

// POST /subscription/order → the payload the app hands to Razorpay checkout.
export interface OrderResponse {
  order_id: string; key_id: string; amount: number; currency: string;
  plan_id: number; plan_name: string;
  prefill?: { name?: string; email?: string };
}

// POST /subscription/verify → what the four-case dispatcher applied.
export interface VerifyResponse {
  subscription_id: number | null;
  plan_name: string;
  action: "first_buy" | "upgrade" | "extend_active" | "schedule_downgrade" | "already_processed";
  status: "active" | "scheduled" | string;
  starts_at: string; expires_at: string;
  auto_enrolled_course_ids: number[];
  already_processed?: boolean;
}

// ── Courses / learning (Phase 4.5) ──────────────────────────────────────────
// `price` is a pg DECIMAL → STRING. Booleans are real JSON true/false.
export interface CourseCardRow {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  price: string;               // "499.00"
  duration_hours: number | null;
  level: string | null;
  image: string | null;
  type_of_course: string | null;
  is_published: boolean;
  is_enrolled: boolean;
}
export interface CourseListResponse {
  /** Not paginated — bounded by what this student has bought. */
  enrolled: CourseCardRow[];
  /** Paginated; append across pages. */
  catalog: CourseCardRow[];
  nextCursor: string | null;
}
export interface CourseEnrolResponse {
  enrolled: true;
  course_id: number;
}
// GET /courses/{slug} → nested under data.course.
export interface CourseDetail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  price: string;
  duration_hours: number | null;
  level: string | null;
  image: string | null;
  type_of_course: string | null;
  videos: string[];            // normalised server-side, never null
  documents: string[];
  is_enrolled: boolean;
}
export interface CourseDetailResponse {
  course: CourseDetail;
}
// POST /courses/order → handed to Razorpay. `amount` is paise (integer).
export interface CourseOrderResponse {
  order_id: string;
  key_id: string;
  amount: number;
  currency: "INR";
  course_id: number;
  course_title: string;
  prefill?: { name: string; email: string };
}
// POST /courses/verify
export interface CourseVerifyResponse {
  purchase_id: number | null;
  course_slug: string;
  course_title: string;
  already_processed: boolean;
}

// ── Course reviews (/courses/[slug]/reviews) ─────────────────────────────────
// One review per (student, course). `rating` is 1–5. `my_review` is the
// signed-in student's own row (null until they submit); `recent` is the latest
// reviews (name masked to first name + last initial). Only enrolled students
// may post — `is_enrolled` gates the form.
export interface CourseReviewRow {
  id: number;
  rating: number;
  feedback: string | null;
  updated_at: string;
  student_name: string;
}
export interface MyCourseReview {
  rating: number;
  feedback: string | null;
  updated_at: string;
}
export interface CourseReviewsData {
  is_enrolled: boolean;
  summary: { avg_rating: number | null; count: number };
  my_review: MyCourseReview | null;
  recent: CourseReviewRow[];
}

// ── Content screens (Phase 4.7) ─────────────────────────────────────────────
export interface CertificateRow {
  id: number;
  title: string;
  description: string | null;  // always null (server sends NULL::text)
  file_url: string | null;
  created_at: string;
}
export interface LiveClassRow {
  id: number;
  title: string;
  description: string | null;
  class_type: string | null;
  start_time: string;
  join_link: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  recording_url: string | null;
  created_at: string;
}
export interface WorkshopRow {
  id: number;
  title: string;
  description: string | null;
  join_link: string | null;
  start_date: string;          // DATE as STRING
  end_date: string | null;     // always null
  created_at: string;
}
export interface ArticleRow {
  slug: string;
  badge: string | null;
  title: string;
  excerpt: string | null;
}
export interface ArticleSection {
  heading: string | null;
  paragraph: string;
}
export interface ArticleDetail {
  slug: string;
  badge: string | null;
  title: string;
  excerpt: string | null;
  sections: ArticleSection[];
  updated_at: string;
}
export interface ReminderRow {
  id: number;
  title: string;
  description: string | null;
  appointment_date: string;    // DATE as STRING
  created_at: string;
}

// ── Holistic (/holistic, /self/holistic) ─────────────────────────────────────
// Monthly holistic development. Enrolled returns parameter groups, each with
// its sub-parameters (rating out of max_rating, optional grade + comment).
// Self returns a flat list of dimension rows (rating 0–10 + reflection, filled
// by a contributor). Both are month-scoped via ?month=YYYY-MM.
export interface HolisticSubParam {
  name: string;
  rating_value: number | null;
  max_rating: number | null;
  rating_grade: string | null;
  comments: string | null;
}
export interface HolisticParamGroup {
  parameter_name: string;
  stage: string;
  sub_parameters: HolisticSubParam[];
}
export interface SelfHolisticRow {
  id: number;
  period_month: string;         // "YYYY-MM-DD"
  dimension: string;
  rating: number;               // 0–10
  reflection: string | null;
  filled_by_user_id: number | null;
  filled_by_name: string | null;
}

/**
 * Generic page wrapper for the offset-paginated list endpoints. `nextCursor` is
 * the opaque next-page token (a page number today) — hand it straight back as
 * `?page=`; null once the list is exhausted.
 */
export interface Paged<T> {
  items: T[];
  nextCursor: string | null;
}
