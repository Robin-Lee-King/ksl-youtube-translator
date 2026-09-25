import type { ConvertJobStatus } from "../types";

export function vidId(u: string): string | null {
  const m = (u || "").match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return m ? m[1] : null;
}

export function thumbOf(u: string, q?: string): string {
  const v = vidId(u);
  return v ? `https://img.youtube.com/vi/${v}/${q || "mqdefault"}.jpg` : "";
}

export function parseDur(d: string): number {
  const p = (d || "").split(":").map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : 0;
}

export function fmtWatch(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtTime(n: number): string {
  return Math.floor(n / 60) + ":" + String(Math.floor(n % 60)).padStart(2, "0");
}

// The backend's Job response has no numeric progress field (see backend/schemas/job.py) — only the
// 7-stage status string. This is a fixed approximation for the progress bar, not a measured value.
const STATUS_PROGRESS: Record<ConvertJobStatus, number> = {
  QUEUED: 0,
  TRANSCRIPTING: 20,
  KSL_CONVERTING: 40,
  SIGN_MAPPING: 60,
  TIMELINE_BUILDING: 80,
  COMPLETED: 100,
  FAILED: 0,
};

export function progressForStatus(status: ConvertJobStatus): number {
  return STATUS_PROGRESS[status];
}

// Index into MOCK_PROC_STEPS (src/mocks/processingSteps.ts) — its 5 labeled steps line up 1:1 with
// the 5 pre-completion pipeline stages.
const STATUS_STEP_INDEX: Record<ConvertJobStatus, number> = {
  QUEUED: 0,
  TRANSCRIPTING: 1,
  KSL_CONVERTING: 2,
  SIGN_MAPPING: 3,
  TIMELINE_BUILDING: 4,
  COMPLETED: 4,
  FAILED: 0,
};

export function stepIndexForStatus(status: ConvertJobStatus): number {
  return STATUS_STEP_INDEX[status];
}

// Resolve playback URLs without modifying the backend Job response.
export function resolveVideoUrl(videoUrl?: string | null): string | undefined {
  if (!videoUrl) return undefined;
  if (/^https?:\/\//i.test(videoUrl)) return videoUrl;

  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  if (!baseUrl) return videoUrl;

  return `${baseUrl.replace(/\/+$/, "")}/${videoUrl.replace(/^\/+/, "")}`;
}
