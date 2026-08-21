import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import * as authApi from "@/api/auth";
import { track } from "@/lib/analytics";
import { queryClient } from "@/lib/query-client";
import type { SessionUser } from "@/api/types";
import {
  addSession,
  canAddAccount,
  clearAll,
  getAccounts,
  MAX_ACCOUNTS,
  getActiveSession,
  getActiveStudentId,
  getSessionFor,
  removeSession,
  setActiveStudent,
  subscribeToSessionChanges,
  updateTokens,
  updateUser,
  type AccountRef,
} from "@/auth/token-store";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface Result {
  ok: boolean;
  error?: string;
}

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  accounts: AccountRef[];
  activeStudentId: number | null;
}

interface AuthContextValue extends AuthState {
  /** Sign in and ADD this account (Instagram-style — keeps existing ones). */
  signIn: (email: string, password: string) => Promise<Result>;
  /** Switch the active account (§5a, local only). */
  switchAccount: (studentId: number) => Promise<void>;
  /** Sign out the active account (others stay logged in). */
  signOut: () => Promise<void>;
  /** Remove a specific account. */
  removeAccount: (studentId: number) => Promise<void>;
  /** Sign out every account on this device. */
  signOutAll: () => Promise<void>;
  /** Force-refresh the active account's tokens + claims (e.g. after a purchase
   * unlocks new plan features). Returns true if the session was refreshed. */
  refreshSession: () => Promise<boolean>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    accounts: [],
    activeStudentId: null,
  });

  // Identity behind the currently-cached server state. Compared on every reload
  // to decide whether the React Query cache is still valid.
  const cachedIdentity = useRef<{ id: number | null; authed: boolean }>({
    id: null,
    authed: false,
  });

  const reload = useCallback(async () => {
    const [accounts, activeStudentId, session] = await Promise.all([
      getAccounts(),
      getActiveStudentId(),
      getActiveSession(),
    ]);
    const authed = !!session;

    // Drop cached server state whenever the identity behind it changes —
    // account switch, sign-out, or a refresh token dying mid-session. Query
    // keys are endpoint-shaped ("dashboard", "feed"), not student-shaped, so a
    // surviving entry would render one sibling's data under another's session
    // until the refetch landed. Skipped on first load, where there is nothing
    // cached to invalidate.
    const prev = cachedIdentity.current;
    const hadIdentity = prev.id !== null || prev.authed;
    if (hadIdentity && (prev.id !== activeStudentId || (prev.authed && !authed))) {
      queryClient.clear();
    }
    cachedIdentity.current = { id: activeStudentId, authed };

    setState({
      status: authed ? "authenticated" : "unauthenticated",
      user: session?.user ?? null,
      accounts,
      activeStudentId,
    });
  }, []);

  useEffect(() => {
    void reload();
    // The store also changes without user action: `api/client.ts` drops an
    // account when its refresh token is rejected. Subscribing is what turns
    // that into an actual sign-out instead of leaving the UI "authenticated"
    // against tokens that no longer exist.
    //
    // The explicit `await reload()` calls in signIn/switchAccount/etc. stay —
    // those callers need state settled BEFORE they return so navigation reads
    // the new value. This subscription costs a second (idempotent) read in
    // those paths and is the only path for the involuntary case.
    return subscribeToSessionChanges(() => {
      void reload();
    });
  }, [reload]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<Result> => {
      const res = await authApi.login(email, password);
      if (res.error || !res.accessToken || !res.refreshToken || !res.user) {
        return { ok: false, error: res.error ?? "Login failed" };
      }
      // Per-device account cap. Re-authenticating an account already on this
      // device is always allowed (it's a token refresh, not a new slot); a new
      // account is refused once the device already holds MAX_ACCOUNTS.
      if (!(await canAddAccount(res.user.student_id))) {
        return {
          ok: false,
          error: `You can keep up to ${MAX_ACCOUNTS} accounts on one device. Remove one to add another.`,
        };
      }
      await addSession(res.user, {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
      track("login");
      await reload();
      return { ok: true };
    },
    [reload]
  );

  const switchAccount = useCallback(
    async (studentId: number) => {
      await setActiveStudent(studentId);
      await reload();
    },
    [reload]
  );

  const removeAccount = useCallback(
    async (studentId: number) => {
      // Server-revoke the refresh token of the ACCOUNT BEING REMOVED — read its
      // own stored session, not the active one, so removing a non-active sibling
      // still kills its token server-side instead of leaving it valid until its
      // 30-day expiry.
      const target = await getSessionFor(studentId);
      if (target?.refreshToken) {
        void authApi.logout(target.refreshToken).catch(() => {});
      }
      await removeSession(studentId);
      await reload();
    },
    [reload]
  );

  const signOut = useCallback(async () => {
    const session = await getActiveSession();
    const id = await getActiveStudentId();
    if (session?.refreshToken) {
      void authApi.logout(session.refreshToken).catch(() => {});
    }
    if (id != null) await removeSession(id);
    await reload();
  }, [reload]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const id = await getActiveStudentId();
    const session = await getActiveSession();
    if (id == null || !session?.refreshToken) return false;
    const res = await authApi.refresh(session.refreshToken);
    if (res.error || !res.accessToken || !res.refreshToken || !res.user) {
      return false;
    }
    await updateTokens(id, {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    });
    await updateUser(id, res.user);
    await reload();
    return true;
  }, [reload]);

  const signOutAll = useCallback(async () => {
    const session = await getActiveSession();
    if (session?.refreshToken) {
      void authApi.logout(session.refreshToken, true).catch(() => {});
    }
    await clearAll();
    await reload();
  }, [reload]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn,
      switchAccount,
      signOut,
      removeAccount,
      signOutAll,
      refreshSession,
      reload,
    }),
    [state, signIn, switchAccount, signOut, removeAccount, signOutAll, refreshSession, reload]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
