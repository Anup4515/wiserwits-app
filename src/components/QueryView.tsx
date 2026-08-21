import type { ReactNode } from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";

import { LoadingState, ErrorState, LockGate } from "@/components/data-ui";
import type { SourceQueryResult, SourceInfiniteQueryResult } from "@/api/query";
import type { Source, Paged } from "@/api/student-types";
import { colors, spacing, typography } from "@/theme";

/**
 * Renders the standard lock / loading / error boundary around a source query,
 * calling `children` only once real data is present. Keeps every read screen
 * from re-implementing the same four states (plan §11).
 */
export function QueryView<T>({
  result,
  feature,
  loadingLabel,
  children,
}: {
  result: SourceQueryResult<T>;
  /** Feature key to show in the upsell when the resource is plan-locked. */
  feature?: string;
  loadingLabel?: string;
  children: (data: T, source: Source) => ReactNode;
}) {
  if (result.locked) return <LockGate feature={feature ?? "this"} />;

  const { data, isLoading, isError, error, refetch } = result.query;
  if (isLoading) return <LoadingState label={loadingLabel} />;
  if (isError || data === undefined) {
    return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />;
  }
  return <>{children(data, result.source)}</>;
}

/**
 * `QueryView` for a paginated list.
 *
 * Flattens every loaded page into one array, applies the same lock / loading /
 * error boundary, and renders a "Load more" control underneath. Callers get a
 * plain array and can keep rendering exactly as they did before pagination.
 *
 * A button rather than infinite scroll because these screens are ScrollViews
 * (a list shares its scroll surface with headers, tabs and summary cards), so
 * there is no list-level end event to hook. The Feed, which IS a FlatList,
 * scrolls infinitely instead.
 */
export function QueryListView<T>({
  result,
  feature,
  loadingLabel,
  loadMoreLabel = "Load more",
  children,
}: {
  result: SourceInfiniteQueryResult<Paged<T>>;
  feature?: string;
  loadingLabel?: string;
  loadMoreLabel?: string;
  children: (items: T[], source: Source) => ReactNode;
}) {
  if (result.locked) return <LockGate feature={feature ?? "this"} />;

  const { data, isLoading, isError, error, refetch } = result.query;
  if (isLoading) return <LoadingState label={loadingLabel} />;
  if (isError || data === undefined) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  const items = data.pages.flatMap((p) => p.items);
  return (
    <>
      {children(items, result.source)}
      <LoadMoreRow query={result.query} label={loadMoreLabel} />
    </>
  );
}

/** Shared "Load more" footer for any infinite query. Renders nothing when done. */
export function LoadMoreRow({
  query,
  label = "Load more",
}: {
  query: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
  label?: string;
}) {
  if (!query.hasNextPage) return null;
  return (
    <Pressable
      onPress={() => {
        if (!query.isFetchingNextPage) void query.fetchNextPage();
      }}
      disabled={query.isFetchingNextPage}
      style={({ pressed }) => [loadMoreStyles.btn, pressed && { opacity: 0.6 }]}
    >
      {query.isFetchingNextPage ? (
        <ActivityIndicator color={colors.navy} />
      ) : (
        <Text style={loadMoreStyles.text}>{label}</Text>
      )}
    </Pressable>
  );
}

const loadMoreStyles = StyleSheet.create({
  btn: { paddingVertical: spacing.md, alignItems: "center" },
  text: { ...typography.label, color: colors.navy },
});
