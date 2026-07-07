import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useBookConsultation } from "@/api/hooks";
import { Button, Field, FormError } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";

/**
 * Book consultation (Phase 3 quick action, modal). All fields required; the
 * scheduled time is a plain text field ("YYYY-MM-DD HH:MM") converted to ISO on
 * submit — no date-picker dependency. On success the consultations/health/feed
 * queries invalidate and we pop back.
 */
export default function BookConsultationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const m = useBookConsultation();

  const [patientName, setPatientName] = useState("");
  const [problem, setProblem] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    setLocalError(null);
    if (!patientName.trim() || !problem.trim() || !symptoms.trim() || !scheduledAt.trim()) {
      setLocalError("Please fill in every field.");
      return;
    }
    if (Number.isNaN(Date.parse(scheduledAt))) {
      setLocalError("Enter a valid date and time, e.g. 2026-07-10 14:30.");
      return;
    }
    m.mutate(
      {
        patient_name: patientName.trim(),
        problem: problem.trim(),
        symptoms: symptoms.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Book a consultation</Text>
      <Text style={styles.subheading}>Request a doctor consultation for a health concern.</Text>

      <View style={{ height: spacing.lg }} />

      <FormError message={m.error?.message ?? localError} />

      <Field
        label="Patient name"
        icon="person-outline"
        value={patientName}
        onChangeText={setPatientName}
        placeholder="Who is this for?"
        autoCapitalize="words"
      />
      <Field
        label="Problem"
        icon="medkit-outline"
        value={problem}
        onChangeText={setProblem}
        placeholder="What's the main concern?"
      />
      <Field
        label="Symptoms"
        icon="clipboard-outline"
        value={symptoms}
        onChangeText={setSymptoms}
        placeholder="Describe the symptoms"
        multiline
        numberOfLines={3}
      />
      <Field
        label="Preferred time"
        icon="calendar-outline"
        value={scheduledAt}
        onChangeText={setScheduledAt}
        placeholder="YYYY-MM-DD HH:MM"
        autoCapitalize="none"
      />

      <View style={{ height: spacing.md }} />
      <Button label="Book" loading={m.isPending} onPress={submit} />
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
});
