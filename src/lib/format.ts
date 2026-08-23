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

/**
 * Parse a date value into [year, month (1-based), day]. Handles both shapes the
 * API emits: the plain "YYYY-MM-DD" from the self endpoints, and the full ISO
 * datetime the enrolled endpoints return for DATE columns (e.g.
 * "2026-04-04T18:30:00.000Z", which is local midnight serialised as UTC). The
 * datetime form is read in LOCAL time so the calendar day matches what the
 * school entered — splitting the raw string would drop a day. Null if unparseable.
 */
function toYMD(iso: string | null | undefined): [number, number, number] | null {
  if (!iso) return null;
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (plain) return [Number(plain[1]), Number(plain[2]), Number(plain[3])];
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  // Fallback: pull the leading calendar date out of a timestamp that the engine
  // couldn't parse — notably Postgres "2026-08-05 18:30:00+00" (space, not "T"),
  // which React Native's Hermes rejects, leaving `new Date` invalid.
  const lead = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return lead ? [Number(lead[1]), Number(lead[2]), Number(lead[3])] : null;
}

/** "2026-07-02" → "2 Jul". */
export function shortDate(iso: string): string {
  const ymd = toYMD(iso);
  return ymd ? `${ymd[2]} ${MONTHS[ymd[1] - 1]}` : iso;
}

/**
 * Date range for an exam spanning start→end, as "5 Apr - 7 Apr" (month shown on
 * both ends). Collapses to a single date ("5 Apr") when both ends match or the
 * end is missing. Returns "" when neither date is present.
 */
export function dateRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = toYMD(start);
  const e = toYMD(end);
  if (!s) return e ? `${e[2]} ${MONTHS[e[1] - 1]}` : "";
  const startStr = `${s[2]} ${MONTHS[s[1] - 1]}`;
  if (!e || (s[0] === e[0] && s[1] === e[1] && s[2] === e[2])) return startStr;
  return `${startStr} - ${e[2]} ${MONTHS[e[1] - 1]}`;
}

/** "2026-07-02" → "Thu, 2 Jul 2026". Weekday derived without timezone drift. */
export function longDate(iso: string): string {
  const ymd = toYMD(iso);
  if (!ymd) return iso;
  const [y, m, d] = ymd;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  ];
  return `${wd}, ${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-07-02" → "2 Jul 2026" (date only, no weekday). */
export function mediumDate(iso: string | null | undefined): string {
  const ymd = toYMD(iso);
  return ymd ? `${ymd[2]} ${MONTHS[ymd[1] - 1]} ${ymd[0]}` : (iso ?? "");
}

/**
 * Date + local time for scheduled events (live classes) →
 * "2 Jul 2026 · 3:30 PM". Reads the timestamp in LOCAL time, consistent with
 * toYMD. Intended for full datetime values, not date-only strings.
 */
export function dateTime(iso: string | null | undefined): string {
  const ymd = toYMD(iso);
  if (!ymd || !iso) return iso ?? "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `${ymd[2]} ${MONTHS[ymd[1] - 1]} ${ymd[0]}`;
  let h = d.getHours();
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${ymd[2]} ${MONTHS[ymd[1] - 1]} ${ymd[0]} · ${h}:${String(d.getMinutes()).padStart(2, "0")} ${suffix}`;
}

/** True if `iso` (a date or datetime) is a calendar day BEFORE today (local). */
export function isPastDate(iso: string | null | undefined): boolean {
  const ymd = toYMD(iso);
  if (!ymd) return false;
  const now = new Date();
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  if (ymd[0] !== today[0]) return ymd[0] < today[0];
  if (ymd[1] !== today[1]) return ymd[1] < today[1];
  return ymd[2] < today[2];
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

/**
 * Format a number for display: round to at most `maxDp` decimals (default 2)
 * and strip trailing zeros. Kills floating-point sum artifacts like
 * "486.4199999999996" → "486.42" (also 486.5 → "486.5", 486 → "486").
 * Accepts number|string; returns "—" for null/empty/non-finite so callers can
 * drop their own `?? "—"`.
 */
export function num(v: number | string | null | undefined, maxDp = 2): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!Number.isFinite(n)) return "—";
  const f = 10 ** maxDp;
  return String(Math.round(n * f) / f);
}

/** A tone colour for a 0–100 performance/attendance value. */
export function scoreColor(value: number | null | undefined): string {
  if (value == null) return colors.textMuted;
  if (value >= 75) return colors.green;
  if (value >= 50) return colors.amber;
  return colors.red;
}

/** A tone colour for a letter grade. */
/**
 * Whether a value is a real, school-provided grade — not a blank or placeholder.
 * Schools that don't use the grade system leave grades empty; some backends send
 * a placeholder ("-", "N/A") rather than null. Both must read as "no grade" so
 * the UI falls back to showing the percentage. This is the single gate the marks
 * surfaces use to decide whether to render a grade chip at all.
 */
export function isGraded(grade: string | null | undefined): boolean {
  if (grade == null) return false;
  const g = grade.trim().toLowerCase();
  return g !== "" && g !== "-" && g !== "—" && g !== "n/a" && g !== "na" && g !== "none";
}

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
