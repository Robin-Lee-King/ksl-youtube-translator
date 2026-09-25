import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

export default function NavHeader() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: scrolled ? "rgba(255,255,255,.96)" : "rgba(255,255,255,.88)",
        backdropFilter: "blur(12px)",
        borderBottom: scrolled ? "1px solid #E5E8E7" : "1px solid transparent",
        transition: "background .25s, border-color .25s, box-shadow .25s",
        boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,.06)" : "none",
      }}
    >
      <div
        style={{
          maxWidth: "1152px",
          margin: "0 auto",
          padding: "0 24px",
          minHeight: "64px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <img src={logo} alt="공농" style={{ height: "34px", width: "auto" }} />

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {[
            { label: "서비스 소개", href: "#about" },
            { label: "기능", href: "#features" },
            { label: "이용 방법", href: "#how" },
            { label: "FAQ", href: "#faq" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover-dark"
              style={{
                color: "#747C78",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "10px",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#F0F2F1")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => navigate("/login")}
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#3d4640",
              background: "none",
              border: "none",
              padding: "8px 14px",
              borderRadius: "12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#F0F2F1")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
          >
            로그인
          </button>
          <button
            onClick={() => navigate("/login")}
            className="hover-primary"
            style={{
              fontSize: "14px",
              fontWeight: 700,
              background: "#10B45F",
              color: "#fff",
              border: "none",
              padding: "9px 18px",
              borderRadius: "12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 4px rgba(16,180,95,.3)",
              transition: "background .15s, box-shadow .15s",
            }}
          >
            회원가입
          </button>
        </div>
      </div>
    </header>
  );
}
