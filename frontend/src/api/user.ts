import { apiClient } from "./client";
import type { Profile, Settings, User } from "../types";

// TODO: endpoint paths are placeholders pending the backend API spec. Unconfirmed:
// - whether getMe() returns settings/onboarding inline or those need separate endpoints
// - User type fields beyond id/email/name (see types/user.ts TODO)
export const userApi = {
  getMe: () => apiClient.get<User>("/user/me"),
  updateProfile: (payload: Partial<Profile>) => apiClient.patch<Profile>("/user/me", payload),
  updateSettings: (payload: Partial<Settings>) => apiClient.patch<Settings>("/user/settings", payload),
};
