import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { ConfirmDeleteState, ConvertJob, Group, HistoryItem } from "../types";
import { historyApi } from "../api/history";

interface VideoState {
  history: HistoryItem[];
  groups: Group[];
  currentUrl: string;
  confirmDelete: ConfirmDeleteState | null;
  // The most recently completed conversion job, set by ProcessingPage and read by PlayerPage so a
  // freshly-converted video's resultVideoUrl/subtitleUrl are available without a re-fetch. Replaying
  // an older item from HistoryPage instead goes through the matching HistoryItem's own fields.
  currentJob: ConvertJob | null;
}

// Starts empty and is filled by loadHistory() (see AppLayout, which calls it once on mount) —
// GET /history and GET /history/groups both require login, so there's nothing to show until then.
const initialState: VideoState = {
  history: [],
  groups: [],
  currentUrl: "",
  confirmDelete: null,
  currentJob: null,
};

type Action =
  | { type: "SET_HISTORY"; history: HistoryItem[] }
  | { type: "SET_GROUPS"; groups: Group[] }
  | { type: "ADD_HISTORY_ITEM"; item: HistoryItem }
  | { type: "REMOVE_HISTORY_ITEM"; id: string }
  | { type: "SET_HISTORY_STATUS"; id: string; status: HistoryItem["status"] }
  | { type: "ADD_GROUP"; group: Group }
  | { type: "REMOVE_GROUP"; id: string }
  | { type: "ADD_ITEM_TO_GROUP"; groupId: string; itemId: string }
  | { type: "REMOVE_ITEM_FROM_GROUP"; groupId: string; itemId: string }
  | { type: "SET_CURRENT_URL"; url: string }
  | { type: "SET_CURRENT_JOB"; job: ConvertJob | null }
  | { type: "REQUEST_DELETE"; item: ConfirmDeleteState }
  | { type: "CANCEL_DELETE" }
  | { type: "CONFIRM_DELETE" };

function reducer(state: VideoState, action: Action): VideoState {
  switch (action.type) {
    case "SET_HISTORY":
      return { ...state, history: action.history };
    case "SET_GROUPS":
      return { ...state, groups: action.groups };
    case "ADD_HISTORY_ITEM":
      return { ...state, history: [action.item, ...state.history] };
    case "REMOVE_HISTORY_ITEM":
      return {
        ...state,
        history: state.history.filter((h) => h.id !== action.id),
        groups: state.groups.map((g) => ({ ...g, itemIds: g.itemIds.filter((id) => id !== action.id) })),
      };
    case "SET_HISTORY_STATUS":
      return {
        ...state,
        history: state.history.map((h) => (h.id === action.id ? { ...h, status: action.status } : h)),
      };
    case "ADD_GROUP":
      return { ...state, groups: [...state.groups, action.group] };
    case "REMOVE_GROUP":
      return { ...state, groups: state.groups.filter((g) => g.id !== action.id) };
    case "ADD_ITEM_TO_GROUP":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId && !g.itemIds.includes(action.itemId)
            ? { ...g, itemIds: [...g.itemIds, action.itemId] }
            : g,
        ),
      };
    case "REMOVE_ITEM_FROM_GROUP":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId ? { ...g, itemIds: g.itemIds.filter((id) => id !== action.itemId) } : g,
        ),
      };
    case "SET_CURRENT_URL":
      return { ...state, currentUrl: action.url };
    case "SET_CURRENT_JOB":
      return { ...state, currentJob: action.job };
    case "REQUEST_DELETE":
      return { ...state, confirmDelete: action.item };
    case "CANCEL_DELETE":
      return { ...state, confirmDelete: null };
    case "CONFIRM_DELETE": {
      if (!state.confirmDelete) return state;
      const deletedId = state.confirmDelete.id;
      return {
        ...state,
        history: state.history.filter((h) => h.id !== deletedId),
        groups: state.groups.map((g) => ({ ...g, itemIds: g.itemIds.filter((id) => id !== deletedId) })),
        confirmDelete: null,
      };
    }
    default:
      return state;
  }
}

interface VideoContextValue extends VideoState {
  loadHistory: () => Promise<void>;
  addHistoryItem: (item: HistoryItem) => void;
  removeHistoryItem: (id: string) => Promise<void>;
  createGroup: (name: string, itemIds?: string[]) => Promise<Group>;
  removeGroup: (id: string) => Promise<void>;
  addItemToGroup: (groupId: string, itemId: string) => Promise<void>;
  removeItemFromGroup: (groupId: string, itemId: string) => Promise<void>;
  setCurrentUrl: (url: string) => void;
  setCurrentJob: (job: ConvertJob | null) => void;
  requestDelete: (item: ConfirmDeleteState) => void;
  cancelDelete: () => void;
  confirmDeleteNow: () => Promise<void>;
}

const VideoCtx = createContext<VideoContextValue | null>(null);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Every action creator below closes over only `dispatch` (stable for the component's whole
  // lifetime, per useReducer) — never over `state` directly — so they keep the same identity across
  // every render. That matters because AppLayout calls loadHistory from a useEffect keyed on it:
  // if loadHistory's identity changed every time state changed (as it would from the old pattern of
  // recreating every function inside a single `useMemo(() => ({...state, fn...}), [state])`), that
  // effect would refire after every load, which dispatches state changes, which recreates
  // loadHistory again — the exact infinite GET /auth/me loop found earlier in UserContext.tsx, just
  // with GET /history/GET /history/groups instead. confirmDeleteNow is the one exception: it needs
  // to read the *current* confirmDelete.id, so it depends on that slice of state instead of on
  // nothing — narrow enough to only change when a delete is actually requested/cancelled, never as
  // a side effect of unrelated state (history/groups) updating.
  const loadHistory = useCallback(async () => {
    try {
      const [history, groups] = await Promise.all([historyApi.list(), historyApi.listGroups()]);
      dispatch({ type: "SET_HISTORY", history });
      dispatch({ type: "SET_GROUPS", groups });
    } catch {
      // Not logged in yet (called from AppLayout, which mounts as soon as any of /home, /history,
      // /mypage does) or a transient network error — either way, leave history/groups as they are.
    }
  }, [dispatch]);

  const addHistoryItem = useCallback((item: HistoryItem) => dispatch({ type: "ADD_HISTORY_ITEM", item }), [dispatch]);

  const removeHistoryItem = useCallback(
    async (id: string) => {
      await historyApi.remove(id);
      dispatch({ type: "REMOVE_HISTORY_ITEM", id });
    },
    [dispatch],
  );

  const createGroup = useCallback(
    async (name: string, itemIds: string[] = []) => {
      const group = await historyApi.createGroup(name, itemIds);
      dispatch({ type: "ADD_GROUP", group });
      return group;
    },
    [dispatch],
  );

  const removeGroup = useCallback(
    async (id: string) => {
      await historyApi.removeGroup(id);
      dispatch({ type: "REMOVE_GROUP", id });
    },
    [dispatch],
  );

  const addItemToGroup = useCallback(
    async (groupId: string, itemId: string) => {
      await historyApi.addItemToGroup(groupId, itemId);
      dispatch({ type: "ADD_ITEM_TO_GROUP", groupId, itemId });
    },
    [dispatch],
  );

  const removeItemFromGroup = useCallback(
    async (groupId: string, itemId: string) => {
      await historyApi.removeItemFromGroup(groupId, itemId);
      dispatch({ type: "REMOVE_ITEM_FROM_GROUP", groupId, itemId });
    },
    [dispatch],
  );

  const setCurrentUrl = useCallback((url: string) => dispatch({ type: "SET_CURRENT_URL", url }), [dispatch]);
  const setCurrentJob = useCallback((job: ConvertJob | null) => dispatch({ type: "SET_CURRENT_JOB", job }), [dispatch]);
  const requestDelete = useCallback((item: ConfirmDeleteState) => dispatch({ type: "REQUEST_DELETE", item }), [dispatch]);
  const cancelDelete = useCallback(() => dispatch({ type: "CANCEL_DELETE" }), [dispatch]);

  const confirmDeleteNow = useCallback(async () => {
    if (!state.confirmDelete) return;
    await historyApi.remove(state.confirmDelete.id);
    dispatch({ type: "CONFIRM_DELETE" });
  }, [state.confirmDelete, dispatch]);

  const value = useMemo<VideoContextValue>(
    () => ({
      ...state,
      loadHistory,
      addHistoryItem,
      removeHistoryItem,
      createGroup,
      removeGroup,
      addItemToGroup,
      removeItemFromGroup,
      setCurrentUrl,
      setCurrentJob,
      requestDelete,
      cancelDelete,
      confirmDeleteNow,
    }),
    [
      state,
      loadHistory,
      addHistoryItem,
      removeHistoryItem,
      createGroup,
      removeGroup,
      addItemToGroup,
      removeItemFromGroup,
      setCurrentUrl,
      setCurrentJob,
      requestDelete,
      cancelDelete,
      confirmDeleteNow,
    ],
  );

  return <VideoCtx.Provider value={value}>{children}</VideoCtx.Provider>;
}

export function useVideo(): VideoContextValue {
  const ctx = useContext(VideoCtx);
  if (!ctx) throw new Error("useVideo must be used within VideoProvider");
  return ctx;
}
