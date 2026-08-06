import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";

import { colors, palette } from "@/theme";

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
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href: Href;
  tint: string;
  fg: string;
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
  { icon: "notifications-outline", label: "Activity", href: "/feed", tint: colors.amberBg, fg: colors.amber, group: "Wellness & support", subtitle: "Recent updates & alerts" },
  { icon: "calendar-outline", label: "Attendance", href: "/(tabs)/academics/attendance", tint: colors.greenBg, fg: colors.green, group: "Academics", subtitle: "Daily presence & monthly %" },
  { icon: "reader-outline", label: "Exams", href: "/(tabs)/academics/exams", tint: colors.blueBg, fg: colors.blue, group: "Academics", subtitle: "Marks & upcoming exams" },
  { icon: "clipboard-outline", label: "Assignments", href: "/assignments", tint: palette.accent100, fg: palette.accent600, group: "Academics", subtitle: "Tasks & submissions" },
  { icon: "heart-outline", label: "Health", href: "/(tabs)/health", tint: colors.redBg, fg: colors.red, group: "Wellness & support", subtitle: "BMI, consultations, diet & labs" },
  { icon: "chatbubbles-outline", label: "Advice", href: "/advice", tint: palette.primary50, fg: colors.navy, group: "Wellness & support", subtitle: "Ask Consultant, read feedback" },
  { icon: "document-text-outline", label: "Report", href: "/(tabs)/academics/report", tint: colors.blueBg, fg: colors.blue, group: "Academics", subtitle: "Report card & holistic ratings" },
  { icon: "time-outline", label: "Timetable", href: "/(tabs)/academics/timetable", tint: colors.greenBg, fg: colors.green, group: "Academics", subtitle: "Weekly class schedule" },
  { icon: "today-outline", label: "Calendar", href: "/(tabs)/academics/calendar", tint: colors.amberBg, fg: colors.amber, group: "Academics", subtitle: "Working days, holidays & events" },
  { icon: "stats-chart-outline", label: "Insights", href: "/(tabs)/insights", tint: palette.accent100, fg: palette.accent600, group: "Academics", subtitle: "How things are going, at a glance" },
  { icon: "card-outline", label: "Plans", href: "/subscription", tint: palette.primary50, fg: colors.navy, group: "Account", subtitle: "View & change the plan" },
  { icon: "school-outline", label: "Courses", href: "/courses", tint: palette.accent100, fg: palette.accent600, group: "Learning", subtitle: "Browse, enrol & keep learning" },
  { icon: "videocam-outline", label: "Live classes", href: "/live-classes", tint: colors.redBg, fg: colors.red, group: "Learning", subtitle: "Upcoming & recorded sessions" },
  { icon: "easel-outline", label: "Workshops", href: "/workshops", tint: colors.blueBg, fg: colors.blue, group: "Learning", subtitle: "Workshops & webinars" },
  { icon: "ribbon-outline", label: "Certificates", href: "/certificates", tint: colors.amberBg, fg: colors.amber, group: "Learning", subtitle: "Earned certificates" },
  { icon: "book-outline", label: "Learn", href: "/articles", tint: palette.primary50, fg: colors.navy, group: "Learning", subtitle: "Articles & guides" },
  { icon: "alarm-outline", label: "Reminders", href: "/reminders", tint: colors.greenBg, fg: colors.green, group: "Wellness & support", subtitle: "Appointments & tests" },
  { icon: "people-circle-outline", label: "Contributors", href: "/contributors", tint: colors.amberBg, fg: colors.amber, group: "Wellness & support", subtitle: "People who can help fill in data", selfOnly: true },

  // Account & settings (moved here from the Profile tab).
  { icon: "lock-closed-outline", label: "Account & Security", href: "/account-security", tint: palette.primary50, fg: colors.navy, group: "Account", subtitle: "Password and devices" },
  { icon: "people-outline", label: "Accounts", href: "/account-switcher", tint: colors.blueBg, fg: colors.blue, group: "Account", subtitle: "Switch or add an account" },
  { icon: "help-circle-outline", label: "Help & Legal", href: "/help", tint: colors.greenBg, fg: colors.green, group: "Account", subtitle: "Support, privacy and terms" },
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
