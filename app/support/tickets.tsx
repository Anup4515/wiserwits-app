import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/components/ui";
import { colors, spacing, typography, radius } from "@/theme";
import { useMyTickets, type MyTicket } from "@/api/hooks";

/**
 * "My tickets" — the student's history of support requests. Mirrors the partner
 * dashboard's SupportButton "Your recent queries" section, but as a full mobile
 * screen. Read-only for now; threaded replies land later.
 */

type Status = MyTicket["status"];

const STATUS_VISUAL: Record<
  Status,
  { label: string; fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  open:        { label: "Open",        fg: "#b45309", bg: "#fef3c7", icon: "time-outline" },
  in_progress: { label: "In progress", fg: "#1d4ed8", bg: "#dbeafe", icon: "sync-outline" },
  resolved:    { label: "Resolved",    fg: "#15803d", bg: "#dcfce7", icon: "checkmark-circle-outline" },
  closed:      { label: "Closed",      fg: "#475569", bg: "#e2e8f0", icon: "archive-outline" },
};

const CATEGORY_LABELS: Record<MyTicket["category"], string> = {
  general: "General",
  feature: "Feature",
  bug: "Bug",
  account: "Account",
  billing: "Billing",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function MyTicketsScreen() {
  const router = useRouter();
  const query = useMyTickets();
  const items = query.data?.items ?? [];

  const onRefresh = useCallback(() => {
    query.refetch();
  }, [query]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isFetching && !query.isLoading} onRefresh={onRefresh} />
      }
    >
      {query.isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      ) : query.error ? (
        <Card style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.textMuted} />
          <Text style={styles.stateTitle}>Couldn&apos;t load your tickets</Text>
          <Text style={styles.stateSub}>Pull down to try again.</Text>
        </Card>
      ) : items.length === 0 ? (
        <Card style={styles.stateCard}>
          <Ionicons name="chatbubbles-outline" size={28} color={colors.textMuted} />
          <Text style={styles.stateTitle}>No tickets yet</Text>
          <Text style={styles.stateSub}>
            When you raise a support request, it&apos;ll show up here so you can track its status.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => router.push("/support/contact")}
          >
            <Text style={styles.primaryBtnLabel}>Contact support</Text>
          </Pressable>
        </Card>
      ) : (
        items.map((t) => <TicketCard key={t.id} ticket={t} />)
      )}
    </ScrollView>
  );
}

function TicketCard({ ticket }: { ticket: MyTicket }) {
  const v = STATUS_VISUAL[ticket.status];
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.subjectWrap}>
          <Text style={styles.subject} numberOfLines={2}>
            {ticket.subject}
          </Text>
          <Text style={styles.meta}>
            {ticket.ticket_ref} · {CATEGORY_LABELS[ticket.category]} · {relativeTime(ticket.created_at)}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: v.bg }]}>
          <Ionicons name={v.icon} size={12} color={v.fg} />
          <Text style={[styles.statusLabel, { color: v.fg }]}>{v.label}</Text>
        </View>
      </View>

      <Text style={styles.body} numberOfLines={4}>
        {ticket.body}
      </Text>

      {(ticket.status === "resolved" || ticket.status === "closed") && ticket.resolution_note ? (
        <View style={styles.responseWrap}>
          <View style={styles.responseHeader}>
            <Ionicons name="checkmark-circle" size={14} color="#15803d" />
            <Text style={styles.responseTitle}>
              Response{ticket.resolved_at ? ` · ${relativeTime(ticket.resolved_at)}` : ""}
            </Text>
          </View>
          <Text style={styles.responseText}>{ticket.resolution_note}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  loadingWrap: { paddingVertical: spacing.xxl, alignItems: "center" },

  stateCard: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  stateTitle: { ...typography.body, color: colors.ink, fontWeight: "700" },
  stateSub: { ...typography.caption, color: colors.textMuted, textAlign: "center", paddingHorizontal: spacing.lg },

  primaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  primaryBtnLabel: { ...typography.label, color: colors.textInverse, fontWeight: "700" },
  pressed: { opacity: 0.7 },

  card: { gap: spacing.sm },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  subjectWrap: { flex: 1, gap: 2 },
  subject: { ...typography.body, color: colors.ink, fontWeight: "700" },
  meta: { ...typography.caption, color: colors.textMuted },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

  body: { ...typography.body, color: colors.ink, lineHeight: 20 },

  responseWrap: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  responseTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  responseText: { ...typography.body, color: "#14532d", lineHeight: 20 },
});
