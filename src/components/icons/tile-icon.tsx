import { Image } from "expo-image";

/**
 * Coloured 3D tile icons — used by the launcher surfaces only (Home "Explore"
 * grid, Explore-all, Academics hub, Learning hub, Health hub, Quick actions). Everywhere
 * else the app stays on monochrome Ionicons: 3D art turns to mud below ~20px
 * and would fight the chrome (tab bar, chevrons, row affordances, status chips).
 *
 * Artwork: Microsoft Fluent Emoji (MIT) — see assets/icons3d/LICENSE.txt.
 * The PNGs are the upstream 3D renders downscaled to 128px, which is still >3x
 * for the largest place we draw them (32pt), and keeps the whole set under 400KB.
 *
 * Metro needs *static* require() paths, so every icon is spelled out below —
 * a computed `require(`…/${name}.png`)` silently fails to bundle.
 */
const ICONS = {
  activity: require("../../../assets/icons3d/activity.png"),
  attendance: require("../../../assets/icons3d/attendance.png"),
  exams: require("../../../assets/icons3d/exams.png"),
  assignments: require("../../../assets/icons3d/assignments.png"),
  health: require("../../../assets/icons3d/health.png"),
  advice: require("../../../assets/icons3d/advice.png"),
  report: require("../../../assets/icons3d/report.png"),
  timetable: require("../../../assets/icons3d/timetable.png"),
  calendar: require("../../../assets/icons3d/calendar.png"),
  insights: require("../../../assets/icons3d/insights.png"),
  plans: require("../../../assets/icons3d/plans.png"),
  courses: require("../../../assets/icons3d/courses.png"),
  "live-classes": require("../../../assets/icons3d/live-classes.png"),
  workshops: require("../../../assets/icons3d/workshops.png"),
  certificates: require("../../../assets/icons3d/certificates.png"),
  learn: require("../../../assets/icons3d/learn.png"),
  reminders: require("../../../assets/icons3d/reminders.png"),
  contributors: require("../../../assets/icons3d/contributors.png"),
  security: require("../../../assets/icons3d/security.png"),
  accounts: require("../../../assets/icons3d/accounts.png"),
  notices: require("../../../assets/icons3d/notices.png"),
  holistic: require("../../../assets/icons3d/holistic.png"),
  feedback: require("../../../assets/icons3d/feedback.png"),
  bmi: require("../../../assets/icons3d/bmi.png"),
  "ask-consultant": require("../../../assets/icons3d/ask-consultant.png"),
  consultation: require("../../../assets/icons3d/consultation.png"),
  diet: require("../../../assets/icons3d/diet.png"),
  labs: require("../../../assets/icons3d/labs.png"),
  "view-all": require("../../../assets/icons3d/view-all.png"),
} as const;

export type TileIconName = keyof typeof ICONS;

/**
 * Renders one tile icon. `muted` is the plan-locked state — the art fades back
 * rather than being swapped for a grey glyph, so the tile keeps its shape and
 * the lock badge beside it stays the thing that reads as "locked".
 */
export function TileIcon({
  name,
  size = 28,
  muted = false,
}: {
  name: TileIconName;
  size?: number;
  muted?: boolean;
}) {
  return (
    <Image
      source={ICONS[name]}
      style={{ width: size, height: size, opacity: muted ? 0.35 : 1 }}
      contentFit="contain"
      // These ship in the bundle, so there is nothing to fetch and nothing to
      // fade in — a transition would just make every grid flicker on mount.
      transition={0}
    />
  );
}
