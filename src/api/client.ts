import { env } from "@/lib/env";
import type { ApiResponse, TokenPair } from "@/api/types";
import {
  getActiveStudentId,
  getActiveTokens,
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

/** Shared in-flight refresh so concurrent 401s trigger only one refresh. */
let refreshInFlight: Promise<TokenPair | null> | null = null;

async function refreshActiveTokens(): Promise<TokenPair | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const studentId = await getActiveStudentId();
    const tokens = await getActiveTokens();
    if (studentId == null || !tokens?.refreshToken) return null;

    try {
      const res = await fetch(`${env.apiBaseUrl}/api/auth/mobile/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!res.ok) {
        // Refresh token rejected/expired → drop this account's session.
        await removeSession(studentId);
        return null;
      }
      const body = (await res.json()) as Partial<TokenPair>;
      if (!body.accessToken || !body.refreshToken) {
        await removeSession(studentId);
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

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
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
  const tokens = await getActiveTokens();
  const first = await doFetch<T>(path, opts, tokens?.accessToken ?? null);

  if ("networkError" in first) return { error: NETWORK_ERROR };

  if (first.status === 401 && opts.auth !== false && tokens?.accessToken) {
    const rotated = await refreshActiveTokens();
    if (rotated) {
      const retry = await doFetch<T>(path, opts, rotated.accessToken);
      if ("networkError" in retry) return { error: NETWORK_ERROR };
      return retry.body;
    }
  }

  return first.body;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};
