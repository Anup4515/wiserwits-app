import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { useEnrollment } from "@/features/enrollment/EnrollmentContext";
import { useSelectedEnrollment } from "@/features/enrollment/useSessionMonths";
import { useEnrollments } from "@/api/hooks";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { EnrollmentRow } from "@/api/student-types";

/**
 * Class switcher — lets an enrolled student who belongs to more than one
 * class/section (concurrent, or past classes/schools after a transfer) pick
 * which enrolled class's academic data to view. Selecting a class calls
 * `setEnrollmentId`, which the query layer threads as `?enrollment_id=` onto
 * every enrolled read and folds into the cache key — so attendance, exams,
 * report card, timetable and calendar all re-fetch for the chosen class.
 *
 * Renders nothing for self-tracked students or when the student has a single
 * enrollment (matching the dashboard's picker) — there's nothing to switch.
 *
 * Sits on a dark hero (navy gradient), so the trigger is styled light.
 */
export function EnrollmentSwitcher() {
  const { user } = useAuth();
  const { setEnrollmentId } = useEnrollment();
  const { data: enrollments } = useEnrollments();
  const selected = useSelectedEnrollment();
  const [open, setOpen] = useState(false);

  const rows = enrollments ?? [];
  // Single enrollment (or self) → nothing to switch between.
  if (rows.length <= 1 || !selected) return null;

  // The JWT-baked active enrollment is the default; `null` override means it.
  const activeId = user?.enrollment_id ?? null;

  const pick = (r: EnrollmentRow) => {
    // Only override for a non-active class; selecting the active one clears the
    // override back to `null` (the server's default) — same rule the dashboard
    // uses, so we never pin the token's own enrollment via the URL param.
    setEnrollmentId(r.enrollment_id === activeId ? null : r.enrollment_id);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="school-outline" size={16} color={colors.textInverse} />
        <View style={{ flex: 1 }}>
          <Text style={styles.triggerTitle} numberOfLines={1}>
            {classTitle(selected)}
          </Text>
          <Text style={styles.triggerSub} numberOfLines={1}>
            {classSub(selected)}
          </Text>
        </View>
        {selected.is_current ? null : <View style={styles.pastDot} />}
        <Ionicons name="chevron-down" size={16} color={colors.textInverse} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Your classes</Text>
            <Text style={styles.sheetSub}>Pick a class to view its academics.</Text>

            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: spacing.md }}>
              {rows.map((r) => {
                const isSelected = r.enrollment_id === selected.enrollment_id;
                return (
                  <Pressable
                    key={r.enrollment_id}
                    onPress={() => pick(r)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <View style={styles.optionIc}>
                      <Ionicons name="school" size={18} color={colors.navy} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>{classTitle(r)}</Text>
                        {r.is_current ? (
                          <View style={styles.currentChip}>
                            <Text style={styles.currentChipText}>Current</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.optionSub}>{classSub(r)}</Text>
                      {r.roll_number != null ? (
                        <Text style={styles.optionMeta}>Roll no. {r.roll_number}</Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.navy} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={22} color={colors.border} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

function classTitle(r: EnrollmentRow): string {
  return `Class ${r.class_name} – ${r.section_name}`;
}

function classSub(r: EnrollmentRow): string {
  return [r.session_name, r.partner_name].filter(Boolean).join(" · ");
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  triggerTitle: { color: colors.textInverse, fontSize: 13.5, fontWeight: "700" },
  triggerSub: { color: "rgba(255,255,255,0.75)", fontSize: 11.5, marginTop: 1 },
  pastDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: { ...typography.h1, fontSize: 20, color: colors.ink },
  sheetSub: { ...typography.body, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.navy, backgroundColor: palette.primary50 },
  optionIc: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: palette.primary50,
    alignItems: "center", justifyContent: "center",
  },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  optionTitle: { ...typography.h2, fontSize: 14.5, color: colors.ink },
  optionSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  optionMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  currentChip: {
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentChipText: { color: colors.textInverse, fontSize: 10, fontWeight: "700" },
});
