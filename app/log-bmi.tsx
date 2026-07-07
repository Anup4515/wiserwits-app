import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useLogBmi } from "@/api/hooks";
import { Button, Field, FormError } from "@/components/ui";
import { colors, spacing, radius, typography } from "@/theme";

/**
 * Log BMI (Phase 3 quick action, modal). Captures height + weight, validates
 * plausible ranges locally, and posts to `/bmi`; on success the health/dashboard/
 * feed queries invalidate and we pop back. Shows the computed BMI live so the
 * student sees the reading before saving.
 */
export default function LogBmiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const m = useLogBmi();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const h = parseFloat(height);
  const w = parseFloat(weight);
  const livePreview =
    Number.isFinite(h) && Number.isFinite(w) && h > 0
      ? (w / (h / 100) ** 2).toFixed(1)
      : null;

  const submit = () => {
    setLocalError(null);
    if (!Number.isFinite(h) || h < 50 || h > 250) {
      setLocalError("Enter a height between 50 and 250 cm.");
      return;
    }
    if (!Number.isFinite(w) || w < 10 || w > 300) {
      setLocalError("Enter a weight between 10 and 300 kg.");
      return;
    }
    m.mutate(
      { height_cm: h, weight_kg: w },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Log a BMI reading</Text>
      <Text style={styles.subheading}>Enter your latest height and weight.</Text>

      <View style={{ height: spacing.lg }} />

      <FormError message={m.error?.message ?? localError} />

      <Field
        label="Height (cm)"
        icon="resize-outline"
        value={height}
        onChangeText={setHeight}
        placeholder="e.g. 168"
        keyboardType="numeric"
      />
      <Field
        label="Weight (kg)"
        icon="barbell-outline"
        value={weight}
        onChangeText={setWeight}
        placeholder="e.g. 62"
        keyboardType="numeric"
      />

      {livePreview ? (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Calculated BMI</Text>
          <Text style={styles.previewValue}>{livePreview}</Text>
        </View>
      ) : null}

      <View style={{ height: spacing.md }} />
      <Button label="Save" loading={m.isPending} onPress={submit} />
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

  preview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  previewLabel: { ...typography.label, color: colors.textMuted },
  previewValue: { fontSize: 24, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
});
