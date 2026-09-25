import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { OnboardingSelections, Profile, ScreenView, Settings } from "../types";
import { getAuthToken } from "../api/tokenStorage";

interface UserState {
  profile: Profile;
  settings: Settings;
  onboarding: OnboardingSelections;
  // Set from a stored token at startup and from login/logout afterwards — see src/hooks/useAuth.ts,
  // which is the only place that should call authApi and touch tokenStorage.
  isAuthenticated: boolean;
  // Backend-persisted onboarding status (User.onboarding_completed) — the source of truth for
  // RequireOnboarding, kept in sync from login/signup/restoreSession and completeOnboarding().
  onboardingCompleted: boolean;
  // True until restoreSession() (see SessionBootstrap in App.tsx) settles, either way. Route guards
  // must wait for this before trusting isAuthenticated/onboardingCompleted — otherwise they judge
  // against these fields' optimistic/default startup values instead of the confirmed ones.
  isSessionLoading: boolean;
}

// TODO: replace profile/settings defaults with the real GET /api/user response once the backend is connected.
const initialState: UserState = {
  profile: { name: "공농 사용자", email: "user@gongnong.kr" },
  settings: { subtitles: true, autoSwitch: false, defaultSpeed: "1.0" },
  onboarding: { age: "", topics: [], prefs: [], view: "" },
  isAuthenticated: getAuthToken() !== null,
  onboardingCompleted: false,
  isSessionLoading: true,
};

type Action =
  | { type: "SET_SETTINGS"; settings: Partial<Settings> }
  | { type: "SET_PROFILE"; profile: Partial<Profile> }
  | { type: "SET_ONBOARDING"; onboarding: Partial<OnboardingSelections> }
  | { type: "TOGGLE_ONBOARDING_TOPIC"; topic: string }
  | { type: "TOGGLE_ONBOARDING_PREF"; pref: string }
  | { type: "SET_AUTHENTICATED"; value: boolean }
  | { type: "SET_ONBOARDING_COMPLETED"; value: boolean }
  | { type: "SET_SESSION_LOADING"; value: boolean };

function reducer(state: UserState, action: Action): UserState {
  switch (action.type) {
    case "SET_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "SET_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.profile } };
    case "SET_ONBOARDING":
      return { ...state, onboarding: { ...state.onboarding, ...action.onboarding } };
    case "TOGGLE_ONBOARDING_TOPIC": {
      const on = state.onboarding.topics.includes(action.topic);
      return {
        ...state,
        onboarding: {
          ...state.onboarding,
          topics: on
            ? state.onboarding.topics.filter((t) => t !== action.topic)
            : [...state.onboarding.topics, action.topic],
        },
      };
    }
    case "TOGGLE_ONBOARDING_PREF": {
      const on = state.onboarding.prefs.includes(action.pref);
      return {
        ...state,
        onboarding: {
          ...state.onboarding,
          prefs: on
            ? state.onboarding.prefs.filter((p) => p !== action.pref)
            : [...state.onboarding.prefs, action.pref].slice(-2),
        },
      };
    }
    case "SET_AUTHENTICATED":
      return { ...state, isAuthenticated: action.value };
    case "SET_ONBOARDING_COMPLETED":
      return { ...state, onboardingCompleted: action.value };
    case "SET_SESSION_LOADING":
      return { ...state, isSessionLoading: action.value };
    default:
      return state;
  }
}

interface UserContextValue extends UserState {
  setSettings: (settings: Partial<Settings>) => void;
  setProfile: (profile: Partial<Profile>) => void;
  setOnboarding: (onboarding: Partial<OnboardingSelections>) => void;
  toggleOnboardingTopic: (topic: string) => void;
  toggleOnboardingPref: (pref: string) => void;
  setScreenView: (view: ScreenView) => void;
  setAuthenticated: (value: boolean) => void;
  setOnboardingCompleted: (value: boolean) => void;
  setSessionLoading: (value: boolean) => void;
}

const UserCtx = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Each action creator only closes over `dispatch`, which useReducer guarantees is referentially
  // stable for the component's whole lifetime — so these keep the same function identity across
  // every render, no matter how often `state` changes. That stability matters beyond this file:
  // useAuth's restoreSession takes these as useCallback deps, and previously (when they were
  // recreated inline in the value's useMemo, scoped to `[state]`) that made restoreSession get a
  // new identity every time it ran, which made SessionBootstrap's `useEffect(() => restoreSession(),
  // [restoreSession])` refire — calling restoreSession() again, mutating state again, forever. That
  // was the actual cause of the "서비스가 느려지고 이상하게 동작함" bug: an unbounded GET /auth/me
  // loop. The toggle actions used to read `state.onboarding` directly in their body (which would
  // have made them stale forever if just wrapped in useCallback), so that logic moved into the
  // reducer above, which always sees the latest state regardless of when the action was dispatched.
  const setSettings = useCallback((settings: Partial<Settings>) => dispatch({ type: "SET_SETTINGS", settings }), [dispatch]);
  const setProfile = useCallback((profile: Partial<Profile>) => dispatch({ type: "SET_PROFILE", profile }), [dispatch]);
  const setOnboarding = useCallback(
    (onboarding: Partial<OnboardingSelections>) => dispatch({ type: "SET_ONBOARDING", onboarding }),
    [dispatch],
  );
  const toggleOnboardingTopic = useCallback(
    (topic: string) => dispatch({ type: "TOGGLE_ONBOARDING_TOPIC", topic }),
    [dispatch],
  );
  const toggleOnboardingPref = useCallback(
    (pref: string) => dispatch({ type: "TOGGLE_ONBOARDING_PREF", pref }),
    [dispatch],
  );
  const setScreenView = useCallback(
    (view: ScreenView) => dispatch({ type: "SET_ONBOARDING", onboarding: { view } }),
    [dispatch],
  );
  const setAuthenticated = useCallback((value: boolean) => dispatch({ type: "SET_AUTHENTICATED", value }), [dispatch]);
  const setOnboardingCompleted = useCallback(
    (value: boolean) => dispatch({ type: "SET_ONBOARDING_COMPLETED", value }),
    [dispatch],
  );
  const setSessionLoading = useCallback(
    (value: boolean) => dispatch({ type: "SET_SESSION_LOADING", value }),
    [dispatch],
  );

  // Bundled separately from `state` so this object's identity also stays stable across renders
  // (every dep above is itself stable) — the final value below then only changes when `state`
  // actually does, which is the only case any consumer needs to re-render for.
  const actions = useMemo(
    () => ({
      setSettings,
      setProfile,
      setOnboarding,
      toggleOnboardingTopic,
      toggleOnboardingPref,
      setScreenView,
      setAuthenticated,
      setOnboardingCompleted,
      setSessionLoading,
    }),
    [
      setSettings,
      setProfile,
      setOnboarding,
      toggleOnboardingTopic,
      toggleOnboardingPref,
      setScreenView,
      setAuthenticated,
      setOnboardingCompleted,
      setSessionLoading,
    ],
  );

  const value = useMemo<UserContextValue>(() => ({ ...state, ...actions }), [state, actions]);

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
