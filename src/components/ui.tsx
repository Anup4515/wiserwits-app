import { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  View,
  ActivityIndicator,
  StyleSheet,
  type TextInputProps,
  type ViewProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { palette, colors, gradients, spacing, radius, shadow, typography } from "@/theme";

/** Gold-gradient primary / white secondary / ghost button (mock `.btn-primary`). */
export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const isDisabled = disabled || loading;
  const content = loading ? (
    <ActivityIndicator color={variant === "primary" ? palette.primary700 : colors.navy} />
  ) : (
    <Text
      style={[
        styles.btnLabel,
        variant === "primary" && { color: palette.primary700 },
        variant === "secondary" && { color: colors.navy },
        variant === "ghost" && styles.btnGhostLabel,
      ]}
    >
      {label}
    </Text>
  );

  if (variant === "primary") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          shadow.gold,
          isDisabled && styles.dim,
          pressed && !isDisabled && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btn}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        variant === "secondary" && styles.btnSecondary,
        variant === "ghost" && styles.btnGhost,
        isDisabled && styles.dim,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

/** Labeled field with optional left icon (mock `.field`). Password fields
 * (`secureTextEntry`) get a show/hide eye toggle on the right. */
export function Field({
  label,
  error,
  icon,
  secureTextEntry,
  ...props
}: {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
} & TextInputProps) {
  const isSecure = !!secureTextEntry;
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.field, error ? styles.fieldError : null]}>
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        ) : null}
        <TextInput
          placeholderTextColor="#94a3b8"
          style={styles.input}
          secureTextEntry={isSecure && hidden}
          {...props}
        />
        {isSecure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={19}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

/** Gold-gradient rounded-square logo (mock `.logo-dot` / `.brand-lg .d`). */
export function Brand({ size = 46, withName = true }: { size?: number; withName?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.logo, { width: size, height: size, borderRadius: size * 0.3 }]}
      >
        <Text style={[styles.logoText, { fontSize: size * 0.5 }]}>W</Text>
      </LinearGradient>
      {withName ? <Text style={styles.brandName}>WiserWits</Text> : null}
    </View>
  );
}

/** Gold-gradient circular avatar with an initial (mock `.kid .av` / `.avatar-lg`). */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <LinearGradient
      colors={gradients.goldSoft}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>
        {name?.charAt(0).toUpperCase() || "?"}
      </Text>
    </LinearGradient>
  );
}

export type PillTone = "green" | "amber" | "red" | "blue" | "navy" | "gold";

/**
 * Soft background + readable foreground per tone. Exported because the same
 * pairing is used for icon tiles and accent blocks elsewhere — one table keeps
 * a "green" pill and a "green" icon the same green.
 */
export const pillTones: Record<PillTone, { bg: string; fg: string }> = {
  green: { bg: colors.greenBg, fg: "#15803d" },
  amber: { bg: colors.amberBg, fg: "#b45309" },
  red: { bg: colors.redBg, fg: "#b91c1c" },
  blue: { bg: colors.blueBg, fg: "#1d4ed8" },
  navy: { bg: palette.primary50, fg: colors.navy },
  gold: { bg: palette.accent100, fg: palette.accent600 },
};

export function Pill({ label, tone = "navy" }: { label: string; tone?: PillTone }) {
  const t = pillTones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnGhost: { backgroundColor: "transparent", height: 44 },
  btnLabel: { fontSize: 14.5, fontWeight: "800" },
  btnGhostLabel: { color: colors.textMuted, fontSize: 12.5, fontWeight: "700" },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.9 },

  fieldWrap: { marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 50,
  },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.ink, fontSize: 14.5, fontWeight: "600" },
  eye: { paddingLeft: spacing.sm },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.redBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { ...typography.label, color: "#b91c1c", flex: 1 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },

  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logo: { alignItems: "center", justifyContent: "center" },
  logoText: { color: palette.primary700, fontWeight: "800" },
  brandName: { color: colors.textInverse, fontSize: 22, fontWeight: "800" },

  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: palette.primary700, fontWeight: "800" },

  pill: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" },
  pillText: { fontSize: 11, fontWeight: "700" },
});
