import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File as FsFile } from "expo-file-system";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import { useProfile, useUpdateProfile, useUploadProfileImage, type ProfileUpdate } from "@/api/hooks";
import { useAuth } from "@/auth/AuthContext";
import { Button, Field, Avatar } from "@/components/ui";
import { AuthedImage } from "@/components/AuthedImage";
import { LoadingState, ErrorState } from "@/components/data-ui";
import { mediumDate } from "@/lib/format";
import { colors, spacing, radius, typography } from "@/theme";
import type { StudentProfile } from "@/api/student-types";
import { resolveFileUrl } from "@/lib/download";

/**
 * Edit profile. The text fields mirror the backend's ALLOWED_FIELDS exactly —
 * anything not in that server-side list is silently ignored by POST /profile,
 * so the two must stay in step.
 *
 * Height and weight are deliberately absent: they are a snapshot mirrored from
 * the student's latest BMI reading (POST /api/student/bmi writes both stores),
 * so an editable copy here would just disagree with the BMI chart. The screen
 * points at Log BMI instead.
 */

interface TextFieldSpec {
  key: keyof EditFormValues;
  label: string;
  keyboard?: "phone-pad";
  /** Blank is a validation error — the column is NOT NULL server-side. */
  required?: boolean;
}

const PERSONAL_FIELDS: TextFieldSpec[] = [
  { key: "first_name", label: "First name", required: true },
  { key: "middle_name", label: "Middle name" },
  { key: "last_name", label: "Last name", required: true },
  { key: "blood_group", label: "Blood group" },
];

const CONTACT_FIELDS: TextFieldSpec[] = [
  { key: "phone", label: "Phone", keyboard: "phone-pad" },
  { key: "alternate_phone", label: "Alternate phone", keyboard: "phone-pad" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "postal_code", label: "Postal code" },
];

const TEXT_FIELDS = [...PERSONAL_FIELDS, ...CONTACT_FIELDS];

/** Fields that read as prose and should capitalise each word as you type. */
const WORD_CASED = new Set<keyof EditFormValues>([
  "first_name",
  "middle_name",
  "last_name",
  "address",
  "city",
  "state",
  "country",
]);

interface EditFormValues {
  first_name: string;
  middle_name: string;
  last_name: string;
  blood_group: string;
  phone: string;
  alternate_phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

function formFrom(s: StudentProfile): EditFormValues {
  return {
    first_name: s.first_name ?? "",
    middle_name: s.middle_name ?? "",
    last_name: s.last_name ?? "",
    blood_group: s.blood_group ?? "",
    phone: s.phone ?? "",
    alternate_phone: s.alternate_phone ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    state: s.state ?? "",
    country: s.country ?? "",
    postal_code: s.postal_code ?? "",
  };
}

/**
 * Date <-> "YYYY-MM-DD" using LOCAL calendar parts, never `toISOString()`.
 *
 * The picker hands back local midnight; in IST (UTC+5:30) `toISOString()` on
 * that is 18:30 the PREVIOUS day, so a round-trip through UTC would walk a
 * date of birth backwards by one day on every save.
 */
function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export default function ProfileEdit() {
  const { data, isLoading, isError, error, refetch } = useProfile();

  if (isLoading) return <LoadingState label="Loading profile…" />;
  if (isError || !data) {
    return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />;
  }
  return <EditForm student={data.student} independent={data.enrollment == null} />;
}

function EditForm({ student, independent }: { student: StudentProfile; independent: boolean }) {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const initial = useMemo(() => formFrom(student), [student]);
  const [form, setForm] = useState<EditFormValues>(initial);
  const [grade, setGrade] = useState<number | null>(student.grade_level);

  // DOB may arrive as a full ISO timestamp; the form carries the date half only.
  const initialDob = useMemo(() => (student.date_of_birth ?? "").slice(0, 10), [student.date_of_birth]);
  const [dob, setDob] = useState<string>(initialDob);
  const [showIosDob, setShowIosDob] = useState(false);

  const update = useUpdateProfile();
  const uploadImage = useUploadProfileImage();

  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
  const photo = resolveFileUrl(student.profile_image);

  const missingRequired = PERSONAL_FIELDS.filter(
    (f) => f.required && form[f.key].trim() === ""
  ).map((f) => f.label);

  const dirty =
    TEXT_FIELDS.some(({ key }) => form[key] !== initial[key]) ||
    dob !== initialDob ||
    (independent && grade !== student.grade_level);

  const set = (key: keyof EditFormValues, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Android has no inline date display, so open the native dialog; iOS toggles
  // a spinner below the row (matching book-consultation).
  const openDobPicker = () => {
    if (Platform.OS !== "android") {
      setShowIosDob((s) => !s);
      return;
    }
    DateTimePickerAndroid.open({
      value: fromIsoDate(dob) ?? new Date(2010, 0, 1),
      mode: "date",
      maximumDate: new Date(),
      onChange: (event, picked) => {
        if (event.type !== "set" || !picked) return;
        setDob(toIsoDate(picked));
      },
    });
  };

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to change the profile photo.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    const fd = new FormData();
    // SDK 56+ installs `expo/fetch` as the global fetch, and its multipart
    // encoder refuses React Native's proprietary `{ uri, name, type }` part —
    // "`uri` is not supported for React Native's FormData". It reads a part's
    // bytes from a Blob (or anything exposing `bytes()`), so hand it an
    // expo-file-system `File`, which implements Blob and carries the `name` and
    // `type` the part headers need (the backend maps that content type to a
    // stored extension, and Next.js only parses a part as a file when a
    // filename is present). Sending the old shape now throws inside `doFetch`,
    // where the catch-all would mislabel it "Network error. Please try again."
    fd.append("file", new FsFile(asset.uri) as unknown as Blob);
    uploadImage.mutate(fd, {
      onError: (e) => Alert.alert("Upload failed", e.message),
    });
  }

  function save() {
    if (missingRequired.length > 0) {
      Alert.alert("Missing details", `${missingRequired.join(" and ")} can't be blank.`);
      return;
    }

    // Send only what changed. Empty strings clear a field (the backend accepts
    // null/empty for the optional fields).
    const payload: ProfileUpdate = {};
    for (const { key } of TEXT_FIELDS) {
      if (form[key] !== initial[key]) payload[key] = form[key];
    }
    if (dob !== initialDob) payload.date_of_birth = dob;
    if (independent && grade !== student.grade_level) payload.grade_level = grade;

    const nameChanged = PERSONAL_FIELDS.some(
      (f) => f.key !== "blood_group" && form[f.key] !== initial[f.key]
    );

    update.mutate(payload, {
      onSuccess: async () => {
        // The stored session user carries the name shown in the home header and
        // the account switcher, and neither reads the profile query. Re-issue
        // the claims so a rename is visible everywhere, not just on this screen.
        if (nameChanged) await refreshSession();
        router.back();
      },
      onError: (e) => Alert.alert("Couldn't save", e.message),
    });
  }

  const dobLabel = dob ? mediumDate(dob) : "Not set";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Photo */}
        <View style={styles.photoWrap}>
          <Pressable onPress={pickPhoto} disabled={uploadImage.isPending} style={styles.photoPress}>
            {photo ? (
              <AuthedImage
                uri={photo}
                style={styles.photo}
                fallback={<Avatar name={fullName || "?"} size={96} />}
              />
            ) : (
              <Avatar name={fullName || "?"} size={96} />
            )}
            <View style={styles.photoBadge}>
              {uploadImage.isPending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons name="camera" size={16} color={colors.textInverse} />
              )}
            </View>
          </Pressable>
          <Text style={styles.photoHint}>
            {uploadImage.isPending ? "Uploading…" : "Tap to change photo"}
          </Text>
        </View>

        {/* Personal */}
        <Text style={styles.sectionH}>Personal</Text>
        {PERSONAL_FIELDS.map(({ key, label, required }) => (
          <Field
            key={key}
            label={required ? `${label} *` : label}
            value={form[key]}
            onChangeText={(v) => set(key, v)}
            autoCapitalize={WORD_CASED.has(key) ? "words" : "characters"}
            placeholder={key === "blood_group" ? "e.g. O+" : `Add ${label.toLowerCase()}`}
            error={required && form[key].trim() === "" ? `${label} is required` : undefined}
          />
        ))}

        {/* Date of birth */}
        <View style={styles.dobWrap}>
          <Text style={styles.fieldLabel}>Date of birth</Text>
          <Pressable onPress={openDobPicker} style={styles.dobRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.dobText, !dob && styles.dobPlaceholder]}>{dobLabel}</Text>
            {dob ? (
              <Pressable onPress={() => setDob("")} hitSlop={8} accessibilityLabel="Clear date of birth">
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : (
              <Ionicons
                name={showIosDob ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            )}
          </Pressable>
        </View>

        {Platform.OS === "ios" && showIosDob ? (
          <View style={styles.iosPickerWrap}>
            <DateTimePicker
              value={fromIsoDate(dob) ?? new Date(2010, 0, 1)}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_e, picked) => {
                if (picked) setDob(toIsoDate(picked));
              }}
            />
          </View>
        ) : null}

        {/* Height/weight live in the BMI log, not here — keep the two in sync by
            sending the student to the one place that writes both. */}
        <Pressable style={styles.bmiRow} onPress={() => router.push("/log-bmi")}>
          <Ionicons name="fitness-outline" size={18} color={colors.navy} />
          <Text style={styles.bmiText}>
            {student.height && student.weight
              ? `Height ${student.height} cm · Weight ${student.weight} kg`
              : "Height and weight not recorded"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.bmiHint}>Update these by logging a new BMI reading.</Text>

        {/* Contact */}
        <Text style={styles.sectionH}>Contact</Text>
        {CONTACT_FIELDS.map(({ key, label, keyboard }) => (
          <Field
            key={key}
            label={label}
            value={form[key]}
            onChangeText={(v) => set(key, v)}
            keyboardType={keyboard}
            autoCapitalize={WORD_CASED.has(key) ? "words" : "none"}
            placeholder={`Add ${label.toLowerCase()}`}
          />
        ))}

        {/* Grade — independent students self-declare their class */}
        {independent ? (
          <View style={styles.gradeWrap}>
            <Text style={styles.fieldLabel}>Class</Text>
            <View style={styles.gradeGrid}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                const active = grade === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setGrade(active ? null : n)}
                    style={[styles.gradeChip, active && styles.gradeChipActive]}
                  >
                    <Text style={[styles.gradeChipText, active && styles.gradeChipTextActive]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.gradeHint}>Tap your class (1–12). Tap again to clear.</Text>
          </View>
        ) : null}

        {!independent ? (
          <Text style={styles.schoolNote}>
            Your school keeps these details on file too. If you change your name
            or date of birth here, ask them to update their record so your report
            card matches.
          </Text>
        ) : null}

        <View style={{ height: spacing.md }} />
        <Button
          label={update.isPending ? "Saving…" : "Save changes"}
          onPress={save}
          loading={update.isPending}
          disabled={!dirty || update.isPending || missingRequired.length > 0}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  photoWrap: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  photoPress: { position: "relative" },
  photo: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.card },
  photoBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  photoHint: { ...typography.caption, color: colors.textMuted },

  sectionH: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  fieldLabel: { ...typography.label, color: colors.text, marginBottom: 6 },

  dobWrap: { gap: 0 },
  dobRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  dobText: { ...typography.body, color: colors.ink, flex: 1 },
  dobPlaceholder: { color: "#94a3b8" },
  iosPickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    overflow: "hidden",
  },

  bmiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  bmiText: { ...typography.body, color: colors.ink, flex: 1 },
  bmiHint: { ...typography.caption, color: colors.textMuted, marginTop: -spacing.xs },

  gradeWrap: { gap: 6 },
  gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  gradeChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  gradeChipText: { ...typography.h2, fontSize: 15, color: colors.ink },
  gradeChipTextActive: { color: colors.textInverse },
  gradeHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  schoolNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
