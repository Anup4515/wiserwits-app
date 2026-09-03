import { env } from "@/lib/env";
import type { ApiResponse, TokenPair } from "@/api/types";
import {
  getActiveStudentId,
  getSessionFor,
  updateTokens,
  removeSession,
} from "@/auth/token-store";

/**
 * HTTP client (plan §3 "HTTP", §11 cross-cutting).
 *
 * Mirrors the web `api-client.ts` envelope ({ data?, error?, message? }) and
 * adds: Bearer auth from the active account's access token (§5a), single-flight
 * refresh on 401 (§5), and a "Network error" fallback for offline.
 */

const NETWORK_ERROR = "Network error. Please try again.";

/**
 * In-flight refreshes keyed BY ACCOUNT. Concurrent 401s for the same account
 * coalesce into one refresh; different accounts refresh independently. Keying by
 * studentId (rather than a single global promise) is what makes a mid-request
 * account switch safe — each request refreshes the account it was issued for,
 * never whichever account happens to be active when the 401 lands.
 */
const refreshInFlight = new Map<number, Promise<TokenPair | null>>();

async function refreshTokensFor(studentId: number): Promise<TokenPair | null> {
  const existing = refreshInFlight.get(studentId);
  if (existing) return existing;

  const p = (async (): Promise<TokenPair | null> => {
    // Read THIS account's refresh token — not the active account's — so a switch
    // between request-issue and 401 can't refresh/retry the wrong session.
    const session = await getSessionFor(studentId);
    if (!session?.refreshToken) return null;

    try {
      const res = await fetch(`${env.apiBaseUrl}/api/auth/mobile/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      if (!res.ok) {
        // ONLY a definitive auth rejection (401/403) means the refresh token is
        // truly dead — drop the account. A transient server error (5xx) or
        // gateway blip during a deploy must NOT sign the user out: keep the
        // tokens and let the caller surface an error / retry, same as offline.
        if (res.status === 401 || res.status === 403) {
          await removeSession(studentId);
        }
        return null;
      }
      const body = (await res.json()) as Partial<TokenPair>;
      if (!body.accessToken || !body.refreshToken) {
        // 2xx but malformed — a server contract violation, not proof the token
        // is invalid. Don't nuke the session over it; surface as a failed refresh.
        return null;
      }
      const rotated: TokenPair = {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      };
      await updateTokens(studentId, rotated);
      return rotated;
    } catch {
      return null; // network failure — keep tokens, let caller surface offline
    }
  })();

  refreshInFlight.set(studentId, p);
  try {
    return await p;
  } finally {
    refreshInFlight.delete(studentId);
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip attaching the Bearer token (e.g. the login call). */
  auth?: boolean;
}

async function doFetch<T>(
  path: string,
  opts: RequestOptions,
  accessToken: string | null,
): Promise<{ status: number; body: ApiResponse<T> } | { networkError: true }> {
  // Multipart uploads pass a FormData body: let fetch set the
  // `multipart/form-data; boundary=…` header itself and send the body verbatim
  // (never JSON-encoded), otherwise force our JSON content type.
  const isForm = opts.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    // Skip ngrok's free-tier browser-warning interstitial so tunneled API
    // responses stay JSON (harmless/ignored when not tunnelling through ngrok).
    "ngrok-skip-browser-warning": "true",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (opts.auth !== false && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch(`${env.apiBaseUrl}${path}`, {
      ...opts,
      headers,
      body:
        opts.body === undefined
          ? undefined
          : isForm
            ? (opts.body as FormData)
            : JSON.stringify(opts.body),
    });
    let body: ApiResponse<T>;
    try {
      body = (await res.json()) as ApiResponse<T>;
    } catch {
      body = res.ok ? {} : { error: "Unexpected server response" };
    }
    return { status: res.status, body };
  } catch {
    return { networkError: true };
  }
}

/**
 * Make a request. Returns the `ApiResponse<T>` envelope (never throws).
 * On 401 with the auth header attached, refreshes once and retries.
 */
export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<ApiResponse<T>> {
  // Bind this request to the account active NOW. Everything below (the Bearer
  // token, the on-401 refresh, the retry) uses this captured account — so a
  // concurrent account switch can never make the retry go out with another
  // account's token and return the wrong student's data.
  const studentId = await getActiveStudentId();
  const session = studentId != null ? await getSessionFor(studentId) : null;
  const first = await doFetch<T>(path, opts, session?.accessToken ?? null);

  if ("networkError" in first) return { error: NETWORK_ERROR };

  if (
    first.status === 401 &&
    opts.auth !== false &&
    studentId != null &&
    session?.accessToken
  ) {
    const rotated = await refreshTokensFor(studentId);
    if (rotated) {
      const retry = await doFetch<T>(path, opts, rotated.accessToken);
      if ("networkError" in retry) return { error: NETWORK_ERROR };
      return retry.body;
    }
  }

  return first.body;
}

/**
 * Force a token refresh for the ACTIVE account, coalescing with any refresh
 * already in flight. `apiRequest` handles its own 401s; this exists for the
 * requests that DON'T go through it — `<AuthedImage>` hands the Bearer token to
 * the native image loader, so when that 401s it has no retry path of its own.
 */
export async function refreshActiveTokens(): Promise<TokenPair | null> {
  const studentId = await getActiveStudentId();
  if (studentId == null) return null;
  return refreshTokensFor(studentId);
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),
  /** Multipart POST for file uploads — the body is a FormData sent as-is. */
  upload: <T>(path: string, form: FormData, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "POST", body: form }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};
