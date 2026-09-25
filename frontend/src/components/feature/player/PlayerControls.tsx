import type { MouseEvent } from "react";
import { ICON, SPEEDS } from "../../../constants";
import { fmtTime } from "../../../utils/video";

interface PlayerControlsProps {
  syncStatus?: string;
  time: number;
  duration: number;
  progressPct: number;
  onSeek: (e: MouseEvent<HTMLDivElement>) => void;
  viewMode: "수어" | "자막";
  onViewModeChange: (mode: "수어" | "자막") => void;
  playing: boolean;
  onTogglePlay: () => void;
  onSkip: (deltaSec: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  speedOpen: boolean;
  onToggleSpeedOpen: () => void;
  showLayout: boolean;
  onToggleLayout: () => void;
  barZoom: number;
}

export default function PlayerControls({
  syncStatus = "동기화 준비 중",
  time,
  duration,
  progressPct,
  onSeek,
  viewMode,
  onViewModeChange,
  playing,
  onTogglePlay,
  onSkip,
  speed,
  onSpeedChange,
  speedOpen,
  onToggleSpeedOpen,
  showLayout,
  onToggleLayout,
  barZoom,
}: PlayerControlsProps) {
  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ borderRadius: "16px", padding: "16px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", zoom: barZoom }}>
        <div style={{ marginBottom: "16px" }}>
          <div onClick={onSeek} style={{ position: "relative", height: "6px", background: "rgba(255,255,255,.12)", borderRadius: "999px", cursor: "pointer" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progressPct}%`, background: "#10B45F", borderRadius: "999px" }} />
            <div style={{ position: "absolute", top: "-3px", left: `${progressPct}%`, width: "12px", height: "12px", marginLeft: "-6px", borderRadius: "999px", background: "#10B45F" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "rgba(255,255,255,.35)", marginTop: "6px" }}>
            <span>{fmtTime(time)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "2px", borderRadius: "12px", padding: "4px", background: "rgba(255,255,255,.05)" }}>
            <button
              onClick={() => onViewModeChange("수어")}
              aria-pressed={viewMode === "수어"}
              style={{ fontSize: "12px", fontWeight: 600, padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer", background: viewMode === "수어" ? "#10B45F" : "transparent", color: viewMode === "수어" ? "#fff" : "rgba(255,255,255,.4)" }}
            >
              수어
            </button>
            <button
              onClick={() => onViewModeChange("자막")}
              aria-pressed={viewMode === "자막"}
              style={{ fontSize: "12px", fontWeight: 600, padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer", background: viewMode === "자막" ? "#10B45F" : "transparent", color: viewMode === "자막" ? "#fff" : "rgba(255,255,255,.4)" }}
            >
              자막
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => onSkip(-10)} aria-label="10초 뒤로" className="hover-white" style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", cursor: "pointer", display: "flex" }}>
              <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", fill: "currentColor" }}>
                <path d="M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z" />
              </svg>
            </button>
            <button
              onClick={onTogglePlay}
              aria-label={playing ? "일시정지" : "재생"}
              style={{ width: "44px", height: "44px", borderRadius: "999px", background: "#10B45F", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", fill: "#fff" }}>
                <path d={playing ? ICON.pause : ICON.play} />
              </svg>
            </button>
            <button onClick={() => onSkip(10)} aria-label="10초 앞으로" className="hover-white" style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", cursor: "pointer", display: "flex" }}>
              <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", fill: "currentColor" }}>
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={onToggleSpeedOpen}
                style={{ fontSize: "12px", fontWeight: 600, padding: "8px 12px", borderRadius: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap", background: speedOpen ? "#10B45F" : "rgba(255,255,255,.07)", color: speedOpen ? "#fff" : "rgba(255,255,255,.5)" }}
              >
                {speed === 1 ? "배속" : `${speed}x`}
                <svg viewBox="0 0 24 24" style={{ width: "12px", height: "12px", fill: "currentColor", transform: speedOpen ? "rotate(180deg)" : "none" }}>
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>
              {speedOpen && (
                <div style={{ position: "absolute", bottom: "100%", marginBottom: "8px", right: 0, borderRadius: "12px", overflow: "hidden", padding: "4px 0", background: "#1e2530", border: "1px solid rgba(255,255,255,.1)", minWidth: "96px", zIndex: 30 }}>
                  {SPEEDS.map((v) => (
                    <button
                      key={v}
                      onClick={() => onSpeedChange(v)}
                      style={{ width: "100%", textAlign: "center", fontSize: "12px", padding: "8px 16px", border: "none", cursor: "pointer", color: speed === v ? "#10B45F" : "rgba(255,255,255,.6)", background: speed === v ? "rgba(16,180,95,.1)" : "transparent", fontWeight: speed === v ? 700 : 400 }}
                    >
                      {v === 1 ? "1x (기본)" : `${v}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onToggleLayout}
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, padding: "8px 12px", borderRadius: "12px", border: "none", cursor: "pointer", whiteSpace: "nowrap", background: showLayout ? "#10B45F" : "rgba(255,255,255,.07)", color: showLayout ? "#fff" : "rgba(255,255,255,.5)" }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                <path d="M3 5v4h2V5h4V3H5C3.9 3 3 3.9 3 5zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z" />
              </svg>
              레이아웃
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "rgba(255,255,255,.3)", whiteSpace: "nowrap" }}>
              <span style={{ width: "6px", height: "6px", background: "#10B45F", borderRadius: "999px" }} />
              {syncStatus}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
