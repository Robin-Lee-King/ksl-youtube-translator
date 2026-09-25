import { apiClient } from "./client";
import type { ScreenView, User } from "../types";

export interface LoginRequest {
  id: string; // username or email — backend accepts either
  password: string;
}

export interface SignupRequest {
  name: string;
  id: string; // becomes `username`
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// Shape actually returned by POST /auth/signup, /auth/login, GET /auth/me, PATCH /auth/me/onboarding.
interface BackendUser {
  id: number;
  name: string;
  username: string;
  email: string;
  onboarding_completed: boolean;
  screen_mode: "easy" | "standard" | null;
  age: string | null;
  topics: string[];
  prefs: string[];
  created_at: string;
}

interface BackendAuthResponse {
  access_token: string;
  token_type: string;
  user: BackendUser;
}

function toUser(u: BackendUser): User {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    onboardingCompleted: u.onboarding_completed,
    screenMode: u.screen_mode ?? "",
    age: u.age ?? "",
    topics: u.topics,
    prefs: u.prefs,
  };
}

export interface CompleteOnboardingPayload {
  screenMode?: ScreenView;
  age?: string;
  topics?: string[];
  prefs?: string[];
}

function toAuthResponse(res: BackendAuthResponse): AuthResponse {
  return { user: toUser(res.user), accessToken: res.access_token };
}

// 백엔드 확정: 세션은 JWT 방식, access_token만 발급 (MVP에서는 refreshToken 생략). 만료 시 별도
// 갱신 없이 재로그인이 필요하다 — 그래서 logout()도 서버 호출 없이 로컬 토큰 삭제로 끝난다.
export const authApi = {
  login: (payload: LoginRequest) =>
    apiClient
      .post<BackendAuthResponse>("/auth/login", { username_or_email: payload.id, password: payload.password })
      .then(toAuthResponse),
  signup: (payload: SignupRequest) =>
    apiClient
      .post<BackendAuthResponse>("/auth/signup", {
        name: payload.name,
        username: payload.id,
        email: payload.email,
        password: payload.password,
      })
      .then(toAuthResponse),
  me: () => apiClient.get<BackendUser>("/auth/me").then(toUser),
  // Every field is optional: omit one to leave it unchanged server-side (existing screen_mode-only
  // callers keep working). age accepts "" (explicit deselect), so it's checked separately from the
  // others via `!== undefined` rather than truthiness.
  completeOnboarding: (payload?: CompleteOnboardingPayload) => {
    const body: Record<string, unknown> = {};
    if (payload?.screenMode) body.screen_mode = payload.screenMode;
    if (payload?.age !== undefined) body.age = payload.age;
    if (payload?.topics !== undefined) body.topics = payload.topics;
    if (payload?.prefs !== undefined) body.prefs = payload.prefs;

    return apiClient
      .patch<BackendUser>("/auth/me/onboarding", Object.keys(body).length > 0 ? body : undefined)
      .then(toUser);
  },
  // TODO: /auth/find-id, /auth/find-password have no backend endpoint yet — FindIdModal/FindPwModal
  // don't call these (still pure UI mockups), so leaving them unconnected for now.
  findId: (email: string) => apiClient.post<{ id: string }>("/auth/find-id", { email }),
  findPassword: (id: string, email: string) => apiClient.post<void>("/auth/find-password", { id, email }),
};
