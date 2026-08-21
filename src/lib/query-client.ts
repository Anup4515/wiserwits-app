import { QueryClient, onlineManager } from "@tanstack/react-query";

/**
 * Drive TanStack Query's online state from REAL device connectivity. Without
 * this, on native `onlineManager` assumes "always online", so `refetchOnReconnect`
 * never fires and queries/mutations don't pause when the phone loses signal.
 * `isInternetReachable` is null until the first probe — treat only an explicit
 * `false` as offline so we never flash "offline" during that initial window.
 *
 * NetInfo is a NATIVE module: in a dev client that was NOT rebuilt after it was
 * added, `RNCNetInfo` is null and touching it throws at startup. We require it
 * lazily inside a try/catch so a missing native module degrades to "always
 * online" (no crash, no banner) instead of white-screening the whole app. Once
 * the dev client is rebuilt, this wires up automatically. `require` (not static
 * import) so the failure is catchable.
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const NetInfo = require("@react-native-community/netinfo").default;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener(
      (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
        setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
      }
    )
  );
} catch (e) {
  if (__DEV__) {
    console.warn(
      "NetInfo native module unavailable — offline detection disabled until the dev client is rebuilt.",
      e
    );
  }
}

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
