import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useEnrollment } from "@/features/enrollment/EnrollmentContext";
import { isFeatureLocked, type FeatureKey } from "@/lib/features";
import type { Source } from "@/api/student-types";

/** Append a query string (skipping undefined/null values) to a path. */
export function withParams(
  path: string,
  params?: Record<string, string | number | undefined | null>
): string {
  if (!params) return path;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `${path}?${qs}` : path;
}

/** Low-level query: unwrap the `{ data }` envelope, throw on `{ error }`. */
export function useApiQuery<T>(
  key: unknown[],
  path: string,
  enabled = true
): UseQueryResult<T> {
  return useQuery<T>({
    queryKey: key,
    enabled,
    queryFn: async () => {
      const res = await api.get<T>(path);
      if (res.error) throw new Error(res.error);
      return res.data as T;
    },
  });
}

export interface SourceQueryResult<T> {
  query: UseQueryResult<T>;
  source: Source;
  /** True when the enrolled feature is plan-locked — the query is disabled. */
  locked: boolean;
}

/**
 * Source-aware academic query. Resolves enrolled-vs-self, appends the
 * `?enrollment_id=` history override on enrolled routes, folds source +
 * override + active account into the cache key, and disables the fetch when the
 * feature is plan-locked (so we never call a known-locked endpoint, plan §11).
 *
 * `build` returns the source-specific path and extra params, because enrolled
 * and self endpoints diverge in both (e.g. `/marks?exam_id=` vs
 * `/self/exam-marks?exam=`).
 */
export function useSourceQuery<T>(opts: {
  /** Stable cache-key root, e.g. "attendance". */
  key: string;
  /** Feature key for gating; omit for always-allowed resources. */
  feature?: FeatureKey;
  /** Build the request for the resolved source. */
  build: (source: Source) => {
    path: string;
    params?: Record<string, string | number | undefined | null>;
  };
  /** Extra cache-key parts (month, exam ref, …). */
  keyExtra?: unknown[];
  /** Gate the fetch on an external condition (e.g. an exam being selected). */
  enabled?: boolean;
}): SourceQueryResult<T> {
  const { user, activeStudentId } = useAuth();
  const { source, enrollmentId } = useEnrollment();

  const locked = opts.feature ? isFeatureLocked(user, opts.feature) : false;

  const built = opts.build(source);
  // On enrolled routes, thread the history override (null = server active).
  const params =
    source === "enrolled" && enrollmentId != null
      ? { ...built.params, enrollment_id: enrollmentId }
      : built.params;

  const path = withParams(built.path, params);
  const key = [
    opts.key,
    activeStudentId,
    source,
    source === "enrolled" ? enrollmentId : null,
    ...(opts.keyExtra ?? []),
  ];

  const enabled = (opts.enabled ?? true) && !locked && activeStudentId != null;
  const query = useApiQuery<T>(key, path, enabled);
  return { query, source, locked };
}

/** A page shape that carries its own "next page" cursor. */
export interface CursorPage {
  nextCursor: string | null;
}

export interface SourceInfiniteQueryResult<T extends CursorPage> {
  query: UseInfiniteQueryResult<InfiniteData<T>, Error>;
  source: Source;
  locked: boolean;
}

/**
 * Cursor-paginated sibling of `useSourceQuery`.
 *
 * Same source/feature/cache-key behaviour; the difference is that the endpoint
 * returns one PAGE plus a `nextCursor`, and successive pages are requested by
 * feeding that cursor back as `cursorParam`. `nextCursor: null` ends the list.
 *
 * Use this for any list that grows without bound — a plain `useSourceQuery`
 * silently shows whatever the server's default page size happens to be, with
 * no way for the user to reach anything older.
 */
export function useSourceInfiniteQuery<T extends CursorPage>(opts: {
  /** Stable cache-key root, e.g. "feed". */
  key: string;
  /** Feature key for gating; omit for always-allowed resources. */
  feature?: FeatureKey;
  /** Build the request for the resolved source. */
  build: (source: Source) => {
    path: string;
    params?: Record<string, string | number | undefined | null>;
  };
  /** Query-param name carrying the cursor (e.g. "before"). */
  cursorParam: string;
  /** Extra cache-key parts. */
  keyExtra?: unknown[];
  /** Gate the fetch on an external condition. */
  enabled?: boolean;
}): SourceInfiniteQueryResult<T> {
  const { user, activeStudentId } = useAuth();
  const { source, enrollmentId } = useEnrollment();

  const locked = opts.feature ? isFeatureLocked(user, opts.feature) : false;

  const built = opts.build(source);
  const params =
    source === "enrolled" && enrollmentId != null
      ? { ...built.params, enrollment_id: enrollmentId }
      : built.params;

  // Same key shape as useSourceQuery so an `invalidate: [["feed"]]` prefix
  // match still reaches this query.
  const key = [
    opts.key,
    activeStudentId,
    source,
    source === "enrolled" ? enrollmentId : null,
    ...(opts.keyExtra ?? []),
  ];

  const enabled = (opts.enabled ?? true) && !locked && activeStudentId != null;

  const query = useInfiniteQuery<T, Error, InfiniteData<T>, unknown[], string | null>({
    queryKey: key,
    enabled,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const path = withParams(built.path, {
        ...params,
        [opts.cursorParam]: pageParam ?? undefined,
      });
      const res = await api.get<T>(path);
      if (res.error) throw new Error(res.error);
      return res.data as T;
    },
    // null ends pagination — TanStack treats null/undefined as "no next page".
    getNextPageParam: (last) => last.nextCursor,
  });

  return { query, source, locked };
}
