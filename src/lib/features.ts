/**
 * Plan-gating mirror (plan §9 / §11). Mirrors the backend's
 * `feature-routes.ts` keys and `subscription.ts` ALWAYS_ALLOWED set so the app
 * can render a lock/upsell state from the `features[]` claim WITHOUT calling an
 * endpoint it knows is locked.
 *
 * Source of truth stays server-side — the same `features[]` claim is checked
 * inside each route, so a bearer carrying these claims is gated identically. If
 * the backend ever returns `403 { error: "plan_required" }` the client already
 * degrades to the same upsell.
 *
 * Note: the independent `/api/student/self/*` endpoints are NOT plan-gated on
 * the backend, so we only gate ENROLLED sources — see `isFeatureLocked`.
 */

import type { SessionUser } from "@/api/types";

/** Feature keys granted unconditionally to any logged-in student. */
export const ALWAYS_ALLOWED = new Set<string>([
  "student.dashboard",
  "student.profile",
  "student.subscription",
  "student.articles",
  "student.bmi",
  "student.courses",
]);

/** The plan-gated feature keys the mobile app references (Phase 2 + beyond). */
export const FEATURE = {
  attendance: "student.attendance",
  exams: "student.exams",
  marks: "student.marks",
  report: "student.report",
  holistic: "student.holistic",
  timetable: "student.timetable",
  calendar: "student.calendar",
  assignments: "student.assignments",
  liveClasses: "student.live-classes",
  workshops: "student.workshops",
  certificates: "student.certificates",
  advice: "student.advice",
  feedback: "student.feedback",
  health: "student.health",
  reminders: "student.reminders",
} as const;

export type FeatureKey = (typeof FEATURE)[keyof typeof FEATURE];

/** Does the user's active plan grant this feature? Always-allowed short-circuits. */
export function hasFeature(user: SessionUser | null, key: string): boolean {
  if (ALWAYS_ALLOWED.has(key)) return true;
  return !!user?.features?.includes(key);
}

/**
 * Whether a screen should render its LockGate instead of fetching. Only enrolled
 * sources are gated — self-tracked students hit ungated `/self/*` routes, so an
 * independent student is never locked out of their own data.
 */
export function isFeatureLocked(user: SessionUser | null, key: string): boolean {
  const enrolled = user?.enrollment_id != null;
  if (!enrolled) return false;
  return !hasFeature(user, key);
}
