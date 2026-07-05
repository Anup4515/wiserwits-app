import type { ReactNode } from "react";

import { LoadingState, ErrorState, LockGate } from "@/components/data-ui";
import type { SourceQueryResult } from "@/api/query";
import type { Source } from "@/api/student-types";

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
