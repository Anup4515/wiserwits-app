/**
 * Dual-audience copy module (plan §9a).
 *
 * RULE: neutral by default. Every string ships as a single neutral string that
 * reads naturally for BOTH the student and a parent/guardian — chiefly via
 * name-first phrasing ("Aarav's report card") instead of possessives. The app
 * ships 100% neutral; `viewerRole` is an OPTIONAL, deferrable enhancement and is
 * never required for correct copy.
 *
 * `viewerRole` is device-local, never sent to the backend, and has zero effect on
 * data access or plan-gating. When unset, neutral always wins.
 *
 * This module is also the seam for future localization (e.g. Hindi).
 */

export type ViewerRole = "student" | "guardian";

export interface CopyParams {
  /** Student's first name — enables name-first neutral phrasing. */
  name?: string;
  [key: string]: string | number | undefined;
}

type Resolver = string | ((p: CopyParams) => string);

/** An entry is neutral-only, or neutral + optional per-role overrides. */
type CopyEntry =
  | Resolver
  | { neutral: Resolver; student?: Resolver; guardian?: Resolver };

function run(r: Resolver, p: CopyParams): string {
  return typeof r === "function" ? r(p) : r;
}

/**
 * Starter dictionary. Add ids as screens are built; keep every entry NEUTRAL
 * unless a relational string genuinely needs a variant (greetings, nudges).
 * No user-facing string literals belong in components — route them through here.
 */
export const copy = {
  // generic actions / states (inherently neutral)
  "action.add": "Add",
  "action.save": "Save",
  "action.retry": "Try again",
  "state.loading": "Loading…",
  "state.offline": "You're offline — showing the latest saved data.",
  "error.network": "Network error. Please try again.",
  "error.generic": "Something went wrong. Please try again.",

  // name-first neutral copy (works for student & parent)
  "home.greeting": ({ name }: CopyParams) => (name ? `Hi, ${name} 👋` : "Hi 👋"),
  "report.title": ({ name }: CopyParams) =>
    name ? `${name}'s report card` : "Report card",
  "attendance.title": ({ name }: CopyParams) =>
    name ? `${name}'s attendance` : "Attendance",
  "advice.cta": ({ name }: CopyParams) =>
    name ? `Ask Consultant about ${name}` : "Ask Consultant",

  // example of an OPTIONAL role variant (neutral still ships by default)
  "insight.attendanceDip": {
    neutral: ({ name }: CopyParams) =>
      name
        ? `${name}'s attendance dipped this week`
        : "Attendance dipped this week",
    student: "Your attendance dipped this week",
  },
} satisfies Record<string, CopyEntry>;

export type CopyId = keyof typeof copy;

/**
 * Resolve a copy id. Neutral by default; only uses a role override when BOTH a
 * `role` is provided AND that entry defines a variant for it.
 */
export function t(id: CopyId, params: CopyParams = {}, role?: ViewerRole): string {
  const entry = copy[id] as CopyEntry;
  if (typeof entry === "string" || typeof entry === "function") {
    return run(entry, params);
  }
  const variant = (role && entry[role]) || entry.neutral;
  return run(variant, params);
}

/**
 * Hook form. The active-account `viewerRole` is wired in Phase 1 (onboarding /
 * account context); until then this resolves neutral. Pass `role` explicitly to
 * preview a variant.
 */
export function useCopy(role?: ViewerRole) {
  return (id: CopyId, params: CopyParams = {}) => t(id, params, role);
}
