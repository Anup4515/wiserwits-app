import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  RefreshControl,
  View,
  Pressable,
  Text,
  ActivityIndicator,
} from "react-native";

import { useHealth, useBmiHistory, toBmiRecord } from "@/api/hooks";
import { QueryView } from "@/components/QueryView";
import { BmiCard, BmiHistory } from "@/features/health/sections";
import { colors, spacing, typography } from "@/theme";

/**
 * BMI screen — latest reading + trend (from the `/health` overview) and the
 * full reading history (from the cursor-paginated `/bmi`).
 *
 * The history deliberately does NOT come from `/health`: that endpoint is an
 * overview and returns a capped preview, so anything older than the cap used to
 * be unreachable. `/bmi` pages properly, and older readings load on demand.
 */
export default function BmiScreen() {
  const overview = useHealth();
  const history = useBmiHistory();

  const records = useMemo(
    () => history.query.data?.pages.flatMap((p) => p.items.map(toBmiRecord)) ?? [],
    [history.query.data]
  );

  const refreshing =
    overview.query.isRefetching ||
    (history.query.isRefetching && !history.query.isFetchingNextPage);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void overview.query.refetch();
            void history.query.refetch();
          }}
        />
      }
    >
      <QueryView result={overview} feature="student.health">
        {(data) => <BmiCard data={data} />}
      </QueryView>

      {records.length > 0 ? <BmiHistory records={records} /> : null}

      {/*
        A "Load older" button rather than onEndReached: this screen is a
        ScrollView (the BMI card and the history share one scroll surface), so
        there is no list-level end event to hook. Explicit and predictable —
        history is browsed occasionally, not scrolled endlessly like the feed.
      */}
      {history.query.hasNextPage ? (
        <Pressable
          onPress={() => {
            if (!history.query.isFetchingNextPage) void history.query.fetchNextPage();
          }}
          disabled={history.query.isFetchingNextPage}
          style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}
        >
          {history.query.isFetchingNextPage ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <Text style={styles.moreText}>Load older readings</Text>
          )}
        </Pressable>
      ) : null}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.lg, gap: spacing.lg },
  more: { paddingVertical: spacing.md, alignItems: "center" },
  moreText: { ...typography.label, color: colors.navy },
});
