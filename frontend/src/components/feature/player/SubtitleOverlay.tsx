import type { Subtitle } from "../../../mocks/subtitles";

interface SubtitleOverlayProps {
  easy: boolean;
  sub: Subtitle | undefined;
}

export default function SubtitleOverlay({ easy, sub }: SubtitleOverlayProps) {
  if (easy) {
    return (
      <div style={{ position: "absolute", bottom: "12px", left: "12px", right: "12px", pointerEvents: "none", zIndex: 20 }}>
        <div
          style={{
            borderRadius: "20px",
            padding: "20px 24px",
            backdropFilter: "blur(10px)",
            boxShadow: "0 12px 32px rgba(0,0,0,.4)",
            background: sub && sub.lowConf ? "rgba(67,20,7,.92)" : "rgba(10,14,20,.88)",
            border: sub && sub.lowConf ? "1.5px solid rgba(249,115,22,.4)" : "1.5px solid rgba(255,255,255,.08)",
          }}
        >
          <p style={{ fontSize: "11px", fontWeight: 600, color: sub && sub.lowConf ? "rgba(251,146,60,.7)" : "rgba(255,255,255,.35)", margin: "0 0 6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            자막
          </p>
          <p
            style={{
              fontSize: "22px",
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.45,
              letterSpacing: "-0.01em",
              color: sub && sub.lowConf ? "#ffedd5" : "#fff",
            }}
          >
            {sub ? sub.text : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", bottom: "12px", left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 20 }}>
      <p
        style={{
          fontSize: "16px",
          fontWeight: 600,
          padding: "12px 24px",
          borderRadius: "16px",
          textAlign: "center",
          maxWidth: "80%",
          margin: 0,
          lineHeight: 1.5,
          backdropFilter: "blur(6px)",
          boxShadow: "0 8px 24px rgba(0,0,0,.3)",
          background: sub && sub.lowConf ? "rgba(67,20,7,.9)" : "rgba(0,0,0,.75)",
          color: sub && sub.lowConf ? "#ffedd5" : "#fff",
          border: sub && sub.lowConf ? "1px solid rgba(249,115,22,.3)" : "none",
        }}
      >
        {sub ? sub.text : ""}
      </p>
    </div>
  );
}
