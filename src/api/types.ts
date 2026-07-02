/**
 * API response envelope — mirrors `ww-student-dashboard/app/lib/api-client.ts`
 * (plan §9 "API envelope").
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

/** The session claims the mobile access token carries (plan §5). */
export interface SessionUser {
  student_id: number;
  enrollment_id: number | null;
  class_section_id: number | null;
  school_id: number | null;
  role: "student";
  name: string;
  email: string;
  profile_image: string | null;
  features: string[];
  course_ids: number[];
  plan_id: number | null;
  plan_name: string | null;
  plan_expires_at: string | null;
}

/** Token pair returned by `/api/auth/mobile/login` and `/refresh` (plan §5). */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends TokenPair {
  user: SessionUser;
}
