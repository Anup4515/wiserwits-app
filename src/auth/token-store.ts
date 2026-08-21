import { storage } from "@/auth/secure-storage";
import type { TokenPair, SessionUser } from "@/api/types";
import type { ViewerRole } from "@/lib/copy";

/**
 * Multi-session secure token store (plan §5a — Instagram-style multi-account).
 *
 * A parent can add several students (e.g. siblings) to one device and switch
 * between them client-side. Each account keeps its OWN tokens + cached user, and
 * stays logged in until its refresh token expires. Switching just changes which
 * account is active — no server round-trip.
 *
 * Layout (SecureStore has a small per-key size limit, so each account's data
 * lives under its own key rather than in one big blob):
 *   ww.accounts            -> { activeStudentId, accounts: [{ studentId, name }] }
 *   ww.session.<studentId>  -> { accessToken, refreshToken, user, viewerRole? }
 *
 * `viewerRole` (student | guardian, §9a) is device-local and optional; unset →
 * neutral copy. It never leaves the device.
 */

const INDEX_KEY = "ww.accounts";
const sessionKey = (studentId: number) => `ww.session.${studentId}`;

// ─── Change notification ────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Subscribe to auth-state changes in the store. Returns an unsubscribe fn.
 *
 * This exists because the store can change WITHOUT any user action: when a
 * refresh token is rejected, `api/client.ts` drops the account here directly.
 * Nothing was watching, so React state kept reporting "authenticated" against
 * tokens that no longer existed and the user sat on screens that only errored.
 * `AuthContext` subscribes and re-reads, so an expired session signs out on its
 * own.
 */
export function subscribeToSessionChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Fire after any write that changes WHO is signed in — added, switched,
 * removed, cleared, or a refreshed user payload.
 *
 * Deliberately NOT fired by `updateTokens()`: token rotation happens on every
 * refresh and changes no identity, so notifying there would reload the whole
 * auth context on a routine 401 retry.
 */
function notifySessionChanged(): void {
  for (const listener of listeners) listener();
}

/** Max distinct accounts one device may hold at once (plan §5a guardrail). */
export const MAX_ACCOUNTS = 4;

export interface AccountRef {
  studentId: number;
  name: string;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  viewerRole?: ViewerRole;
}

interface AccountIndex {
  activeStudentId: number | null;
  accounts: AccountRef[];
}

const emptyIndex: AccountIndex = { activeStudentId: null, accounts: [] };

async function readIndex(): Promise<AccountIndex> {
  const raw = await storage.getItem(INDEX_KEY);
  if (!raw) return { ...emptyIndex };
  try {
    return JSON.parse(raw) as AccountIndex;
  } catch {
    return { ...emptyIndex };
  }
}

async function writeIndex(index: AccountIndex): Promise<void> {
  await storage.setItem(INDEX_KEY, JSON.stringify(index));
}

async function readSession(studentId: number): Promise<StoredSession | null> {
  const raw = await storage.getItem(sessionKey(studentId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

async function writeSession(
  studentId: number,
  session: StoredSession
): Promise<void> {
  await storage.setItem(sessionKey(studentId), JSON.stringify(session));
}

export async function getAccounts(): Promise<AccountRef[]> {
  return (await readIndex()).accounts;
}

/**
 * Whether `studentId` may be added to this device. An account that is ALREADY
 * stored is always allowed (re-login just refreshes its tokens — not a new
 * slot); a genuinely new account is allowed only while under MAX_ACCOUNTS.
 */
export async function canAddAccount(studentId: number): Promise<boolean> {
  const { accounts } = await readIndex();
  if (accounts.some((a) => a.studentId === studentId)) return true;
  return accounts.length < MAX_ACCOUNTS;
}

/**
 * Read a SPECIFIC account's stored session (tokens + user), regardless of which
 * account is currently active. Needed to (a) revoke a non-active account's
 * refresh token server-side on removal, and (b) bind an in-flight token refresh
 * to the account that made the request even if the user switches meanwhile.
 */
export async function getSessionFor(
  studentId: number
): Promise<StoredSession | null> {
  return readSession(studentId);
}

export async function getActiveStudentId(): Promise<number | null> {
  return (await readIndex()).activeStudentId;
}

export async function getActiveSession(): Promise<StoredSession | null> {
  const id = await getActiveStudentId();
  return id == null ? null : readSession(id);
}

export async function getActiveUser(): Promise<SessionUser | null> {
  return (await getActiveSession())?.user ?? null;
}

export async function getActiveTokens(): Promise<TokenPair | null> {
  const s = await getActiveSession();
  return s ? { accessToken: s.accessToken, refreshToken: s.refreshToken } : null;
}

/** Add (or replace) an account from a login response and make it active. */
export async function addSession(
  user: SessionUser,
  tokens: TokenPair,
  viewerRole?: ViewerRole
): Promise<void> {
  await writeSession(user.student_id, { ...tokens, user, viewerRole });
  const index = await readIndex();
  const without = index.accounts.filter((a) => a.studentId !== user.student_id);
  await writeIndex({
    activeStudentId: user.student_id,
    accounts: [...without, { studentId: user.student_id, name: user.name }],
  });
  notifySessionChanged();
}

/** Rotate tokens for an account after a refresh (plan §5 rotation). */
export async function updateTokens(
  studentId: number,
  tokens: TokenPair
): Promise<void> {
  const existing = await readSession(studentId);
  if (!existing) return;
  await writeSession(studentId, { ...existing, ...tokens });
}

/** Persist a refreshed user payload (plan/profile changes) for an account. */
export async function updateUser(
  studentId: number,
  user: SessionUser
): Promise<void> {
  const existing = await readSession(studentId);
  if (!existing) return;
  await writeSession(studentId, { ...existing, user });
  // keep the display name in the index fresh
  const index = await readIndex();
  await writeIndex({
    ...index,
    accounts: index.accounts.map((a) =>
      a.studentId === studentId ? { ...a, name: user.name } : a
    ),
  });
  notifySessionChanged();
}

export async function setViewerRole(
  studentId: number,
  viewerRole: ViewerRole
): Promise<void> {
  const existing = await readSession(studentId);
  if (!existing) return;
  await writeSession(studentId, { ...existing, viewerRole });
}

/** Switch the active account (the Instagram-style switch — local only). */
export async function setActiveStudent(studentId: number): Promise<void> {
  const index = await readIndex();
  if (!index.accounts.some((a) => a.studentId === studentId)) return;
  await writeIndex({ ...index, activeStudentId: studentId });
  notifySessionChanged();
}

/** Remove one account; pick another as active if it was the active one. */
export async function removeSession(studentId: number): Promise<void> {
  const index = await readIndex();
  await storage.removeItem(sessionKey(studentId));
  const accounts = index.accounts.filter((a) => a.studentId !== studentId);
  const activeStudentId =
    index.activeStudentId === studentId
      ? (accounts[0]?.studentId ?? null)
      : index.activeStudentId;
  await writeIndex({ activeStudentId, accounts });
  notifySessionChanged();
}

/** Clear everything (full sign-out of all accounts). */
export async function clearAll(): Promise<void> {
  const index = await readIndex();
  await Promise.all(
    index.accounts.map((a) => storage.removeItem(sessionKey(a.studentId)))
  );
  await storage.removeItem(INDEX_KEY);
  notifySessionChanged();
}
