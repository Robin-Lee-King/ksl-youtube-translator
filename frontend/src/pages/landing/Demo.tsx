import { BULLETS, ICON } from "../../constants";
import signAvatar from "../../assets/sign-avatar.png";

const CHECK_PATH = ICON.check;

export default function Demo() {
  return (
    <section style={{ padding: "64px 24px", background: "#F7F8F8" }}>
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "48px",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ fontSize: "30px", fontWeight: 700, lineHeight: 1.35, margin: "0 0 16px" }}>
            영상 내용을
            <br />
            <span style={{ color: "#10B45F" }}>수어로 쉽게 이해해요</span>
          </h2>
          <p style={{ fontSize: "14px", color: "#747C78", lineHeight: 1.7, margin: "0 0 24px" }}>
            실시간 수어 변환으로
            <br />
            모든 영상을 더 가까이 느껴보세요.
          </p>
          <ul style={{ listStyle: "none", margin: "0 0 32px", padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {BULLETS.map((b) => (
              <li key={b} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: 500 }}>
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "999px",
                    background: "#10B45F",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: "12px", height: "12px", fill: "#fff" }}>
                    <path d={CHECK_PATH} />
                  </svg>
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,.07)" }}>
          <div
            style={{
              position: "relative",
              aspectRatio: "16 / 9",
              background: "linear-gradient(135deg, #1a2a1a, #0f1a12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src={signAvatar} alt="수어 아바타" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                fontSize: "10px",
                fontWeight: 600,
                background: "#10B45F",
                color: "#fff",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              수어 영상
            </span>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: "44px", display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  fontWeight: 500,
                  lineHeight: 1.5,
                  textAlign: "center",
                  color: "#fff",
                  background: "rgba(0,0,0,.6)",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  maxWidth: "90%",
                }}
              >
                안녕하세요, 오늘은 공농 서비스에 대해 소개해드리겠습니다.
              </p>
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "24px 12px 8px", background: "linear-gradient(to top, rgba(0,0,0,.7), transparent)" }}>
              <div style={{ height: "4px", background: "rgba(255,255,255,.2)", borderRadius: "999px", marginBottom: "8px" }}>
                <div style={{ height: "100%", width: "40%", background: "#10B45F", borderRadius: "999px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "rgba(255,255,255,.7)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px" }}>
                  <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  03:31 / 10:32
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                  <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E8E7" }}>
            <p style={{ fontSize: "12px", color: "#747C78", margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: "#171C19" }}>자막</strong>
              <br />
              안녕하세요, 오늘은 공농 서비스에 대해 소개해드리겠습니다.
            </p>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "12px", color: "#747C78", margin: "0 0 4px" }}>재생 속도</p>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>1.0x</span>
            </div>
            <div>
              <p style={{ fontSize: "12px", color: "#747C78", margin: "0 0 4px" }}>화면 모드</p>
              <div style={{ display: "flex", gap: "4px" }}>
                <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#F0FAF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "#10B45F" }}>
                    <path d="M3 5v4h2V5h4V3H5C3.9 3 3 3.9 3 5zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z" />
                  </svg>
                </span>
                <span style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "#747C78" }}>
                    <path d={ICON.close} />
                  </svg>
                </span>
                <span style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "#747C78" }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
