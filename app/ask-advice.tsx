import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAskAdvice } from "@/api/hooks";
import { Button, Field, FormError } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";

/**
 * Ask a consultant (§ Phase 3 write). Modal form that posts an advice request
 * to the student's assigned consultant. The backend surfaces a helpful error
 * when no consultant is assigned, so we simply render `m.error.message`.
 */
export default function AskAdviceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const m = useAskAdvice();

  const [message, setMessage] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    setLocalError(null);
    if (!message.trim()) {
      setLocalError("Write a message for your consultant.");
      return;
    }
    m.mutate(
      { message: message.trim(), preferred_time: preferredTime.trim() || null },
      { onSuccess: () => router.back() }
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Ask a consultant</Text>
      <Text style={styles.subheading}>
        Send a question to your assigned consultant. They'll reply in your advice thread.
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
      <Field
        label="Preferred time (optional)"
        value={preferredTime}
        onChangeText={setPreferredTime}
        placeholder="e.g. Weekday evenings"
      />

      <View style={{ height: spacing.xs }} />
      <Button label="Send" loading={m.isPending} onPress={submit} />
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
