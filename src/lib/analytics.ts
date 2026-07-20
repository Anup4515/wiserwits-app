/**
 * Minimal, provider-agnostic analytics (Phase 4.10).
 *
 * This is intentionally a thin seam, not a full pipeline: it defines the event
 * vocabulary and a single `track()` entry point. In development it logs to the
 * console; in production it is a no-op until a sink is wired in `deliver()`
 * (e.g. POST to a `/api/student/analytics` endpoint, or an Expo-compatible
 * analytics SDK). Centralising it here means screens call `track(...)` today and
 * the destination can change in one place later — without touching call sites.
 *
 * Keep events coarse and privacy-preserving: names + small enums only, never
 * free-text or personal data (that would change the Play Data Safety answers).
 */

export type AnalyticsEvent =
  | "app_open"
  | "login"
  | "feed_opened"
  | "plan_purchased"
  | "course_acquired";

type Props = Record<string, string | number | boolean | null | undefined>;

const isDev = typeof __DEV__ !== "undefined" && __DEV__;

function deliver(event: AnalyticsEvent, props?: Props): void {
  // TODO(analytics): point this at the real sink (backend endpoint or SDK).
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, props ?? {});
  }
}

/** Record a product event. Never throws — analytics must not break a flow. */
export function track(event: AnalyticsEvent, props?: Props): void {
  try {
    deliver(event, props);
  } catch {
    // swallow — analytics is best-effort
  }
}
