import { apiClient } from "./client";
import type { ConvertJob } from "../types";

export interface StartConvertRequest {
  url: string;
}

// Backend response is used as-is (see types/job.ts) — no field mapping needed here, unlike
// auth/history, since nothing here is renamed snake_case→camelCase.
export const videoApi = {
  startConvert: (payload: StartConvertRequest) => apiClient.post<ConvertJob>("/translate/jobs", payload),
  getJobStatus: (jobId: string) => apiClient.get<ConvertJob>(`/translate/jobs/${jobId}`),
};
