import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/auth/AuthContext";
import type { Source } from "@/api/student-types";

/**
 * Source-of-truth for the active enrollment (plan §9 / Q5).
 *
 * Two orthogonal axes decide where an academic screen reads from:
 *   1. SOURCE — a student with `enrollment_id != null` is "enrolled" and reads
 *      the `erp_*`-backed routes; otherwise they're independent and read the
 *      `/self/*` routes. This is derived from the active account, not stored.
 *   2. ENROLLMENT OVERRIDE — an enrolled student can hold more than one
 *      enrollment (concurrent sections, or past classes/schools after a
 *      transfer). The class switcher picks which one to view; the chosen id is
 *      threaded as `?enrollment_id=` onto every enrolled query and folded into
 *      the query cache key. `null` means "the server's current active
 *      enrollment" (the default, so single-enrollment students need no switch).
 *
 * The override resets whenever the active account changes (§5a) — one sibling's
 * past enrollment must never leak into another's view.
 */
interface EnrollmentValue {
  source: Source;
  /** null → use the server's active enrollment; a number → history override. */
  enrollmentId: number | null;
  setEnrollmentId: (id: number | null) => void;
}

const EnrollmentContext = createContext<EnrollmentValue | null>(null);

export function EnrollmentProvider({ children }: { children: ReactNode }) {
  const { user, activeStudentId } = useAuth();
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);

  // Reset any history override when the active account switches.
  useEffect(() => {
    setEnrollmentId(null);
  }, [activeStudentId]);

  const source: Source = user?.enrollment_id != null ? "enrolled" : "self";

  const value = useMemo<EnrollmentValue>(
    () => ({ source, enrollmentId, setEnrollmentId }),
    [source, enrollmentId]
  );

  return <EnrollmentContext.Provider value={value}>{children}</EnrollmentContext.Provider>;
}

export function useEnrollment(): EnrollmentValue {
  const ctx = useContext(EnrollmentContext);
  if (!ctx) throw new Error("useEnrollment must be used within <EnrollmentProvider>");
  return ctx;
}
