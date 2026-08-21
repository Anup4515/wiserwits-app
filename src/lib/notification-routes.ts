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
};

/** Resolve a (possibly unknown) category string to a route, defaulting to the feed. */
export function hrefForCategory(category: string | undefined | null): Href {
  if (category && category in CATEGORY_HREF) {
    return CATEGORY_HREF[category as FeedCategory];
  }
  return "/feed";
}
