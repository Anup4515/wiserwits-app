import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAdvice } from "@/api/hooks";
import { downloadAndSave, resolveFileUrl } from "@/lib/download";
import { Button, Card, Pill } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { EmptyState } from "@/components/data-ui";
import { shortDate } from "@/lib/format";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { AdviceRow } from "@/api/student-types";

/**
 * Consultant Advice (Phase 3) — the student's own advice thread with their
 * assigned consultant (writable via /ask-advice). Consultant feedback lives on
 * its own screen (/feedback) and is no longer shown here.
 *
 * `file_path` is written ONLY by the consultant when they reply, so the
 * attachment belongs to the reply bubble, never the student's own message. It
 * is a bare storage relPath, so it needs resolveFileUrl() plus the Bearer token
 * downloadAndSave() attaches — /api/files 401s without it.
 */
export default function AdviceScreen() {
  const router = useRouter();
  const adviceResult = useAdvice();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl
          refreshing={adviceResult.query.isRefetching}
          onRefresh={() => adviceResult.query.refetch()}
        />
      }
    >
      <Button label="Ask Consultant" onPress={() => router.push("/ask-advice")} />

      <QueryView result={adviceResult} feature="student.advice">
        {(rows) => <AdviceThread rows={rows} />}
      </QueryView>
    </ScrollView>
  );
}

// ── Advice thread ────────────────────────────────────────────────────────────
function AdviceThread({ rows }: { rows: AdviceRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No requests yet"
          subtitle="Ask the consultant for advice and their replies will show up here as a thread."
        />
      </Card>
    );
  }
  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row) => (
        <AdviceCard key={row.id} row={row} />
      ))}
    </View>
  );
}

function AdviceCard({ row }: { row: AdviceRow }) {
  const answered = hasReply(row);
  const fileUrl = resolveFileUrl(row.file_path);
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.cardHead}>
        <Pill
          label={answered ? "Answered" : "Pending"}
          tone={answered ? "green" : "amber"}
        />
        <Text style={styles.date}>{dateLabel(row.created_at)}</Text>
      </View>

      <View style={styles.ownRow}>
        <View style={[styles.bubble, styles.ownBubble]}>
          <Text style={styles.ownText}>{row.message ?? "—"}</Text>
          {row.preferred_time ? (
            <Text style={styles.ownMeta}>Date: {preferredDate(row.preferred_time)}</Text>
          ) : null}
        </View>
      </View>

      {answered || fileUrl ? (
        <View style={styles.replyRow}>
          <View style={[styles.bubble, styles.replyBubble]}>
            <Text style={styles.replyLabel}>Consultant</Text>
            {row.feedback ? <Text style={styles.replyText}>{row.feedback}</Text> : null}
            {fileUrl ? <AttachmentLink url={fileUrl} path={row.file_path} /> : null}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Compact download chip — a full-width <Button> would swamp the chat bubble it
 * sits in. Keeps the stored file's own extension: the consultant may attach a
 * document or an image, so hardcoding ".pdf" would mislabel half of them.
 */
function AttachmentLink({ url, path }: { url: string; path: string | null }) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    const ext = path?.split("?")[0].match(/\.[a-z0-9]+$/i)?.[0] ?? "";
    await downloadAndSave(url, `advice-attachment${ext.toLowerCase()}`);
    setDownloading(false);
  }

  return (
    <Pressable
      onPress={download}
      disabled={downloading}
      accessibilityRole="button"
      accessibilityLabel="Download attachment"
      style={({ pressed }) => [styles.attach, pressed && !downloading && { opacity: 0.85 }]}
    >
      {downloading ? (
        <ActivityIndicator size="small" color={colors.navy} />
      ) : (
        <Ionicons name="download-outline" size={16} color={colors.navy} />
      )}
      <Text style={styles.attachText}>{downloading ? "Downloading…" : "Attachment"}</Text>
    </Pressable>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function hasReply(row: AdviceRow): boolean {
  if (row.feedback && row.feedback.trim()) return true;
  const s = row.status?.toLowerCase();
  return s === "replied" || s === "answered";
}

/** created_at is a full timestamp; slice to YYYY-MM-DD before formatting. */
function dateLabel(ts: string | null | undefined): string {
  if (!ts) return "";
  return shortDate(ts.slice(0, 10));
}

/**
 * `preferred_time` is free text and reaches us in two shapes: /ask-advice
 * writes "Mon, 4 Aug · 10:30 AM", while the web dashboard's datetime-local
 * input writes "2026-09-05T10:30". Show the calendar date only, and fall back
 * to the raw string when it is neither (shortDate returns its input unparsed).
 */
function preferredDate(raw: string): string {
  const dot = raw.indexOf("·");
  if (dot !== -1) return raw.slice(0, dot).trim();
  return shortDate(raw);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  date: { ...typography.caption, color: colors.textMuted },

  ownRow: { alignItems: "flex-end" },
  replyRow: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "88%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ownBubble: { backgroundColor: palette.primary600, borderBottomRightRadius: radius.sm },
  ownText: { ...typography.body, color: colors.textInverse },
  ownMeta: { ...typography.caption, color: palette.primary200, marginTop: spacing.xs },
  replyBubble: {
    backgroundColor: palette.primary50,
    borderBottomLeftRadius: radius.sm,
  },
  replyLabel: {
    ...typography.caption,
    color: colors.navy,
    fontWeight: "800",
    marginBottom: 2,
  },
  replyText: { ...typography.body, color: colors.ink },

  attach: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachText: { ...typography.label, color: colors.navy },
});
