import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useProfile, useDisputeEnrollment } from "@/api/hooks";
import { Card, Avatar, Pill, Button } from "@/components/ui";
import { LoadingState, ErrorState } from "@/components/data-ui";
import { longDate } from "@/lib/format";
import { env } from "@/lib/env";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { StudentProfile, ProfileEnrollment } from "@/api/student-types";

/**
 * Profile details — the read-only record a student opens by tapping their
 * avatar in the home header. Mirrors the fields the web student dashboard's
 * profile page shows (personal, contact, family, academic, consultant), minus
 * the inline editing (contact edits stay on the web dashboard for now).
 *
 * Works for independent students too: the `/profile` endpoint resolves from
 * identity, so `enrollment` is simply null and the Academic card is hidden.
 */
export default function ProfileDetails() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useProfile();

  if (isLoading) return <LoadingState label="Loading profile…" />;
  if (isError || !data) {
    return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />;
  }

  const s = data.student;
  const enr = data.enrollment;
  const fullName = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ") || "—";
  const location = [s.city, s.state, s.country].filter(Boolean).join(", ");
  const photo = s.profile_image
    ? s.profile_image.startsWith("http") ? s.profile_image : `${env.apiBaseUrl}${s.profile_image}`
    : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.navy} />}
    >
      {/* Identity header */}
      <Card style={styles.header}>
        <Pressable
          onPress={() => router.push("/profile-edit")}
          hitSlop={8}
          style={styles.editBtn}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Ionicons name="create-outline" size={18} color={colors.navy} />
        </Pressable>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <Avatar name={fullName} size={72} />
        )}
        <Text style={styles.name}>{fullName}</Text>
        {s.email ? <Text style={styles.email}>{s.email}</Text> : null}
        <View style={styles.pills}>
          <Pill label={enr ? "Enrolled" : "Self-tracked"} tone={enr ? "navy" : "blue"} />
          {s.status ? <Pill label={cap(s.status)} tone="gold" /> : null}
        </View>
      </Card>

      {/* Academic — enrolled students only */}
      {enr ? <AcademicCard enr={enr} /> : <SelfClassCard gradeLevel={s.grade_level} />}

      <Section title="Personal" icon="person-outline">
        <InfoRow label="Full name" value={fullName} />
        <InfoRow label="Gender" value={s.gender ? cap(s.gender) : null} />
        <InfoRow label="Date of birth" value={fmtDate(s.date_of_birth)} />
        <InfoRow label="Blood group" value={s.blood_group} />
        <InfoRow label="Height" value={s.height ? `${s.height} cm` : null} />
        <InfoRow label="Weight" value={s.weight ? `${s.weight} kg` : null} last />
      </Section>

      <Section title="Contact" icon="call-outline">
        <InfoRow label="Email" value={s.email} />
        <InfoRow label="Phone" value={s.phone} />
        <InfoRow label="Alternate phone" value={s.alternate_phone} />
        <InfoRow label="Address" value={s.address} />
        <InfoRow label="City / State" value={location || null} />
        <InfoRow label="Postal code" value={s.postal_code} last />
      </Section>

      {hasFamily(s) ? (
        <Section title="Family" icon="people-outline">
          <InfoRow label="Father" value={s.father_name} />
          <InfoRow label="Mother" value={s.mother_name} />
          <InfoRow label="Guardian" value={s.guardian_name} />
          <InfoRow label="Guardian phone" value={s.guardian_phone} />
          <InfoRow label="Guardian email" value={s.guardian_email} last />
        </Section>
      ) : null}

      {s.consultant_name || s.consultant_email ? (
        <Section title="Consultant" icon="briefcase-outline">
          <InfoRow label="Name" value={s.consultant_name} />
          <InfoRow label="Email" value={s.consultant_email} last />
        </Section>
      ) : null}

      <Text style={styles.note}>Tap the pencil to update your photo and contact details.</Text>
    </ScrollView>
  );
}

function AcademicCard({ enr }: { enr: ProfileEnrollment }) {
  const dispute = useDisputeEnrollment();

  function onDispute() {
    Alert.alert(
      "Dispute this enrollment?",
      "Use this only if a school added you by mistake. Your own tracked data stays yours, and the school will be flagged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Dispute",
          style: "destructive",
          onPress: () =>
            dispute.mutate(enr.enrollment_id, {
              onSuccess: () =>
                Alert.alert(
                  "Enrollment disputed",
                  "Your school has been flagged, and your own data is unaffected.",
                ),
              onError: (e) =>
                Alert.alert(
                  "Couldn't dispute",
                  e instanceof Error ? e.message : "Please try again.",
                ),
            }),
        },
      ],
    );
  }

  return (
    <Section title="Academic" icon="school-outline">
      <InfoRow label="School" value={enr.school_name} />
      <InfoRow label="Class" value={enr.class_name} />
      <InfoRow label="Section" value={enr.section_name} />
      <InfoRow label="Roll number" value={enr.roll_number} />
      <InfoRow label="Session" value={enr.session_name} last />
      {enr.can_dispute ? (
        <View style={{ marginTop: spacing.md }}>
          <Button
            label={dispute.isPending ? "Disputing…" : "This isn't my school"}
            variant="ghost"
            loading={dispute.isPending}
            onPress={onDispute}
          />
        </View>
      ) : null}
    </Section>
  );
}

function SelfClassCard({ gradeLevel }: { gradeLevel: number | null }) {
  return (
    <Section title="Academic" icon="school-outline">
      <InfoRow
        label="Class"
        value={gradeLevel != null ? `Class ${gradeLevel}` : null}
        last
      />
    </Section>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={15} color={colors.textMuted} />
        <Text style={styles.sectionH}>{title}</Text>
      </View>
      <Card style={styles.list}>{children}</Card>
    </>
  );
}

function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string | number | null | undefined;
  last?: boolean;
}) {
  const shown = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{shown}</Text>
    </View>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** DOB may arrive as a full ISO timestamp — keep only the date part. */
function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return longDate(iso.slice(0, 10));
}

function hasFamily(s: StudentProfile): boolean {
  return !!(s.father_name || s.mother_name || s.guardian_name || s.guardian_phone || s.guardian_email);
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  header: { alignItems: "center", gap: spacing.xs },
  editBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: palette.primary50,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  photo: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.card },
  name: { ...typography.h1, color: colors.ink, marginTop: spacing.sm, textAlign: "center" },
  email: { ...typography.body, color: colors.textMuted },
  pills: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionH: { ...typography.label, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },

  list: { padding: 0, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.body, color: colors.textMuted, flexShrink: 0 },
  rowValue: { ...typography.body, color: colors.ink, fontWeight: "600", flex: 1, textAlign: "right" },

  note: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.md, paddingHorizontal: spacing.lg },
});
