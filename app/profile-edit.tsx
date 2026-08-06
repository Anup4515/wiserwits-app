import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useProfile, useUpdateProfile, useUploadProfileImage, type ProfileUpdate } from "@/api/hooks";
import { Button, Field, Avatar } from "@/components/ui";
import { LoadingState, ErrorState } from "@/components/data-ui";
import { env } from "@/lib/env";
import { colors, palette, spacing, radius, typography } from "@/theme";
import type { StudentProfile } from "@/api/student-types";

// The text fields a student can edit (mirrors the backend's ALLOWED_FIELDS).
const FIELDS: { key: keyof EditForm; label: string; keyboard?: "phone-pad" }[] = [
  { key: "phone", label: "Phone", keyboard: "phone-pad" },
  { key: "alternate_phone", label: "Alternate phone", keyboard: "phone-pad" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "postal_code", label: "Postal code" },
];

interface EditForm {
  phone: string;
  alternate_phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

function formFrom(s: StudentProfile): EditForm {
  return {
    phone: s.phone ?? "",
    alternate_phone: s.alternate_phone ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    state: s.state ?? "",
    country: s.country ?? "",
    postal_code: s.postal_code ?? "",
  };
}

/** Absolute URL for the stored (relative) profile image path. */
function imageUrl(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${env.apiBaseUrl}${path}`;
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
  const initial = useMemo(() => formFrom(student), [student]);
  const [form, setForm] = useState<EditForm>(initial);
  const [grade, setGrade] = useState<number | null>(student.grade_level);

  const update = useUpdateProfile();
  const uploadImage = useUploadProfileImage();

  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
  const photo = imageUrl(student.profile_image);

  const dirty =
    FIELDS.some(({ key }) => form[key] !== initial[key]) ||
    (independent && grade !== student.grade_level);

  const set = (key: keyof EditForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

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
    fd.append("file", {
      uri: asset.uri,
      name: asset.fileName ?? "photo.jpg",
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob);
    uploadImage.mutate(fd, {
      onError: (e) => Alert.alert("Upload failed", e.message),
    });
  }

  function save() {
    // Send only what changed. Empty strings clear a field (the backend accepts
    // null/empty for the optional contact fields).
    const payload: ProfileUpdate = {};
    for (const { key } of FIELDS) {
      if (form[key] !== initial[key]) payload[key] = form[key];
    }
    if (independent && grade !== student.grade_level) payload.grade_level = grade;

    update.mutate(payload, {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert("Couldn't save", e.message),
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Photo */}
        <View style={styles.photoWrap}>
          <Pressable onPress={pickPhoto} disabled={uploadImage.isPending} style={styles.photoPress}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
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

        {/* Contact fields */}
        {FIELDS.map(({ key, label, keyboard }) => (
          <Field
            key={key}
            label={label}
            value={form[key]}
            onChangeText={(v) => set(key, v)}
            keyboardType={keyboard}
            autoCapitalize={key === "address" || key === "city" || key === "state" || key === "country" ? "words" : "none"}
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

        <View style={{ height: spacing.md }} />
        <Button
          label={update.isPending ? "Saving…" : "Save changes"}
          onPress={save}
          loading={update.isPending}
          disabled={!dirty || update.isPending}
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

  fieldLabel: { ...typography.label, color: colors.text, marginBottom: 6 },

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
});
