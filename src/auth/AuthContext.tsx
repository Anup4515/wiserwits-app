import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import * as authApi from "@/api/auth";
import type { SessionUser } from "@/api/types";
import {
  addSession,
  clearAll,
  getAccounts,
  getActiveSession,
  getActiveStudentId,
  getSessionFor,
  removeSession,
  setActiveStudent,
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

  const reload = useCallback(async () => {
    const [accounts, activeStudentId, session] = await Promise.all([
      getAccounts(),
      getActiveStudentId(),
      getActiveSession(),
    ]);
    setState({
      status: session ? "authenticated" : "unauthenticated",
      user: session?.user ?? null,
      accounts,
      activeStudentId,
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<Result> => {
      const res = await authApi.login(email, password);
      if (res.error || !res.accessToken || !res.refreshToken || !res.user) {
        return { ok: false, error: res.error ?? "Login failed" };
      }
      await addSession(res.user, {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
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
