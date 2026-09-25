// TODO: confirm the real session strategy with the backend team (httpOnly cookie vs bearer token
// in localStorage). This localStorage-based placeholder keeps the rest of the app decoupled from
// that decision — only this file needs to change once it's settled.
const TOKEN_KEY = "gongnong_access_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
