import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import { useAuth } from "@/auth/AuthContext";
import { useBookConsultation } from "@/api/hooks";
import { Button, Field, FormError } from "@/components/ui";
import { colors, spacing, radius, typography } from "@/theme";

/**
 * Book consultation (Phase 3 quick action, modal). The preferred time uses the
 * native date-time picker (`@react-native-community/datetimepicker`): an inline
 * datetime wheel on iOS, and a chained date→time dialog on Android. The chosen
 * Date is sent as ISO. On success the consultations/health/feed queries
 * invalidate and we pop back.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BookConsultationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const m = useBookConsultation();
  const { user } = useAuth();

  // Consultations are strictly for the account holder (the child), so the
  // patient is never chosen — we pre-fill their name and keep the field
  // read-only rather than asking who it's for.
  const patientName = user?.name?.trim() ?? "";
  const [problem, setProblem] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [when, setWhen] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Android has no single "datetime" mode, so chain a date dialog into a time
  // dialog; iOS shows one inline datetime picker toggled below the field.
  const openPicker = () => {
    if (Platform.OS !== "android") {
      setShowIosPicker((s) => !s);
      return;
    }
    DateTimePickerAndroid.open({
      value: when ?? new Date(),
      mode: "date",
      minimumDate: new Date(),
      onChange: (dateEvent, picked) => {
        if (dateEvent.type !== "set" || !picked) return;
        DateTimePickerAndroid.open({
          value: picked,
          mode: "time",
          is24Hour: false,
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== "set" || !time) return;
            const combined = new Date(picked);
            combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
            setWhen(combined);
          },
        });
      },
    });
  };

  const submit = () => {
    setLocalError(null);
    if (!problem.trim() || !symptoms.trim()) {
      setLocalError("Please fill in the problem and symptoms.");
      return;
    }
    if (!when) {
      setLocalError("Please pick a preferred date and time.");
      return;
    }
    if (when.getTime() <= Date.now()) {
      setLocalError("Please pick a time in the future.");
      return;
    }
    m.mutate(
      {
        patient_name: patientName.trim(),
        problem: problem.trim(),
        symptoms: symptoms.trim(),
        scheduled_at: when.toISOString(),
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
      <Text style={styles.heading}>Schedule Consultation</Text>
      <Text style={styles.subheading}>Request a doctor consultation for a health concern.</Text>

      <View style={{ height: spacing.lg }} />

      <FormError message={m.error?.message ?? localError} />

      <Field
        label="Patient"
        icon="person-outline"
        value={patientName}
        editable={false}
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

      {/* Preferred date & time — native picker */}
      <Text style={styles.pickerLabel}>Preferred time</Text>
      <Pressable style={styles.pickerField} onPress={openPicker} accessibilityRole="button">
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <Text style={[styles.pickerValue, !when && styles.pickerPlaceholder]}>
          {when ? formatDateTime(when) : "Select a date & time"}
        </Text>
        <Ionicons name={showIosPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
      </Pressable>

      {Platform.OS === "ios" && showIosPicker ? (
        <View style={styles.iosPickerWrap}>
          <DateTimePicker
            value={when ?? new Date()}
            mode="datetime"
            display="inline"
            minimumDate={new Date()}
            onChange={(_e, picked) => {
              if (picked) setWhen(picked);
            }}
          />
        </View>
      ) : null}

      <View style={{ height: spacing.lg }} />
      <Button label="Schedule" loading={m.isPending} onPress={submit} />
      <View style={{ height: spacing.sm }} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

/** Date → "Mon, 4 Aug · 10:30 AM". */
function formatDateTime(d: Date): string {
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} · ${h}:${min} ${suffix}`;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  heading: { ...typography.h1, color: colors.ink },
  subheading: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },

  pickerLabel: { ...typography.label, color: colors.ink, marginTop: spacing.md, marginBottom: spacing.sm },
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pickerValue: { ...typography.body, color: colors.ink, flex: 1 },
  pickerPlaceholder: { color: "#94a3b8" },
  iosPickerWrap: { marginTop: spacing.sm, alignItems: "center" },
});
