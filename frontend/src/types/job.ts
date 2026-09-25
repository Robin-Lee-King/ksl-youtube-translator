// Mirrors backend/schemas/job.py's JobStatus exactly (values, not the order they're declared in) —
// this is what GET/POST /translate/jobs actually returns, no frontend-side renaming.
export type ConvertJobStatus =
  | "QUEUED"
  | "TRANSCRIPTING"
  | "KSL_CONVERTING"
  | "SIGN_MAPPING"
  | "TIMELINE_BUILDING"
  | "COMPLETED"
  | "FAILED";

// Mirrors backend/schemas/job.py's JobSegment.
export interface ConvertJobSegment {
  start: number; // seconds
  end: number;
  source_text: string;
  corrected_text?: string | null;
  ksl_text?: string | null;
}

// Mirrors backend/schemas/job.py's JobResult — video_url is the sign-language avatar video;
// there's no separate field for the original source video (PlayerPage plays that straight from
// the job's own `url`/the YouTube link, never from a backend-hosted copy).
export interface ConvertJobResult {
  transcript: string;
  segments: ConvertJobSegment[];
  video_url: string | null;
}

// Mirrors backend/schemas/job.py's Job — the exact shape returned by both
// POST /translate/jobs and GET /translate/jobs/{job_id}.
export interface ConvertJob {
  job_id: string;
  status: ConvertJobStatus;
  url: string;
  result: ConvertJobResult | null;
  failed_stage: string | null;
  error_code: string | null;
  error_message: string | null;
}
