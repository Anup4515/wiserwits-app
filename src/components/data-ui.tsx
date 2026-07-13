import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui";
import { colors, palette, spacing, radius, typography, shadow } from "@/theme";

/**
 * Shared data-screen primitives (plan §2 Phase 2, §11 cross-cutting): glance
 * tiles, provenance/source badges, plan lock/upsell, and the loading/error/empty
 * states every query screen needs.
 */

// ── StatTile — a glanceable metric tile (mock 2) ─────────────────────────────
export function StatTile({
  label,
  value,
  icon,
  tint,
  fg,
  loading,
}: {
  label: string;
  value?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  fg: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIc, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={16} color={fg} />
      </View>
      <Text style={styles.statLab}>{label}</Text>
      {loading ? (
        <View style={styles.statSkeleton} />
      ) : (
        <Text style={styles.statVal}>{value ?? "—"}</Text>
      )}
    </View>
  );
}

// ── ProvenanceBadge — "Filled by <name>" attribution (plan §9) ───────────────
export function ProvenanceBadge({ name }: { name: string | null | undefined }) {
  if (!name) return null;
  return (
    <View style={styles.prov}>
      <Ionicons name="create-outline" size={11} color={colors.textMuted} />
      <Text style={styles.provText}>Filled by {name}</Text>
    </View>
  );
}

// ── SourceBadge — the enrolled-vs-self origin label (plan §8/§9) ─────────────
export function SourceBadge({
  source,
  schoolLabel,
}: {
  source: "enrolled" | "self";
  schoolLabel?: string | null;
}) {
  const enrolled = source === "enrolled";
  return (
    <View style={[styles.source, enrolled ? styles.sourceNavy : styles.sourceBlue]}>
      <Ionicons
        name={enrolled ? "school-outline" : "person-outline"}
        size={12}
        color={enrolled ? colors.navy : colors.blue}
      />
      <Text style={[styles.sourceText, { color: enrolled ? colors.navy : colors.blue }]}>
        {enrolled ? (schoolLabel || "School records") : "Self-tracked"}
      </Text>
    </View>
  );
}

// ── LockGate — plan upsell shown instead of gated content (plan §11) ─────────
export function LockGate({ feature }: { feature: string }) {
  const router = useRouter();
  const pretty = feature.replace(/^student\./, "").replace(/-/g, " ");
  return (
    <View style={styles.center}>
      <View style={styles.lockIc}>
        <Ionicons name="lock-closed" size={30} color={colors.gold} />
      </View>
      <Text style={styles.lockTitle}>Unlock {pretty}</Text>
      <Text style={styles.lockBody}>
        {pretty[0].toUpperCase() + pretty.slice(1)} is part of a plan that isn't
        active yet. Upgrade to see it here.
      </Text>
      <View style={{ height: spacing.md }} />
      <Button label="View plans" onPress={() => router.push("/subscription")} />
    </View>
  );
}

// ── Query states ─────────────────────────────────────────────────────────────
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.navy} />
      <Text style={styles.stateSub}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.errIc}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <Text style={styles.stateTitle}>Couldn't load this</Text>
      <Text style={styles.stateSub}>{message || "Something went wrong. Please try again."}</Text>
      {onRetry ? (
        <>
          <View style={{ height: spacing.md }} />
          <Button label="Try again" variant="secondary" onPress={onRetry} />
        </>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIc}>
        <Ionicons name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stateSub}>{subtitle}</Text> : null}
    </View>
  );
}

// ── SectionHeader — a titled section divider with optional right action ──────
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── MonthStepper — ‹ Month YYYY › navigation for month-scoped screens ────────
export function MonthStepper({
  label,
  onPrev,
  onNext,
  nextDisabled,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onPrev} hitSlop={8} style={styles.stepBtn}>
        <Ionicons name="chevron-back" size={18} color={colors.navy} />
      </Pressable>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable
        onPress={onNext}
        hitSlop={8}
        disabled={nextDisabled}
        style={[styles.stepBtn, nextDisabled && { opacity: 0.3 }]}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.navy} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.card,
  },
  statIc: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statLab: { fontSize: 11.5, color: colors.textMuted, fontWeight: "600" },
  statVal: { fontSize: 25, fontWeight: "800", color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  statSkeleton: { height: 20, width: "55%", borderRadius: 6, backgroundColor: "#eef1f6", marginTop: 6 },

  prov: { flexDirection: "row", alignItems: "center", gap: 4 },
  provText: { ...typography.caption, color: colors.textMuted },

  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  sourceNavy: { backgroundColor: palette.primary50 },
  sourceBlue: { backgroundColor: colors.blueBg },
  sourceText: { fontSize: 11.5, fontWeight: "700" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    minHeight: 240,
  },
  lockIc: {
    width: 68,
    height: 68,
    borderRadius: radius.xl,
    backgroundColor: palette.accent100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  lockTitle: { ...typography.h1, color: colors.ink, textTransform: "capitalize" },
  lockBody: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 300 },

  errIc: {
    width: 64, height: 64, borderRadius: radius.xl, backgroundColor: colors.redBg,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.xs,
  },
  emptyIc: {
    width: 60, height: 60, borderRadius: radius.xl, backgroundColor: palette.primary50,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.xs,
  },
  stateTitle: { ...typography.h2, color: colors.ink },
  stateSub: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 300 },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h2, color: colors.ink },
  sectionAction: { ...typography.label, color: colors.navy },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  stepBtn: {
    width: 34, height: 34, borderRadius: radius.sm,
    backgroundColor: palette.primary50, alignItems: "center", justifyContent: "center",
  },
  stepLabel: { ...typography.h2, fontSize: 15, color: colors.ink },
});
