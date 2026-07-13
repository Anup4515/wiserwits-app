import * as Device from "expo-device";
import { apiRequest } from "@/api/client";
import type { LoginResponse } from "@/api/types";

/**
 * Auth API calls (plan §5).
 *
 * IMPORTANT: the mobile auth endpoints and the reused OTP endpoints return their
 * payload FLAT (e.g. `{ accessToken, refreshToken, user }`, `{ ok, ticket }`) —
 * NOT under a `data` wrapper like the `/api/student/*` routes. So these helpers
 * return the raw body typed as `Flat<T>` and callers read the fields directly.
 * On failure the body is `{ error }` (surfaced by the client on non-2xx).
 *
 * `auth: false` skips the Bearer header (no token yet) and the 401-refresh path.
 */
export type Flat<T> = Partial<T> & { error?: string };

async function flatPost<T>(path: string, body: unknown): Promise<Flat<T>> {
  const res = await apiRequest<unknown>(path, { method: "POST", auth: false, body });
  return res as Flat<T>;
}

export function login(email: string, password: string): Promise<Flat<LoginResponse>> {
  return flatPost<LoginResponse>("/api/auth/mobile/login", {
    email,
    password,
    deviceName: Device.deviceName ?? Device.modelName ?? undefined,
  });
}

/**
 * Rotate tokens AND re-resolve plan state without re-login. The backend re-runs
 * `buildSessionClaims`, so the returned `user` carries freshly granted plan
 * features — used after a subscription purchase to unlock gated screens.
 */
export function refresh(refreshToken: string): Promise<Flat<LoginResponse>> {
  return flatPost<LoginResponse>("/api/auth/mobile/refresh", { refreshToken });
}

export function logout(refreshToken: string, all = false): Promise<Flat<{ ok: boolean }>> {
  return flatPost<{ ok: boolean }>(
    `/api/auth/mobile/logout${all ? "?all=true" : ""}`,
    { refreshToken }
  );
}

// --- OTP signup (existing endpoints) ---

export function signupRequestOtp(input: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<Flat<{ ok: boolean }>> {
  return flatPost<{ ok: boolean }>("/api/auth/signup/request-otp", input);
}

export function signupVerifyOtp(
  email: string,
  code: string
): Promise<Flat<{ ok: boolean; ticket: string }>> {
  return flatPost<{ ok: boolean; ticket: string }>("/api/auth/signup/verify-otp", {
    email,
    code,
  });
}

export function signupComplete(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  ticket: string;
}): Promise<Flat<{ ok: boolean }>> {
  return flatPost<{ ok: boolean }>("/api/auth/signup/complete", input);
}

// --- OTP password reset (existing endpoints) ---

export function resetRequestOtp(email: string): Promise<Flat<{ ok: boolean }>> {
  return flatPost<{ ok: boolean }>("/api/auth/reset-password/request-otp", { email });
}

export function resetVerifyOtp(
  email: string,
  code: string
): Promise<Flat<{ ok: boolean; ticket: string }>> {
  return flatPost<{ ok: boolean; ticket: string }>(
    "/api/auth/reset-password/verify-otp",
    { email, code }
  );
}

export function resetComplete(input: {
  email: string;
  password: string;
  ticket: string;
}): Promise<Flat<{ ok: boolean }>> {
  return flatPost<{ ok: boolean }>("/api/auth/reset-password/complete", input);
}
