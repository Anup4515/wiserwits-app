import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { api } from "@/api/client";

/**
 * Write helper — the mutation counterpart to `useApiQuery` (Phase 3 introduces
 * the app's first writes: submit assignment, log BMI, ask advice, book
 * consultation, invite contributor).
 *
 * Mirrors the query side: calls the shared `api` client (Bearer + single-flight
 * 401 refresh), unwraps the `{ data }` envelope, and THROWS on `{ error }` so
 * TanStack surfaces it as `mutation.error`. On success it invalidates the given
 * query-key ROOTS — TanStack matches by prefix, so `["assignments"]` refreshes
 * every `["assignments", activeStudentId, …]` entry regardless of account.
 */
type Method = "post" | "patch" | "delete";

export function useApiMutation<TData = unknown, TVars = void>(opts: {
  method?: Method;
  /** Static path, or derived from the variables (e.g. an id in the URL). */
  path: string | ((vars: TVars) => string);
  /** Build the request body from the variables (omit for DELETE / no body). */
  body?: (vars: TVars) => unknown;
  /** Query-key roots to invalidate on success (prefix match). */
  invalidate?: readonly unknown[][];
  onSuccess?: (data: TData, vars: TVars) => void;
}): UseMutationResult<TData, Error, TVars> {
  const qc = useQueryClient();
  const method = opts.method ?? "post";

  return useMutation<TData, Error, TVars>({
    mutationFn: async (vars: TVars) => {
      const path = typeof opts.path === "function" ? opts.path(vars) : opts.path;
      const body = opts.body ? opts.body(vars) : undefined;
      const res =
        method === "delete"
          ? await api.delete<TData>(path)
          : method === "patch"
            ? await api.patch<TData>(path, body)
            : await api.post<TData>(path, body);
      if (res.error) throw new Error(res.error);
      return res.data as TData;
    },
    onSuccess: (data, vars) => {
      for (const key of opts.invalidate ?? []) {
        void qc.invalidateQueries({ queryKey: key });
      }
      opts.onSuccess?.(data, vars);
    },
  });
}
