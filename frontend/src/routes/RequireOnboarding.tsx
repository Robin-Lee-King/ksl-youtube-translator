import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../state/UserContext";
import Loading from "../components/common/Loading";

// Sits inside RequireAuth, in front of home/history/mypage/processing/player: an authenticated
// user whose backend record has onboarding_completed = false (see User.onboarding_completed,
// synced into UserContext by useAuth's login/signup/restoreSession) is sent to /onboarding instead.
export default function RequireOnboarding() {
  const { onboardingCompleted, isSessionLoading } = useUser();

  // onboardingCompleted defaults to false until restoreSession() confirms the real value — judging
  // on it before that resolves would bounce an already-onboarded user to /onboarding, which they'd
  // then get stuck on since that route sits outside these guards and nothing would send them back.
  if (isSessionLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Loading size={24} />
      </div>
    );
  }

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
