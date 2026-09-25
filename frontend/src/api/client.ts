import type { ApiErrorResponse } from "../types";
import { clearAuthToken, getAuthToken } from "./tokenStorage";

// baseURL is read from the environment so it can differ between local/dev/prod without code
// changes. See .env.example for the variable name.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error implements ApiErrorResponse {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    // Backend's exception handlers reply with {"error": "..."} rather than plain text.
    const body = await res.json().catch(() => null);
    const message = (body && typeof body.error === "string" ? body.error : null) ?? res.statusText;

    // A 401 on a request that carried a token means the session itself is invalid/expired —
    // not a login-page wrong-password 401, since those requests never carry a token. Only that
    // case should force a fresh login.
    if (res.status === 401 && token) {
      clearAuthToken();
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }

    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
