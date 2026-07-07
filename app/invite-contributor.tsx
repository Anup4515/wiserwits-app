import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useInviteContributor } from "@/api/hooks";
import { Button, Field, FormError } from "@/components/ui";
import { colors, spacing, radius, typography } from "@/theme";
import type { GrantRelationship } from "@/api/student-types";

/**
 * Invite a contributor (§ access grants). Independent students grant a parent,
 * tutor or mentor scoped write access to their self-tracked data. The backend
 * enforces the real rules (403 for enrolled, 409 for duplicates) and returns a
 * useful message, which we surface via FormError.
 */
const RELATIONSHIPS: { value: GrantRelationship; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "tuition_teacher", label: "Tuition teacher" },
  { value: "mentor", label: "Mentor" },
];

const SCOPES = [
  { key: "attendance", label: "Attendance" },
  { key: "marks", label: "Marks" },
  { key: "timetable", label: "Timetable" },
  { key: "holistic", label: "Holistic" },
] as const;

type ScopeKey = (typeof SCOPES)[number]["key"];

export default function InviteContributorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const invite = useInviteContributor();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<GrantRelationship>("parent");
  const [scopes, setScopes] = useState<Record<ScopeKey, boolean>>({
    attendance: true,
    marks: true,
    timetable: true,
    holistic: true,
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const toggle = (key: ScopeKey) =>
    setScopes((s) => ({ ...s, [key]: !s[key] }));

  const submit = () => {
    setLocalError(null);
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setLocalError("Enter a valid email address.");
      return;
    }
    if (!SCOPES.some((s) => scopes[s.key])) {
      setLocalError("Grant access to at least one kind of data.");
      return;
    }
    invite.mutate(
      {
        invite_email: trimmed,
        invite_name: name.trim() || null,
        relationship,
        scope_attendance: scopes.attendance,
        scope_marks: scopes.marks,
        scope_timetable: scopes.timetable,
        scope_holistic: scopes.holistic,
      },
      { onSuccess: () => router.back() }
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Invite a contributor</Text>
      <Text style={styles.subheading}>
        They'll get an email invite and can fill in the data you allow below.
      </Text>

      <View style={{ height: spacing.lg }} />

      <FormError message={invite.error?.message ?? localError} />

      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="them@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
      />
      <Field
        label="Name (optional)"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="Their name"
        autoCapitalize="words"
      />

      <Text style={styles.sectionLabel}>Relationship</Text>
      <View style={styles.relRow}>
        {RELATIONSHIPS.map((r) => {
          const selected = relationship === r.value;
          return (
            <Pressable
              key={r.value}
              onPress={() => setRelationship(r.value)}
              style={[styles.relPill, selected && styles.relPillOn]}
            >
              <Text style={[styles.relText, selected && styles.relTextOn]}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Data they can fill</Text>
      <View style={styles.scopeList}>
        {SCOPES.map((s) => {
          const on = scopes[s.key];
          return (
            <Pressable key={s.key} onPress={() => toggle(s.key)} style={styles.scopeRow}>
              <Ionicons
                name={on ? "checkbox" : "square-outline"}
                size={22}
                color={on ? colors.navy : colors.textMuted}
              />
              <Text style={styles.scopeText}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: spacing.lg }} />
      <Button label="Send invite" loading={invite.isPending} onPress={submit} />
      <View style={{ height: spacing.sm }} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  heading: { ...typography.h1, color: colors.ink },
  subheading: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },

  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },

  relRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  relPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  relPillOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  relText: { ...typography.label, color: colors.textMuted },
  relTextOn: { color: colors.textInverse },

  scopeList: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  scopeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  scopeText: { ...typography.body, fontWeight: "600", color: colors.ink },
});
