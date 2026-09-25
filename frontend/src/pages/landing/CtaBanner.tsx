import { useNavigate } from "react-router-dom";
import { ICON } from "../../constants";

export default function CtaBanner() {
  const navigate = useNavigate();

  return (
    <section
      style={{
        background: "#EDF8F1",
        padding: "64px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              margin: "0 0 8px",
              color: "#171C19",
              letterSpacing: "-0.01em",
            }}
          >
            공농과 함께 더 편리한 세상을 만들어요
          </h2>
          <p style={{ fontSize: "14px", color: "#5c655f", margin: 0 }}>
            지금 시작하고, 소통의 변화를 경험해보세요!
          </p>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="hover-primary"
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#10B45F",
            color: "#fff",
            fontWeight: 700,
            fontSize: "15px",
            padding: "14px 26px",
            border: "none",
            borderRadius: "999px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          무료로 시작하기
          <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
            <path d={ICON.chevronRight} />
          </svg>
        </button>
      </div>
    </section>
  );
}
