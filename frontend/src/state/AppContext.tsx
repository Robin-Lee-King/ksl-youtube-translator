import type { ReactNode } from "react";
import { UserProvider, useUser } from "./UserContext";
import { VideoProvider, useVideo } from "./VideoContext";

// AppContext used to be a single reducer holding every piece of app state. It's now split by
// role into UserContext (profile/settings/onboarding) and VideoContext (history/groups/current
// conversion). AppProvider composes both, and useApp() merges them back into the old shape so
// existing pages keep working unchanged — new code should prefer useUser()/useVideo() directly.
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <VideoProvider>{children}</VideoProvider>
    </UserProvider>
  );
}

export function useApp() {
  const user = useUser();
  const video = useVideo();
  return { ...user, ...video };
}

// Convenience: is the current screen mode "easy"?
export function useEasyMode(): boolean {
  const { onboarding } = useUser();
  return onboarding.view === "easy";
}
