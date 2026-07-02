/**
 * WiserWits design tokens — lifted from the mobile mock design system
 * (`mocks/students/mobile/styles.css`). navy #1A2658, gold #F0C227, Inter.
 * Styling approach: StyleSheet + tokens (+ expo-linear-gradient for the gold/navy
 * gradients the mocks use on buttons, hero and avatars).
 */

export const palette = {
  primary50: "#eef0f7",
  primary100: "#d4d8ea",
  primary200: "#a9b1d5",
  primary300: "#7e8ac0",
  primary400: "#5363ab",
  primary500: "#2d3f8a",
  primary600: "#1A2658", // brand navy
  primary700: "#151e47",
  primary800: "#101736",
  primary900: "#0a0f24",

  accent50: "#fef9e7",
  accent100: "#fdf0c3",
  accent200: "#fbe38b",
  accent300: "#f6d453",
  accent400: "#F0C227", // brand gold
  accent500: "#d4a91e",
  accent600: "#a9850f",
} as const;

export const colors = {
  navy: palette.primary600,
  navyDark: palette.primary800,
  navyTint: "#b9c0e0",
  gold: palette.accent400,
  goldDark: palette.accent500,

  // neutrals (mock)
  bg: "#f4f6fb",
  surface: "#f4f6fb",
  card: "#ffffff",
  border: "#e8ebf1",
  ink: "#0f172a",
  text: "#0f172a",
  textMuted: "#64748b",
  textInverse: "#ffffff",

  // semantic + soft backgrounds (mock)
  green: "#16a34a",
  greenBg: "#dcfce7",
  amber: "#f59e0b",
  amberBg: "#fef3c7",
  red: "#dc2626",
  redBg: "#fee2e2",
  blue: "#2563eb",
  blueBg: "#dbeafe",

  // aliases used around the app
  success: "#16a34a",
  warning: "#f59e0b",
  danger: "#dc2626",
  info: "#2563eb",
} as const;

/** Gradient stop pairs (use with expo-linear-gradient). */
export const gradients = {
  gold: [palette.accent400, palette.accent500] as const,
  goldSoft: [palette.accent300, palette.accent500] as const,
  navyHero: [palette.primary600, palette.primary800] as const,
  navyLogin: [palette.primary600, palette.primary900] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 9,
  md: 13,
  lg: 18,
  xl: 24,
  sheet: 30,
  pill: 999,
} as const;

/** Soft elevation matching the mock cards/buttons. */
export const shadow = {
  card: {
    shadowColor: "#101736",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gold: {
    shadowColor: palette.accent500,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const typography = {
  display: { fontSize: 27, lineHeight: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  h1: { fontSize: 21, lineHeight: 27, fontWeight: "800" as const, letterSpacing: -0.3 },
  h2: { fontSize: 16, lineHeight: 22, fontWeight: "800" as const },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "400" as const },
  label: { fontSize: 12.5, lineHeight: 17, fontWeight: "600" as const },
  caption: { fontSize: 11.5, lineHeight: 16, fontWeight: "500" as const },
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
