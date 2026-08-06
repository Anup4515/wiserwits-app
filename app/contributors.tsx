import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useRouter, Redirect } from "expo-router";

import { useContributors, useRevokeContributor } from "@/api/hooks";
import { useAuth } from "@/auth/AuthContext";
import { Button, Card, Pill } from "@/components/ui";
import { QueryView } from "@/components/QueryView";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing, radius, typography } from "@/theme";
import type { ContributorGrant, GrantRelationship } from "@/api/student-types";

/**
 * Contributors (access grants) — the people who may fill this student's
 * self-tracked data (parents, tutors, mentors). Only meaningful for
 * INDEPENDENT students: an enrolled student's records come from their school,
 * so the backend rejects invites with a 403. When enrolled we swap the invite
 * CTA for an explainer.
 */
export default function ContributorsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const enrolled = user?.enrollment_id != null;

  const result = useContributors();
  const { query } = result;
  const revoke = useRevokeContributor();

  // Contributors are an independent-student feature. An enrolled student's data
  // comes from the school (partner portal), so this screen isn't for them —
  // bounce back if it's reached directly (there are no links to it when
  // enrolled).
  if (enrolled) return <Redirect href="/(tabs)" />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
    >
      <Button
        label="Invite a contributor"
        onPress={() => router.push("/invite-contributor")}
      />

      <QueryView result={result}>
        {(grants) =>
          grants.length === 0 ? (
            <Card>
              <EmptyState
                icon="people-outline"
                title="No contributors yet"
                subtitle="Invite a parent, tutor or mentor to help keep self-tracked data up to date."
              />
            </Card>
          ) : (
            <View style={{ gap: spacing.md }}>
              {grants.map((g) => (
                <GrantCard
                  key={g.id}
                  grant={g}
                  onRemove={() => revoke.mutate(g.id)}
                  removing={revoke.isPending && revoke.variables === g.id}
                />
              ))}
            </View>
          )
        }
      </QueryView>
    </ScrollView>
  );
}

const RELATIONSHIP_LABEL: Record<GrantRelationship, string> = {
  self: "Self",
  parent: "Parent",
  class_teacher: "Class teacher",
  tuition_teacher: "Tuition teacher",
  mentor: "Mentor",
};

const SCOPES: { key: keyof ContributorGrant; label: string }[] = [
  { key: "scope_attendance", label: "Attendance" },
  { key: "scope_marks", label: "Marks" },
  { key: "scope_timetable", label: "Timetable" },
  { key: "scope_holistic", label: "Holistic" },
];

function statusTone(status: string): { tone: "amber" | "green" | "red"; label: string } {
  const s = status.toLowerCase();
  if (s === "active" || s === "accepted") return { tone: "green", label: "Active" };
  if (s === "revoked" || s === "expired") return { tone: "red", label: s === "expired" ? "Expired" : "Revoked" };
  return { tone: "amber", label: "Invited" };
}

function GrantCard({
  grant,
  onRemove,
  removing,
}: {
  grant: ContributorGrant;
  onRemove: () => void;
  removing: boolean;
}) {
  const title = grant.contributor_name || grant.invite_name || grant.invite_email;
  const status = statusTone(grant.status);
  const canRemove = status.tone !== "red";
  const scopes = SCOPES.filter((s) => grant[s.key] === 1);

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Pill label={status.label} tone={status.tone} />
      </View>

      {grant.invite_email && title !== grant.invite_email ? (
        <Text style={styles.email}>{grant.invite_email}</Text>
      ) : null}

      <View style={styles.pillRow}>
        <Pill label={RELATIONSHIP_LABEL[grant.relationship]} tone="navy" />
      </View>

      {scopes.length > 0 ? (
        <View style={styles.chipRow}>
          {scopes.map((s) => (
            <View key={s.key} style={styles.chip}>
              <Text style={styles.chipText}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {canRemove ? (
        <Button label="Remove" variant="ghost" loading={removing} onPress={onRemove} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },


  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h2, fontSize: 15, color: colors.ink, flex: 1 },
  email: { ...typography.caption, color: colors.textMuted, marginTop: -spacing.sm },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
});
