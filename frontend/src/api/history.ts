import { apiClient } from "./client";
import type { Group, HistoryItem } from "../types";
import { fmtTime } from "../utils/video";

// Shape actually returned by GET /history.
interface BackendHistoryItem {
  job_id: string;
  url: string;
  title: string | null;
  status: HistoryItem["status"];
  duration_sec: number | null;
  group_id: number | null;
  result_video_url: string | null;
  subtitle_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

// Shape actually returned by GET/POST /history/groups — never carries itemIds: the backend points
// each job at its group (translation_jobs.group_id), not the other way around, so a fetched group
// never comes with a list of its items attached.
interface BackendGroup {
  id: number;
  name: string;
  created_at: string;
}

function toHistoryItem(item: BackendHistoryItem): HistoryItem {
  return {
    id: item.job_id,
    title: item.title ?? "제목 없음",
    url: item.url,
    date: item.created_at,
    status: item.status,
    // duration_sec is null until the source video's duration is known — fmtTime(0) reads as
    // "0:00", a reasonable placeholder for "not available yet" without needing an optional field.
    duration: fmtTime(item.duration_sec ?? 0),
    resultVideoUrl: item.result_video_url ?? undefined,
    subtitleUrl: item.subtitle_url ?? undefined,
  };
}

function toGroup(group: BackendGroup, itemIds: string[] = []): Group {
  return { id: String(group.id), name: group.name, itemIds };
}

export const historyApi = {
  list: () => apiClient.get<BackendHistoryItem[]>("/history").then((items) => items.map(toHistoryItem)),
  remove: (id: string) => apiClient.delete<void>(`/history/${id}`),
  listGroups: () => apiClient.get<BackendGroup[]>("/history/groups").then((groups) => groups.map((g) => toGroup(g))),
  // The backend has no single call that creates a group with items already in it — it only creates
  // an empty group, and a job's membership is set from the job's own side (PATCH .../group). So
  // itemIds is handled entirely here: create the group, then PATCH each item into it in sequence.
  createGroup: async (name: string, itemIds: string[] = []): Promise<Group> => {
    const group = await apiClient.post<BackendGroup>("/history/groups", { name });

    for (const itemId of itemIds) {
      await apiClient.patch<BackendHistoryItem>(`/history/${itemId}/group`, { group_id: group.id });
    }

    return toGroup(group, itemIds);
  },
  removeGroup: (id: string) => apiClient.delete<void>(`/history/groups/${id}`),
  addItemToGroup: (groupId: string, itemId: string) =>
    apiClient.patch<BackendHistoryItem>(`/history/${itemId}/group`, { group_id: Number(groupId) }),
  removeItemFromGroup: (_groupId: string, itemId: string) =>
    apiClient.patch<BackendHistoryItem>(`/history/${itemId}/group`, { group_id: null }),
};
