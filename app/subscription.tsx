import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { useSubscription } from "@/api/hooks";
import { useAuth } from "@/auth/AuthContext";
import { api } from "@/api/client";
import { QueryView } from "@/components/QueryView";
import { Card, Button, Pill } from "@/components/ui";
import { SectionHeader } from "@/components/data-ui";
import { track } from "@/lib/analytics";
import { mediumDate } from "@/lib/format";
import { colors, palette, spacing, radius, typography } from "@/theme";
import {
  isRazorpayAvailable,
  isRazorpayCancel,
  openRazorpayCheckout,
  RazorpayUnavailableError,
} from "@/lib/razorpay";
import type {
  SubscriptionData,
  PlanRow,
  SubscriptionRow,
  OrderResponse,
  VerifyResponse,
} from "@/api/student-types";

/**
 * Plans & Subscription (Phase 4.6). Read side is `GET /subscription`
 * (current + scheduled subscription + plan catalog); the purchase side runs
 * the order → Razorpay native checkout → verify round-trip, then force-refreshes
 * the session so newly-granted plan features unlock immediately.
 *
 * Razorpay is a native module (no Expo Go): `isRazorpayAvailable()` gates the
 * buy buttons and shows a "use the installed app" notice instead of crashing.
 */
export default function SubscriptionScreen() {
  const result = useSubscription();
  const { query } = result;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <QueryView result={result} loadingLabel="Loading plans…">
        {(data) => <SubscriptionBody data={data} />}
      </QueryView>
    </ScrollView>
  );
}

function SubscriptionBody({ data }: { data: SubscriptionData }) {
  const qc = useQueryClient();
  const { refreshSession } = useAuth();
  const [busyPlanId, setBusyPlanId] = useState<number | null>(null);

  const current = data.currentSubscription;
  const scheduled = data.scheduledSubscription;
  const plansById = new Map(data.plans.map((p) => [p.id, p]));
  const currentPrice = current ? Number(plansById.get(current.plan_id)?.price_inr ?? 0) : null;
  const partnerPaid = current != null && current.payer_type !== "student";

  // For each plan, the next-cheaper plan below it. Used to show "Everything in
  // {cheaper plan}, plus:" and to highlight only the features this tier ADDS —
  // i.e. what the higher price actually buys.
  const byPriceAsc = [...data.plans].sort((a, b) => Number(a.price_inr) - Number(b.price_inr));
  const prevPlanOf = new Map<number, PlanRow | null>();
  byPriceAsc.forEach((p, i) => prevPlanOf.set(p.id, i > 0 ? byPriceAsc[i - 1] : null));

  async function purchase(plan: PlanRow) {
    if (!isRazorpayAvailable()) {
      Alert.alert(
        "Not available here",
        "Checkout opens in a secure payment screen that only works in the installed WiserWits app, not in Expo Go.",
      );
      return;
    }
    setBusyPlanId(plan.id);
    try {
      const orderRes = await api.post<OrderResponse>(
        "/api/student/subscription/order",
        { plan_id: plan.id },
      );
      if (orderRes.error || !orderRes.data) {
        throw new Error(orderRes.error ?? "Could not start the payment.");
      }
      const order = orderRes.data;

      const payment = await openRazorpayCheckout({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "WiserWits",
        description: order.plan_name,
        prefill: order.prefill,
        theme: { color: colors.navy },
      });

      const verifyRes = await api.post<VerifyResponse>(
        "/api/student/subscription/verify",
        {
          plan_id: order.plan_id,
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        },
      );
      if (verifyRes.error || !verifyRes.data) {
        throw new Error(
          verifyRes.error ??
            "We couldn't confirm your payment. If you were charged, contact support.",
        );
      }

      track("plan_purchased", { plan_id: order.plan_id, action: verifyRes.data.action });
      // Unlock newly-granted features and refresh the plan-gated screens.
      await refreshSession();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["subscription"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["feed"] }),
      ]);

      Alert.alert("You're all set", successMessage(verifyRes.data));
    } catch (err) {
      if (err instanceof RazorpayUnavailableError) {
        Alert.alert("Not available here", err.message);
      } else if (isRazorpayCancel(err)) {
        // User dismissed the checkout — nothing to do.
      } else {
        Alert.alert(
          "Payment problem",
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setBusyPlanId(null);
    }
  }

  return (
    <>
      {/* Current subscription */}
      {current ? (
        <Card style={styles.currentCard}>
          <View style={styles.currentHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentLabel}>Current plan</Text>
              <Text style={styles.currentName}>{current.plan_name}</Text>
            </View>
            <Pill label="Active" tone="green" />
          </View>
          {current.expires_at ? (
            <Text style={styles.currentMeta}>Plan ends on {mediumDate(current.expires_at)}</Text>
          ) : null}
          {partnerPaid ? (
            <View style={styles.noteRow}>
              <Ionicons name="business-outline" size={14} color={colors.textMuted} />
              <Text style={styles.noteText}>
                Provided by the {current.payer_type === "partner" ? "partner" : "school"} — no charge.
              </Text>
            </View>
          ) : null}
        </Card>
      ) : (
        <Card style={styles.currentCard}>
          <Text style={styles.currentLabel}>Current plan</Text>
          <Text style={styles.currentName}>Free</Text>
          <Text style={styles.currentMeta}>
            Upgrade to unlock attendance, marks, timetable, health and more.
          </Text>
        </Card>
      )}

      {/* Scheduled downgrade */}
      {scheduled ? (
        <View style={styles.scheduledRow}>
          <Ionicons name="time-outline" size={15} color={palette.accent600} />
          <Text style={styles.scheduledText}>
            Coming next: <Text style={styles.scheduledStrong}>{scheduled.plan_name}</Text>
            {scheduled.starts_at ? ` starts ${mediumDate(scheduled.starts_at)}` : ""}.
          </Text>
        </View>
      ) : null}

      {/* Catalog */}
      <SectionHeader title={current ? "Change plan" : "Choose a plan"} />
      <View style={{ gap: spacing.md }}>
        {data.plans.map((plan) => {
          const isCurrent = current?.plan_id === plan.id;
          const price = Number(plan.price_inr);
          const free = !Number.isFinite(price) || price <= 0;
          const cta = ctaFor(plan, price, current, currentPrice);
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              prevPlan={prevPlanOf.get(plan.id) ?? null}
              price={price}
              free={free}
              isCurrent={isCurrent}
              ctaLabel={cta.label}
              ctaVariant={cta.variant}
              busy={busyPlanId === plan.id}
              disabled={busyPlanId != null || free}
              onPress={() => purchase(plan)}
            />
          );
        })}
      </View>

      {!isRazorpayAvailable() ? (
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.noteText}>
            Purchases open in the installed WiserWits app. In Expo Go you can browse plans but not pay.
          </Text>
        </View>
      ) : null}
    </>
  );
}

// ── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  prevPlan,
  price,
  free,
  isCurrent,
  ctaLabel,
  ctaVariant,
  busy,
  disabled,
  onPress,
}: {
  plan: PlanRow;
  prevPlan: PlanRow | null;
  price: number;
  free: boolean;
  isCurrent: boolean;
  ctaLabel: string;
  ctaVariant: "primary" | "secondary";
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  // What this tier adds over the next-cheaper plan — highlighted so the student
  // sees why it costs more. If this plan is a clean superset of the cheaper one,
  // collapse the shared features into an "Everything in X, plus:" line and list
  // only the extras; otherwise list all features and just accent the new ones.
  const feats = plan.feature_labels ?? [];
  const prevFeats = prevPlan?.feature_labels ?? [];
  const addedSet = new Set(feats.filter((f) => !prevFeats.includes(f)));
  const additions = feats.filter((f) => addedSet.has(f));
  const inheritsAll =
    prevPlan != null && prevFeats.length > 0 && prevFeats.every((f) => feats.includes(f));
  const shown = inheritsAll && additions.length > 0 ? additions : feats;

  return (
    <Card style={[styles.planCard, isCurrent && styles.planCardCurrent]}>
      <View style={styles.planHead}>
        <View style={{ flex: 1 }}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planName}>{plan.name}</Text>
            {isCurrent ? <Pill label="Current" tone="navy" /> : null}
          </View>
          {plan.description ? (
            <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text>
          ) : null}
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price}>{free ? "Free" : `₹${formatInr(price)}`}</Text>
          {!free ? (
            <Text style={styles.priceMeta}>/ {durationLabel(plan.duration_days)}</Text>
          ) : null}
        </View>
      </View>

      {shown.length > 0 ? (
        <View style={styles.features}>
          {inheritsAll && additions.length > 0 ? (
            <Text style={styles.inheritLine}>Everything in {prevPlan!.name}, plus:</Text>
          ) : null}
          {shown.slice(0, MAX_FEATURES).map((label, i) => {
            const highlight = addedSet.has(label);
            return (
              <View key={i} style={styles.featureRow}>
                <Ionicons
                  name={highlight ? "sparkles" : "checkmark-circle"}
                  size={16}
                  color={highlight ? colors.gold : colors.green}
                />
                <Text
                  style={[styles.featureText, highlight && styles.featureTextNew]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            );
          })}
          {shown.length > MAX_FEATURES ? (
            <Text style={styles.moreText}>+ {shown.length - MAX_FEATURES} more</Text>
          ) : null}
        </View>
      ) : null}

      {isCurrent ? (
        // The plan the student is already on — surfaced as a disabled marker,
        // never a purchase action (mirrors the web dashboard).
        <Button label="Current plan" variant="secondary" disabled onPress={() => {}} />
      ) : !free ? (
        <Button
          label={busy ? "Processing…" : ctaLabel}
          onPress={onPress}
          loading={busy}
          disabled={disabled}
          variant={ctaVariant}
        />
      ) : null}
    </Card>
  );
}

// How many plan features to list before collapsing the rest into "+ N more".
// Matches the web dashboard's cap so the two read the same.
const MAX_FEATURES = 6;

// ── helpers ──────────────────────────────────────────────────────────────────
function ctaFor(
  plan: PlanRow,
  price: number,
  current: SubscriptionRow | null,
  currentPrice: number | null,
): { label: string; variant: "primary" | "secondary" } {
  if (!current) return { label: "Subscribe", variant: "primary" };
  // The current plan never reaches here — PlanCard renders a disabled marker
  // for it instead of a purchase CTA.
  if (currentPrice != null && price > currentPrice) return { label: "Upgrade", variant: "primary" };
  if (currentPrice != null && price < currentPrice) return { label: "Downgrade", variant: "secondary" };
  return { label: "Switch", variant: "primary" };
}

function successMessage(v: VerifyResponse): string {
  const until = v.expires_at ? mediumDate(v.expires_at) : "";
  switch (v.action) {
    case "extend_active":
      return `${v.plan_name} extended${until ? ` until ${until}` : ""}.`;
    case "schedule_downgrade":
      return `${v.plan_name} will start${v.starts_at ? ` ${mediumDate(v.starts_at)}` : ""} when the current plan ends.`;
    case "already_processed":
      return "This payment was already applied to this account.";
    default:
      return `${v.plan_name} is now active${until ? ` until ${until}` : ""}.`;
  }
}

/** 30 → "month", 90 → "3 months", 365 → "year", else "N days". */
function durationLabel(days: number): string {
  if (days === 365 || days === 366) return "year";
  if (days === 30 || days === 31) return "month";
  if (days % 30 === 0) return `${days / 30} months`;
  return `${days} days`;
}

/** 4999 → "4,999" (Indian grouping). */
function formatInr(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  currentCard: { gap: spacing.xs },
  currentHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  currentLabel: { ...typography.label, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  currentName: { ...typography.h1, color: colors.ink, marginTop: 2 },
  currentMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  scheduledRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: palette.accent50, borderRadius: radius.md,
    padding: spacing.md, marginTop: -spacing.sm,
  },
  scheduledText: { ...typography.caption, color: palette.accent600, flex: 1 },
  scheduledStrong: { fontWeight: "800" },

  planCard: { gap: spacing.md },
  planCardCurrent: { borderColor: colors.navy, borderWidth: 1.5 },
  planHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  planName: { ...typography.h2, color: colors.ink },
  planDesc: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  priceCol: { alignItems: "flex-end" },
  price: { fontSize: 22, fontWeight: "800", color: colors.navy, letterSpacing: -0.5 },
  priceMeta: { ...typography.caption, color: colors.textMuted },

  features: { gap: spacing.sm },
  inheritLine: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  featureText: { ...typography.label, color: colors.text, flex: 1, fontWeight: "600" },
  featureTextNew: { color: palette.accent600, fontWeight: "800" },
  moreText: { ...typography.caption, color: colors.textMuted, marginLeft: 24, marginTop: 2 },

  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.xs },
  noteText: { ...typography.caption, color: colors.textMuted, flex: 1 },
});
