import type { Href } from "expo-router";

import type { FeedCategory } from "@/api/student-types";

/**
 * Where a notification/feed item routes when tapped, keyed by its `category`.
 * Shared by the feed screen and the push-notification tap handler so the two
 * never disagree. 16 categories → the student app's screens (diet/lab/
 * consultation all live under Health).
 */
export const CATEGORY_HREF: Record<FeedCategory, Href> = {
  assignment: "/assignments",
  advice: "/advice",
  feedback: "/advice",
  consultation: "/(tabs)/health/consultations",
  diet: "/(tabs)/health/diet",
  lab: "/(tabs)/health/labs",
  report: "/(tabs)/academics/report",
  marks: "/(tabs)/academics/exams",
  attendance: "/(tabs)/academics/attendance",
  reminder: "/reminders",
  holistic: "/(tabs)/academics/holistic",
  timetable: "/(tabs)/academics/timetable",
  calendar: "/(tabs)/academics/calendar",
  live_class: "/live-classes",
  workshop: "/workshops",
  certificate: "/certificates",
  notice: "/(tabs)/academics/notices",
};

/**
 * Web-dashboard deep links (student_events.link, written by the partner/admin
 * dashboards) → the app screen showing the same thing. Matched on the path's
 * first segment after /student/, so `/student/exams?id=4` still resolves.
 */
const WEB_LINK_HREF: Record<string, Href> = {
  dashboard: "/(tabs)",
  exams: "/(tabs)/academics/exams",
  marks: "/(tabs)/academics/exams",
  attendance: "/(tabs)/academics/attendance",
  holistic: "/(tabs)/academics/holistic",
  report: "/(tabs)/academics/report",
  timetable: "/(tabs)/academics/timetable",
  calendar: "/(tabs)/academics/calendar",
  notices: "/(tabs)/academics/notices",
  health: "/(tabs)/health",
  advice: "/advice",
  feedback: "/feedback",
  assignments: "/assignments",
  "live-classes": "/live-classes",
  workshops: "/workshops",
  certificates: "/certificates",
  courses: "/courses",
  reminders: "/reminders",
  "join-requests": "/join-requests",
  subscription: "/subscription",
  insights: "/insights",
};

/**
 * Where a feed item / notification opens. The event's own `link` wins: a
 * category can be shared by unrelated emitters ("reminder" is used for
 * consultant reminders, a published exam and a school's join request), so
 * routing on category alone sent those to the wrong screen. Falls back to the
 * category for events with no link or a link the app has no screen for.
 */
export function hrefForEvent(category: string | undefined | null, link?: string | null): Href {
  const byCategory = hrefForCategory(category);
  const m = link?.match(/^\/student\/([^/?#]+)/);
  if (!m || !(m[1] in WEB_LINK_HREF)) return byCategory;
  const byLink = WEB_LINK_HREF[m[1]];
  // The web dashboard has one page where the app has several: a "diet" event
  // links to /student/health, but the app has a dedicated Diet screen. Keep the
  // category's route when it's a more specific screen inside the linked area.
  if (typeof byCategory === "string" && typeof byLink === "string" && byCategory.startsWith(`${byLink}/`)) {
    return byCategory;
  }
  return byLink;
}

/** Resolve a (possibly unknown) category string to a route, defaulting to the feed. */
export function hrefForCategory(category: string | undefined | null): Href {
  if (category && category in CATEGORY_HREF) {
    return CATEGORY_HREF[category as FeedCategory];
  }
  return "/feed";
}
