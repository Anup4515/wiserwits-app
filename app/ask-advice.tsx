import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import { useAskAdvice } from "@/api/hooks";
import { Button, Field, FormError } from "@/components/ui";
import { colors, spacing, radius, typography } from "@/theme";

/**
 * Ask a consultant (§ Phase 3 write). Modal form that posts an advice request
 * to the student's assigned consultant. The backend surfaces a helpful error
 * when no consultant is assigned, so we simply render `m.error.message`.
 *
 * Optional call: ticking "connect over a call" enables a native date-time
 * picker; the chosen time is sent as `preferred_time` (a readable string the
 * consultant sees in the thread). Unticked → no time is sent.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AskAdviceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const m = useAskAdvice();

  const [message, setMessage] = useState("");
  const [wantCall, setWantCall] = useState(false);
  const [when, setWhen] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const toggleWantCall = () => {
    setWantCall((prev) => {
      if (prev) setShowIosPicker(false); // collapsing → hide any open iOS picker
      return !prev;
    });
  };

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
    if (!message.trim()) {
      setLocalError("Write a message for the consultant.");
      return;
    }
    if (wantCall && !when) {
      setLocalError("Pick a preferred date and time for the call.");
      return;
    }
    m.mutate(
      {
        message: message.trim(),
        preferred_time: wantCall && when ? formatDateTime(when) : null,
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
      <Text style={styles.heading}>Ask Consultant</Text>
      <Text style={styles.subheading}>
        Send a question to the assigned consultant. They'll reply in the advice thread.
      </Text>

      <View style={{ height: spacing.lg }} />

      <FormError message={m.error?.message ?? localError} />

      <Field
        label="Your message"
        value={message}
        onChangeText={setMessage}
        placeholder="What would you like advice on?"
        multiline
        numberOfLines={4}
      />

      {/* Optional: request a call */}
      <Pressable style={styles.checkRow} onPress={toggleWantCall} accessibilityRole="checkbox" accessibilityState={{ checked: wantCall }}>
        <Ionicons
          name={wantCall ? "checkbox" : "square-outline"}
          size={22}
          color={wantCall ? colors.navy : colors.textMuted}
        />
        <Text style={styles.checkLabel}>Want to connect over a call</Text>
      </Pressable>

      {/* Preferred time — enabled only when a call is requested */}
      <Text style={[styles.pickerLabel, !wantCall && styles.disabledText]}>Preferred time</Text>
      <Pressable
        style={[styles.pickerField, !wantCall && styles.pickerFieldDisabled]}
        onPress={openPicker}
        disabled={!wantCall}
        accessibilityRole="button"
      >
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <Text style={[styles.pickerValue, !when && styles.pickerPlaceholder]}>
          {when ? formatDateTime(when) : "Select a date & time"}
        </Text>
        {wantCall ? (
          <Ionicons name={showIosPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
        ) : null}
      </Pressable>
      {!wantCall ? (
        <Text style={styles.hint}>Tick the box above to pick a call time. Otherwise you'll get a written reply.</Text>
      ) : null}

      {wantCall && Platform.OS === "ios" && showIosPicker ? (
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
      <Button label="Send" loading={m.isPending} onPress={submit} />
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

  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  checkLabel: { ...typography.body, color: colors.ink },

  pickerLabel: { ...typography.label, color: colors.ink, marginTop: spacing.md, marginBottom: spacing.sm },
  disabledText: { color: colors.textMuted },
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
  pickerFieldDisabled: { backgroundColor: colors.bg, opacity: 0.6 },
  pickerValue: { ...typography.body, color: colors.ink, flex: 1 },
  pickerPlaceholder: { color: "#94a3b8" },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, paddingHorizontal: spacing.xs },
  iosPickerWrap: { marginTop: spacing.sm, alignItems: "center" },
});
