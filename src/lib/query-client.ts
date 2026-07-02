import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query client (plan §3). Server state lives here; minimal global UI
 * state elsewhere. Defaults tuned for a glanceable mobile app: refetch on app
 * focus, modest retry, 1-minute freshness.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
