import type { Href } from "expo-router";

import type { TileIconName } from "@/components/icons/tile-icon";

/**
 * The Explore launcher tiles — every non-tab destination a student can reach
 * from Home. Shared between the Home screen (which shows only the first
 * `HOME_EXPLORE_COUNT` as compact icon tiles + a "View all" tile) and the full
 * Explore-all screen (which renders them as grouped list rows with subtitles),
 * so the two never drift apart.
 *
 * `group` + `subtitle` are used only by the Explore-all screen; Home ignores
 * them. `order` within a group is the array order below.
 */
export type ExploreGroup = "Academics" | "Learning" | "Wellness & support" | "Account";

export interface ExploreItem {
  /** Key into the 3D tile artwork (see components/icons/tile-icon). */
  icon: TileIconName;
  label: string;
  href: Href;
  group: ExploreGroup;
  subtitle: string;
  /**
   * Only meaningful for self-tracked (non-enrolled) students — an enrolled
   * student's records come from their school. The Explore-all screen hides
   * these when `user.enrollment_id` is set (mirrors the Profile tab's gate).
   */
  selfOnly?: boolean;
}

export const EXPLORE: ExploreItem[] = [
  // The first HOME_EXPLORE_COUNT also appear on Home, so keep the most-used first.
  { icon: "activity", label: "Activity", href: "/feed", group: "Wellness & support", subtitle: "Recent updates & alerts" },
  { icon: "attendance", label: "Attendance", href: "/(tabs)/academics/attendance", group: "Academics", subtitle: "Daily presence & monthly %" },
  { icon: "exams", label: "Exams", href: "/(tabs)/academics/exams", group: "Academics", subtitle: "Marks & upcoming exams" },
  { icon: "assignments", label: "Assignments", href: "/assignments", group: "Academics", subtitle: "Tasks & submissions" },
  { icon: "health", label: "Health", href: "/(tabs)/health", group: "Wellness & support", subtitle: "BMI, consultations, diet & labs" },
  { icon: "advice", label: "Advice", href: "/advice", group: "Wellness & support", subtitle: "Ask Consultant, read feedback" },
  { icon: "report", label: "Report", href: "/(tabs)/academics/report", group: "Academics", subtitle: "Report card & holistic ratings" },
  { icon: "timetable", label: "Timetable", href: "/(tabs)/academics/timetable", group: "Academics", subtitle: "Weekly class schedule" },
  { icon: "calendar", label: "Calendar", href: "/(tabs)/academics/calendar", group: "Academics", subtitle: "Working days, holidays & events" },
  { icon: "insights", label: "Insights", href: "/insights", group: "Academics", subtitle: "How things are going, at a glance" },
  { icon: "plans", label: "Plans", href: "/subscription", group: "Account", subtitle: "View & change the plan" },
  { icon: "courses", label: "Courses", href: "/courses", group: "Learning", subtitle: "Browse, enrol & keep learning" },
  { icon: "live-classes", label: "Live classes", href: "/live-classes", group: "Learning", subtitle: "Upcoming & recorded sessions" },
  { icon: "workshops", label: "Workshops", href: "/workshops", group: "Learning", subtitle: "Workshops & webinars" },
  { icon: "certificates", label: "Certificates", href: "/certificates", group: "Learning", subtitle: "Earned certificates" },
  { icon: "learn", label: "Learn", href: "/articles", group: "Learning", subtitle: "Articles & guides" },
  { icon: "reminders", label: "Reminders", href: "/reminders", group: "Wellness & support", subtitle: "Appointments, classes & due dates" },
  { icon: "contributors", label: "Contributors", href: "/contributors", group: "Wellness & support", subtitle: "People who can help fill in data", selfOnly: true },

  // Account & settings (moved here from the Profile tab).
  { icon: "security", label: "Account & Security", href: "/account-security", group: "Account", subtitle: "Password and devices" },
  { icon: "accounts", label: "Accounts", href: "/account-switcher", group: "Account", subtitle: "Switch or add an account" },
  { icon: "security", label: "Support", href: "/support", group: "Account", subtitle: "FAQs, contact us, privacy & terms" },
];

/**
 * The order groups are shown on the Explore-all screen. Academics first (the
 * daily-driver screens), then learning, support, and account last.
 */
export const EXPLORE_GROUP_ORDER: ExploreGroup[] = [
  "Academics",
  "Learning",
  "Wellness & support",
  "Account",
];

/**
 * The exact tiles Home shows, in order, before the "View all" tile — a curated
 * shortlist, NOT just the first N of EXPLORE. Seven of them + "View all" fill
 * two tidy rows (2 × 4). Referenced by label so this list stays readable;
 * `HOME_EXPLORE` resolves them to the full items in this order.
 */
export const HOME_EXPLORE_LABELS = [
  "Plans",
  "Attendance",
  "Exams",
  "Report",
  "Courses",
  "Live classes",
  "Advice",
] as const;

export const HOME_EXPLORE: ExploreItem[] = HOME_EXPLORE_LABELS.map((label) => {
  const item = EXPLORE.find((e) => e.label === label);
  if (!item) throw new Error(`HOME_EXPLORE_LABELS references unknown tile "${label}"`);
  return item;
});
