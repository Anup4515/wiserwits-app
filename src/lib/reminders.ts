import type { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";

import { colors, palette } from "@/theme";
import type { ReminderType } from "@/api/student-types";

/**
 * Per-type presentation for unified-agenda reminders, shared by the Reminders
 * screen (list rows) and the Home reminder cards so the two never drift.
 *
 * `href` is null for consultant reminders — they have no screen of their own;
 * their note + attachment are shown inline on /reminders.
 */
export const REMINDER_TYPE_META: Record<
  ReminderType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    href: Href | null;
    label: string;
    tint: string;
    fg: string;
  }
> = {
  appointment: { icon: "calendar-outline", href: null, label: "Consultant reminder", tint: palette.primary50, fg: colors.navy },
  consultation: { icon: "medkit-outline", href: "/(tabs)/health/consultations", label: "Consultation", tint: colors.greenBg, fg: colors.green },
  live_class: { icon: "videocam-outline", href: "/live-classes", label: "Live class", tint: colors.blueBg, fg: colors.blue },
  workshop: { icon: "easel-outline", href: "/workshops", label: "Workshop", tint: palette.accent100, fg: palette.accent600 },
  assignment: { icon: "clipboard-outline", href: "/assignments", label: "Assignment", tint: colors.amberBg, fg: colors.amber },
};

const IST = "Asia/Kolkata";

/** True when `when` carries a time of day (date-only sources are YYYY-MM-DD). */
function hasTime(when: string): boolean {
  return when.includes("T");
}

/** "3:30 PM" in IST. */
function istTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: IST });
}

/** "Thu, 2 Jul" in IST. */
function istDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: IST });
}

/** A Date's IST calendar day as a UTC-midnight timestamp, for day arithmetic. */
function istDay(d: Date): number {
  const [y, m, day] = d.toLocaleDateString("en-CA", { timeZone: IST }).split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

/** "Thu, 2 Jul · 3:30 PM" (IST) for a datetime, or "Thu, 2 Jul" for a date. */
export function formatReminderWhen(when: string): string {
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return when;
  return hasTime(when) ? `${istDate(d)} · ${istTime(d)}` : istDate(d);
}

/**
 * Compact, relative form for cards: "Today · 5:00 PM", "Tomorrow",
 * "Thu, 18 Sep · 10:00 AM". Days are compared in IST so an item just after
 * midnight IST doesn't read as yesterday.
 */
export function relativeReminderWhen(when: string, now: Date = new Date()): string {
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return when;
  const diff = Math.round((istDay(d) - istDay(now)) / 86400000);
  const day = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : istDate(d);
  return hasTime(when) ? `${day} · ${istTime(d)}` : day;
}
