import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../state/UserContext";
import Loading from "../components/common/Loading";

// Wraps a group of routes in App.tsx and redirects to /login when signed out, remembering the
// page the user was headed to so LoginPage can send them back after a successful login.
export default function RequireAuth() {
  const { isAuthenticated, isSessionLoading } = useUser();
  const location = useLocation();

  // isAuthenticated is only an optimistic guess (a stored token) until restoreSession() confirms
  // it — waiting here avoids briefly rendering protected content behind a token that turns out to
  // be expired/invalid, same as RequireOnboarding waits for the confirmed onboardingCompleted.
  if (isSessionLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Loading size={24} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
