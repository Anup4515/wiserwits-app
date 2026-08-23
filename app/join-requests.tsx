import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";

import { useJoinRequests, useApproveEnrollment, useDeclineEnrollment } from "@/api/hooks";
import { Button, Card } from "@/components/ui";
import { EmptyState } from "@/components/data-ui";
import { colors, spacing } from "@/theme";
import type { EnrollmentRow } from "@/api/student-types";

/**
 * Join requests — schools asking to add this student. Shown for INDEPENDENT
 * students too (that's who gets requests), so it fetches enrollments directly
 * rather than through the source-gated useEnrollments. Approve → the pending
 * enrollment becomes active (the school manages their data); decline → rejected.
 */
export default function JoinRequestsScreen() {
  const q = useJoinRequests();
  const approve = useApproveEnrollment();
  const decline = useDeclineEnrollment();

  const pending = (q.data ?? []).filter((r) => r.status === "pending");
  const acting = approve.isPending
    ? approve.variables
    : decline.isPending
      ? decline.variables
      : null;

  function onApprove(r: EnrollmentRow) {
    Alert.alert(
      "Join this school?",
      `${r.partner_name || "This school"} will manage your school data (attendance, marks, and more). Your own tracked data always stays yours.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve & join",
          onPress: () =>
            approve.mutate(r.enrollment_id, {
              onError: (e) =>
                Alert.alert("Couldn't approve", e instanceof Error ? e.message : "Please try again."),
            }),
        },
      ],
    );
  }

  function onDecline(r: EnrollmentRow) {
    Alert.alert(
      "Decline request?",
      `Decline ${r.partner_name || "this school"}'s request to add you? Nothing changes for you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () =>
            decline.mutate(r.enrollment_id, {
              onError: (e) =>
                Alert.alert("Couldn't decline", e instanceof Error ? e.message : "Please try again."),
            }),
        },
      ],
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />}
    >
      {q.isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      ) : q.isError ? (
        <Card>
          <EmptyState icon="alert-circle-outline" title="Couldn't load requests" subtitle="Pull down to refresh." />
        </Card>
      ) : pending.length === 0 ? (
        <Card>
          <EmptyState
            icon="people-outline"
            title="No join requests"
            subtitle="When a school asks to add you, it'll show up here to approve or decline."
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {pending.map((r) => (
            <Card key={r.enrollment_id}>
              <Text style={styles.title}>{r.partner_name || "A school"} wants to add you</Text>
              <Text style={styles.sub}>
                {r.class_name} - {r.section_name} · {r.session_name}
              </Text>
              <Text style={styles.note}>
                Approve to let them manage your school data. Your own tracked data always stays yours.
                Until you approve, nothing changes.
              </Text>
              <View style={styles.actions}>
                <View style={styles.actionBtn}>
                  <Button
                    label="Decline"
                    variant="ghost"
                    onPress={() => onDecline(r)}
                    disabled={acting === r.enrollment_id}
                  />
                </View>
                <View style={styles.actionBtn}>
                  <Button
                    label="Approve & join"
                    onPress={() => onApprove(r)}
                    loading={acting === r.enrollment_id}
                  />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  sub: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  note: { marginTop: spacing.sm, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { minWidth: 120 },
});
