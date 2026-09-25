import type { NavigateFunction } from "react-router-dom";
import type { HistoryItem } from "../../../types";
import { thumbOf } from "../../../utils/video";
import EmptyState from "../../common/EmptyState";

// Static confetti layout for the "시청 완료" screen — extracted verbatim from PlayerPage.
const CONFETTI = [
  { left: "5%",  size: 10, color: "#86EFAC", delay: 0,    dur: 1.8 },
  { left: "12%", size: 7,  color: "#FCA5A5", delay: 0.1,  dur: 2.1 },
  { left: "20%", size: 12, color: "#FCD34D", delay: 0.05, dur: 1.6 },
  { left: "28%", size: 8,  color: "#93C5FD", delay: 0.2,  dur: 2.3 },
  { left: "36%", size: 6,  color: "#F9A8D4", delay: 0,    dur: 1.9 },
  { left: "44%", size: 11, color: "#86EFAC", delay: 0.15, dur: 2.0 },
  { left: "50%", size: 8,  color: "#FCD34D", delay: 0.08, dur: 1.7 },
  { left: "57%", size: 9,  color: "#6EE7B7", delay: 0.25, dur: 2.2 },
  { left: "64%", size: 7,  color: "#FCA5A5", delay: 0.05, dur: 1.85 },
  { left: "71%", size: 13, color: "#93C5FD", delay: 0.18, dur: 2.0 },
  { left: "78%", size: 8,  color: "#86EFAC", delay: 0.1,  dur: 1.65 },
  { left: "84%", size: 6,  color: "#FCD34D", delay: 0.3,  dur: 2.1 },
  { left: "90%", size: 10, color: "#F9A8D4", delay: 0.12, dur: 1.9 },
  { left: "95%", size: 7,  color: "#6EE7B7", delay: 0.22, dur: 2.3 },
  { left: "8%",  size: 6,  color: "#FCA5A5", delay: 0.35, dur: 2.0 },
  { left: "33%", size: 9,  color: "#93C5FD", delay: 0.28, dur: 1.75 },
  { left: "60%", size: 7,  color: "#FCD34D", delay: 0.4,  dur: 2.2 },
  { left: "88%", size: 11, color: "#86EFAC", delay: 0.15, dur: 1.8 },
];

interface CompletionScreenProps {
  navigate: NavigateFunction;
  recentHistory: HistoryItem[];
}

export default function CompletionScreen({ navigate, recentHistory }: CompletionScreenProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: "0",
      }}
    >
      {/* Subtle green glow in corners */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "340px", height: "340px", borderRadius: "999px", background: "radial-gradient(circle, rgba(16,180,95,.10) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: "300px", height: "300px", borderRadius: "999px", background: "radial-gradient(circle, rgba(16,180,95,.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Confetti dots */}
      {CONFETTI.map((d, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            top: 0,
            left: d.left,
            width: `${d.size}px`,
            height: `${d.size}px`,
            borderRadius: "999px",
            background: d.color,
            pointerEvents: "none",
            animation: `gn-confetti ${d.dur}s ease-in ${d.delay}s 1 forwards`,
            zIndex: 50,
          }}
        />
      ))}

      {/* Check circle */}
      <div style={{ width: "88px", height: "88px", borderRadius: "999px", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px" }}>
        <svg viewBox="0 0 24 24" style={{ width: "44px", height: "44px", fill: "#10B45F" }}>
          <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </div>

      <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: "#111815", margin: "0 0 10px", textAlign: "center", letterSpacing: "-0.02em" }}>
        시청이 완료되었어요!
      </h1>
      <p style={{ fontSize: "16px", color: "#747C78", margin: "0 0 36px", textAlign: "center" }}>
        시청해 주셔서 감사합니다.
      </p>

      {/* Action buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginBottom: "48px" }}>
        <button
          onClick={() => navigate("/home")}
          style={{ fontSize: "17px", fontWeight: 700, background: "#10B45F", color: "#fff", border: "none", borderRadius: "16px", padding: "18px 36px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
        >
          다른 영상 시청하기
          <svg viewBox="0 0 24 24" style={{ width: "18px", height: "18px", fill: "currentColor" }}>
            <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
        <button
          onClick={() => navigate("/home")}
          style={{ fontSize: "17px", fontWeight: 700, background: "#EDF8F1", color: "#0b7a4d", border: "none", borderRadius: "16px", padding: "18px 36px", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          홈으로 돌아가기
        </button>
      </div>

      {/* Recent history */}
      <div style={{ width: "100%", maxWidth: "820px", background: "#fff", border: "1px solid #E8ECEB", borderRadius: "20px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <p style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#171C19" }}>최근 시청한 영상</p>
          <button onClick={() => navigate("/history")} style={{ fontSize: "13px", color: "#747C78", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}>
            더보기
            <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "currentColor" }}>
              <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <EmptyState
            padding="32px 0"
            color="#B0B8B4"
            title="최근 시청한 영상이 없어요"
            icon={
              <svg viewBox="0 0 24 24" style={{ width: "36px", height: "36px", fill: "currentColor", marginBottom: "8px" }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            }
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {recentHistory.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ position: "relative", width: "88px", height: "56px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, background: "#0a0c10" }}>
                  <img src={thumbOf(h.url)} alt={h.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
                  <span style={{ position: "absolute", bottom: "4px", left: "4px", fontSize: "10px", fontWeight: 700, color: "#fff", background: "rgba(0,0,0,.7)", padding: "1px 5px", borderRadius: "4px" }}>
                    {h.duration}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 4px", color: "#171C19", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                    {h.title}
                  </p>
                  <p style={{ fontSize: "12px", color: "#B0B8B4", margin: 0 }}>{h.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
