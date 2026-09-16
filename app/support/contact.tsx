import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Device from "expo-device";

import { Card, Field, Button, FormError } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { useCreateSupportTicket, type SupportTicketDiagnostics } from "@/api/hooks";
import { colors, spacing, typography, radius } from "@/theme";

const SUPPORT_EMAIL = "support@wiserwits.com";
const NETWORK_ERROR_MESSAGE = "Network error. Please try again.";

const CATEGORIES = ["general", "feature", "bug", "account", "billing"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  general: "General",
  feature: "Feature",
  bug: "Bug",
  account: "Account",
  billing: "Billing",
};

function isCategory(value: string | undefined): value is Category {
  return !!value && (CATEGORIES as readonly string[]).includes(value);
}

export default function ContactSupport() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ category?: string; subject?: string }>();
  const createTicket = useCreateSupportTicket();

  const initialCategory: Category = isCategory(params.category) ? params.category : "general";
  const [category, setCategory] = useState<Category>(initialCategory);
  const [subject, setSubject] = useState(params.subject ?? "");
  const [description, setDescription] = useState("");
  const [attachDiagnostics, setAttachDiagnostics] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reply email is the account's login email — displayed for transparency,
  // not editable. The server derives it authoritatively from the students
  // table on insert, so anything the client would send is ignored anyway.
  const sessionEmail = user?.email ?? "";

  /** Structured payload for the API + JSON diagnostics field. */
  const diagnosticsData: SupportTicketDiagnostics = useMemo(
    () => ({
      app_version: Constants.expoConfig?.version ?? "0.1.0",
      platform: Platform.OS,
      os_version: Platform.Version,
      device: `${Device.manufacturer ?? "Unknown"} ${Device.modelName ?? Device.deviceName ?? ""}`.trim(),
      locale: Intl.DateTimeFormat().resolvedOptions().locale ?? undefined,
      student_id: user?.student_id ?? undefined,
    }),
    [user],
  );

  /** Human-readable snapshot used for the preview card and mailto: fallback. */
  const diagnosticsText = useMemo(() => {
    const lines = [
      `App: WiserWits v${diagnosticsData.app_version ?? "?"}`,
      `Platform: ${diagnosticsData.platform ?? "?"} ${diagnosticsData.os_version ?? ""}`,
      `Device: ${diagnosticsData.device ?? "?"}`,
      `Locale: ${diagnosticsData.locale ?? "unknown"}`,
      `Time: ${new Date().toISOString()}`,
    ];
    if (diagnosticsData.student_id) lines.push(`Student ID: ${diagnosticsData.student_id}`);
    return lines.join("\n");
  }, [diagnosticsData]);

  function validate(): string | null {
    if (!subject.trim()) return "Please enter a subject.";
    if (description.trim().length < 20) return "Please describe the issue in at least 20 characters.";
    return null;
  }

  /** Fallback path: open user's mail app with the message pre-filled. Used
   * when the API is unreachable, or the client can't open a mail app either. */
  async function sendByEmail() {
    const subjectLine = `[${CATEGORY_LABELS[category]}] ${subject.trim()}`;
    const bodyParts = [description.trim(), "", "---", `From: ${sessionEmail}`];
    if (attachDiagnostics) bodyParts.push("", "Diagnostics:", diagnosticsText);
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(bodyParts.join("\n"))}`;

    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (!canOpen) {
      Alert.alert(
        "No email app",
        `We couldn't open an email app. Please email us directly at ${SUPPORT_EMAIL}.`,
      );
      return;
    }
    await Linking.openURL(url);
    Alert.alert(
      "Message ready",
      "We opened your email app with the message pre-filled. Send it when you're ready.",
      [{ text: "Done", onPress: () => router.back() }],
    );
  }

  async function submit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    try {
      const result = await createTicket.mutateAsync({
        category,
        subject: subject.trim(),
        description: description.trim(),
        diagnostics: attachDiagnostics ? diagnosticsData : undefined,
      });
      Alert.alert(
        "Message sent",
        `Thanks — we've logged your request as ${result.ticket_ref}.${sessionEmail ? ` We'll reply to ${sessionEmail} within 24 hours.` : ""}`,
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      // Offline / server unreachable: offer to send via the user's mail app
      // instead so the message doesn't just get lost.
      if (message === NETWORK_ERROR_MESSAGE) {
        Alert.alert(
          "Can't reach our servers",
          "Send the message from your email app instead? Your reply will still land in the same inbox.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Send by email", onPress: sendByEmail },
          ],
        );
        return;
      }
      setError(message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.introCard}>
          <Text style={styles.introTitle}>Contact support</Text>
          <Text style={styles.introText}>
            Tell us what's going on. We reply within 24 hours on business days.
          </Text>
        </Card>

        <Text style={styles.label}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{CATEGORY_LABELS[c]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Field
          label="Subject"
          placeholder="Short summary of the issue"
          value={subject}
          onChangeText={setSubject}
          maxLength={120}
          autoCapitalize="sentences"
        />

        <Field
          label="Description"
          placeholder="Steps to reproduce, what you expected, what happened…"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          style={{ minHeight: 120, textAlignVertical: "top" }}
          maxLength={2000}
          autoCapitalize="sentences"
        />

        {sessionEmail ? (
          <View style={styles.replyBanner}>
            <Text style={styles.replyLabel}>We&apos;ll reply to your login email</Text>
            <Text style={styles.replyEmail}>{sessionEmail}</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.diagRow}
          onPress={() => setAttachDiagnostics((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: attachDiagnostics }}
        >
          <View style={[styles.checkbox, attachDiagnostics && styles.checkboxOn]}>
            {attachDiagnostics ? (
              <Text style={styles.checkboxTick}>✓</Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.diagLabel}>Attach diagnostics</Text>
            <Text style={styles.diagHint}>App version, device, and OS. Helps us fix issues faster.</Text>
          </View>
        </Pressable>

        {attachDiagnostics ? (
          <Card style={styles.diagCard}>
            <Text style={styles.diagCode}>{diagnosticsText}</Text>
          </Card>
        ) : null}

        <FormError message={error} />

        <Button
          label={createTicket.isPending ? "Sending…" : "Send message"}
          onPress={submit}
          loading={createTicket.isPending}
          disabled={createTicket.isPending}
        />

        <Text style={styles.altText}>
          Prefer email directly? Write to{" "}
          <Text style={styles.altLink} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
            {SUPPORT_EMAIL}
          </Text>
          .
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  introCard: { gap: spacing.xs },
  introTitle: { ...typography.h2, color: colors.ink },
  introText: { ...typography.body, color: colors.textMuted },

  label: {
    ...typography.label,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  chipsRow: { gap: spacing.sm, paddingRight: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipLabel: { ...typography.caption, color: colors.ink, fontWeight: "600" },
  chipLabelActive: { color: colors.textInverse },

  diagRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  checkboxTick: { color: colors.textInverse, fontSize: 14, fontWeight: "700", lineHeight: 16 },
  diagLabel: { ...typography.body, color: colors.ink, fontWeight: "600" },
  diagHint: { ...typography.caption, color: colors.textMuted },

  diagCard: { padding: spacing.md },
  diagCode: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },

  replyBanner: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  replyLabel: { ...typography.caption, color: colors.textMuted },
  replyEmail: { ...typography.body, color: colors.ink, fontWeight: "600" },

  altText: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  altLink: { color: colors.navy, fontWeight: "700" },
});
