import { palette, colors, gradients, spacing, radius, shadow, fonts, typography } from "./tokens";

export { palette, colors, gradients, spacing, radius, shadow, fonts, typography } from "./tokens";
export type { Colors, Spacing } from "./tokens";

/** Single theme object for convenient consumption (`theme.colors.navy`, …). */
export const theme = { palette, colors, gradients, spacing, radius, shadow, fonts, typography } as const;
export type Theme = typeof theme;
