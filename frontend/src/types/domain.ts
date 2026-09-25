export type HistoryStatus = "완료" | "실패" | "처리중";

// TODO (see docs/api-field-requirements.md): backend field names likely job_id/thumbnail_url/
// processed_at rather than id/url/date — confirm mapping when the real historyApi lands. Also
// unconfirmed: whether the backend models item→group as a single `group_id` on the item (null =
// 미분류) or, like our current Group.itemIds below, a group holding many item ids — these are not
// the same shape and one side will need to change once the API is confirmed.
export interface HistoryItem {
  id: string;
  title: string;
  url: string;
  date: string;
  status: HistoryStatus;
  duration: string;
  // Populated once a real conversion completes (see ConvertJob in src/types/job.ts). Absent for the
  // seed mock data, in which case PlayerPage falls back to its placeholder sign-video panel.
  resultVideoUrl?: string;
  subtitleUrl?: string;
}

// TODO: backend also tracks group_name/user_id/created_at and hasn't decided whether deleting a
// group soft-deletes it (keeping its items' history) — see docs/api-field-requirements.md.
export interface Group {
  id: string;
  name: string;
  itemIds: string[];
}

export interface Settings {
  subtitles: boolean;
  autoSwitch: boolean;
  defaultSpeed: string;
}

// TODO: if the backend persists this (docs/api-field-requirements.md proposes a `screen_mode`
// column, enum "쉬운 화면"/"기본 화면"), decide whether to store that Korean enum as-is or keep
// mapping to/from these English values here.
export type ScreenView = "" | "easy" | "standard";

export interface OnboardingSelections {
  age: string;
  topics: string[];
  prefs: string[];
  view: ScreenView;
}

export interface Profile {
  name: string;
  email: string;
}

export interface ConfirmDeleteState {
  id: string;
  title: string;
}
