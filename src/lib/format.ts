/**
 * Small display formatters shared across the read screens. Pure functions, no
 * user-facing prose (that lives in `copy.ts`) — just number/date shaping.
 */
import { colors } from "@/theme";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-07" → "Jul". */
export function shortMonth(ym: string): string {
  const m = Number(ym?.split("-")[1]);
  return Number.isInteger(m) && m >= 1 && m <= 12 ? MONTHS[m - 1] : ym;
}

/** "2026-07" → "July 2026". */
export function longMonth(ym: string): string {
  const [y, m] = (ym ?? "").split("-").map(Number);
  return Number.isInteger(m) && m >= 1 && m <= 12 ? `${MONTHS_LONG[m - 1]} ${y}` : ym;
}

/** "2026-07-02" → "2 Jul". */
export function shortDate(iso: string): string {
  const [y, m, d] = (iso ?? "").split("-").map(Number);
  if (!Number.isInteger(d) || !Number.isInteger(m)) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

/** "2026-07-02" → "Thu, 2 Jul 2026". Weekday derived without timezone drift. */
export function longDate(iso: string): string {
  const [y, m, d] = (iso ?? "").split("-").map(Number);
  if (!Number.isInteger(d)) return iso;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  ];
  return `${wd}, ${d} ${MONTHS[m - 1]} ${y}`;
}

/** The current month as "YYYY-MM" (local time). */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Shift a "YYYY-MM" by n months (n may be negative). */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "14:30:00" or "14:30" → "2:30 PM". */
export function time12(hms: string | null | undefined): string {
  if (!hms) return "";
  const [hStr, mStr] = hms.split(":");
  let h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr ?? "00"} ${suffix}`;
}

/** Numeric or string percent → whole-number "87%". Handles the string-numeric columns. */
export function pct(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? `${Math.round(n)}%` : "—";
}

/** A tone colour for a 0–100 performance/attendance value. */
export function scoreColor(value: number | null | undefined): string {
  if (value == null) return colors.textMuted;
  if (value >= 75) return colors.green;
  if (value >= 50) return colors.amber;
  return colors.red;
}

/** A tone colour for a letter grade. */
export function gradeColor(grade: string | null | undefined): string {
  if (!grade) return colors.textMuted;
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return colors.green;
  if (g.startsWith("B")) return colors.blue;
  if (g.startsWith("C")) return colors.amber;
  return colors.red;
}

/** Attendance status → tone colour. */
export function statusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "present": return colors.green;
    case "late": return colors.amber;
    case "half_day": return colors.amber;
    case "absent": return colors.red;
    default: return colors.textMuted;
  }
}

/** Attendance status → readable label. */
export function statusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case "present": return "Present";
    case "absent": return "Absent";
    case "late": return "Late";
    case "half_day": return "Half day";
    default: return status ?? "—";
  }
}
