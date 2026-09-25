// TODO: confirm the real response envelope shape with the backend team.
// This assumes endpoints return the resource directly (no wrapper); adjust apiClient in
// src/api/client.ts together with this type if the backend wraps responses instead.
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  message: string;
  status: number;
}
