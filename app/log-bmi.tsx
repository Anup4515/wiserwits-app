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

// Plausible human ranges — reject typos like 1000 cm or 500 kg before they
// ever reach the server or produce a nonsense BMI. Single source of truth for
// both the submit guard and the live preview.
const HEIGHT_MIN_CM = 50;
const HEIGHT_MAX_CM = 250;
const WEIGHT_MIN_KG = 10;
const WEIGHT_MAX_KG = 300;

export default function LogBmiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const m = useLogBmi();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const h = parseFloat(height);
  const w = parseFloat(weight);
  const heightOk = Number.isFinite(h) && h >= HEIGHT_MIN_CM && h <= HEIGHT_MAX_CM;
  const weightOk = Number.isFinite(w) && w >= WEIGHT_MIN_KG && w <= WEIGHT_MAX_KG;
  // Only preview a BMI once both inputs are plausible, so a typo like 1000 cm
  // never flashes a misleading number before the range check runs on Save.
  const livePreview = heightOk && weightOk ? (w / (h / 100) ** 2).toFixed(1) : null;

  const submit = () => {
    setLocalError(null);
    if (!heightOk) {
      setLocalError(`Enter a height between ${HEIGHT_MIN_CM} and ${HEIGHT_MAX_CM} cm.`);
      return;
    }
    if (!weightOk) {
      setLocalError(`Enter a weight between ${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg.`);
      return;
    }
    m.mutate(
      { height_cm: h, weight_kg: w },
      // Land on Health after saving (not `router.back()`, which returns to
      // wherever the tabs were when this was opened via the "+" quick action).
      // Health shows the just-logged reading as the new latest BMI.
      { onSuccess: () => router.replace("/(tabs)/health/bmi") },
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Log a BMI reading</Text>
      <Text style={styles.subheading}>Enter the latest height and weight.</Text>

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
