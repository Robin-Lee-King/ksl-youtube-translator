import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useApp } from "../../state/AppContext";
import { navBtn, navIcon } from "../../styles";
import { ICON } from "../../constants";
import logo from "../../assets/logo.png";
import avatar from "../../assets/avatar.png";

export default function AppLayout() {
  const [sidebar, setSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, onboarding, loadHistory } = useApp();
  const easy = onboarding.view === "easy";

  // Shared shell for /home, /history, /mypage — loading here once (loadHistory has a stable
  // identity, see VideoContext.tsx) covers all three without fetching redundantly on every tab
  // switch between them, since AppLayout doesn't remount on client-side navigation.
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const page = location.pathname.startsWith("/history")
    ? "history"
    : location.pathname.startsWith("/mypage")
      ? "mypage"
      : "home";

  function go(p: "home" | "history" | "mypage") {
    navigate(`/${p}`);
    setSidebar(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #E5E8E7",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ maxWidth: "1024px", margin: "0 auto", padding: "0 24px", height: "56px", display: "flex", alignItems: "center" }}>
          <button
            onClick={() => setSidebar(true)}
            aria-label="메뉴 열기"
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <svg viewBox="0 0 24 24" style={{ width: "22px", height: "22px", fill: "#747C78" }}>
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
            <img src={logo} alt="공농" style={{ height: "34px", width: "auto" }} />
          </button>
        </div>
      </header>

      <div
        onClick={() => setSidebar(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,.35)",
          transition: "opacity .3s",
          opacity: sidebar ? 1 : 0,
          pointerEvents: sidebar ? "auto" : "none",
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100%",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          width: "260px",
          transform: sidebar ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .28s cubic-bezier(.4,0,.2,1)",
          boxShadow: sidebar ? "4px 0 24px rgba(0,0,0,.1)" : "none",
        }}
      >
        <div style={{ height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid #E5E8E7" }}>
          <img src={logo} alt="공농" style={{ height: "34px", width: "auto" }} />
          <button
            onClick={() => setSidebar(false)}
            aria-label="닫기"
            className="hover-muted"
            style={{
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#747C78",
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", fill: "currentColor" }}>
              <path d={ICON.close} />
            </svg>
          </button>
        </div>
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <button onClick={() => go("home")} style={navBtn(page === "home", easy)}>
            <span style={navIcon(page === "home")}>
              <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", fill: "currentColor" }}>
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </span>
            홈
          </button>
          <button onClick={() => go("history")} style={navBtn(page === "history", easy)}>
            <span style={navIcon(page === "history")}>
              <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", fill: "currentColor" }}>
                <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
              </svg>
            </span>
            시청 기록
          </button>
          <button onClick={() => go("mypage")} style={navBtn(page === "mypage", easy)}>
            <span style={navIcon(page === "mypage")}>
              <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", fill: "currentColor" }}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </span>
            마이페이지
          </button>
        </nav>
        <div style={{ padding: "20px", borderTop: "1px solid #E5E8E7", display: "flex", alignItems: "center", gap: "12px" }}>
          <img src={avatar} alt="프로필" style={{ width: "32px", height: "32px", borderRadius: "999px", objectFit: "cover", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>{profile.name}</p>
            <p style={{ fontSize: "11px", color: "#747C78", margin: 0 }}>{profile.email}</p>
          </div>
        </div>
      </aside>

      <Outlet context={{ closeSidebar: () => setSidebar(false) } satisfies AppLayoutContext} />
    </div>
  );
}

interface AppLayoutContext {
  closeSidebar: () => void;
}

export function useCloseSidebar(): () => void {
  return useOutletContext<AppLayoutContext>().closeSidebar;
}
