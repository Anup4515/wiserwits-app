import { useEffect, useState } from "react";

import { useAuth } from "@/auth/AuthContext";
import { useEnrollment } from "@/features/enrollment/EnrollmentContext";
import { useEnrollments } from "@/api/hooks";
import { currentMonth, addMonths } from "@/lib/format";
import type { EnrollmentRow } from "@/api/student-types";

/**
 * The enrollment row currently being viewed: the switcher's override if set,
 * else the account's active enrollment, else the current one, else the first.
 * Returns null for self-tracked students or before the list has loaded.
 */
export function useSelectedEnrollment(): EnrollmentRow | null {
  const { user } = useAuth();
  const { enrollmentId } = useEnrollment();
  const { data } = useEnrollments();
  const rows = data ?? [];
  if (rows.length === 0) return null;
  const targetId = enrollmentId ?? user?.enrollment_id ?? null;
  return (
    rows.find((r) => r.enrollment_id === targetId) ??
    rows.find((r) => r.is_current) ??
    rows[0]
  );
}

/** [min, max] "YYYY-MM" bounds of the selected class's academic session, or
 *  null when there's no enrollment context (self students, or list not loaded). */
export function useSessionMonthBounds(): { min: string; max: string } | null {
  const enr = useSelectedEnrollment();
  const min = enr?.session_start_date?.slice(0, 7);
  const max = enr?.session_end_date?.slice(0, 7);
  if (!min || !max) return null;
  return { min, max };
}

/**
 * Month-stepper state clamped to the selected class's academic session, so the
 * ‹ › controls never wander into months from another session (which would just
 * show "no data"). `capToday` additionally blocks stepping past the current
 * month — attendance can't have future records; the calendar can (known
 * holidays), so it caps at the session end instead.
 *
 * When there's no session context (self students), it degrades to the previous
 * behaviour: unbounded backward, and forward only capped at today if `capToday`.
 */
export function useBoundedMonth(opts?: { capToday?: boolean }): {
  month: string;
  setPrev: () => void;
  setNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
} {
  const bounds = useSessionMonthBounds();
  const [month, setMonth] = useState(currentMonth());

  const today = currentMonth();
  const min = bounds?.min ?? null;
  const max = bounds
    ? opts?.capToday && bounds.max > today
      ? today
      : bounds.max
    : opts?.capToday
      ? today
      : null;

  // Re-clamp whenever the range changes — after the list loads, or after the
  // student switches class — so we always land inside the session's own months.
  useEffect(() => {
    setMonth((m) => {
      let x = m;
      if (max && x > max) x = max;
      if (min && x < min) x = min;
      return x;
    });
  }, [min, max]);

  return {
    month,
    setPrev: () => setMonth((m) => (min && m <= min ? m : addMonths(m, -1))),
    setNext: () => setMonth((m) => (max && m >= max ? m : addMonths(m, 1))),
    prevDisabled: min != null && month <= min,
    nextDisabled: max != null && month >= max,
  };
}
