import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import signVideo from "../../imports/opening_intro.mp4";
import { ICON } from "../../constants";

const CYCLE_WORDS = ["    ", "수어", "AI", "실시간으"];

function fmtT(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function Hero() {
  const navigate = useNavigate();

  // cycling word animation
  const [wordIdx, setWordIdx] = useState(0);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function next() {
      setPhase("out");
      timerRef.current = setTimeout(() => {
        setWordIdx((i) => (i + 1) % CYCLE_WORDS.length);
        setPhase("in");
        timerRef.current = setTimeout(() => {
          setPhase("hold");
          timerRef.current = setTimeout(next, 1800);
        }, 420);
      }, 380);
    }
    timerRef.current = setTimeout(() => {
      setPhase("hold");
      timerRef.current = setTimeout(next, 1800);
    }, 900);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play(); setPlaying(true); }
  }

  function handleTimeUpdate() {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }

  function handleLoadedMetadata() {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    if (!v) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * duration;
  }

  function setVideoSpeed(s: number) {
    if (videoRef.current) videoRef.current.playbackRate = s;
    setSpeed(s);
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <section
      style={{
        background: "#fff",
        maxWidth: "1152px",
        margin: "0 auto",
        padding: "72px 48px 88px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "48px",
        alignItems: "center",
      }}
    >
      {/* Left — copy */}
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            fontSize: "clamp(44px, 5.5vw, 60px)",
            fontWeight: 700,
            lineHeight: 1.18,
            margin: "0 0 16px",
            letterSpacing: "-0.01em",
            color: "#111815",
            overflow: "hidden",
          }}
        >
          영상 속 말을
          <br />
          <span style={{ color: "#10B45F", display: "inline-flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", lineHeight: "inherit" }}>
              <span
                key={wordIdx}
                style={{
                  display: "inline-block",
                  animation:
                    phase === "in"
                      ? "gn-word-in 0.38s cubic-bezier(.22,.9,.25,1) forwards"
                      : phase === "out"
                      ? "gn-word-out 0.34s cubic-bezier(.55,0,1,.45) forwards"
                      : "none",
                  letterSpacing: "-0.01em",
                  opacity: phase === "hold" ? 1 : undefined,
                }}
              >
                {wordIdx === 0 ? (
                  <span style={{ display: "inline-block", width: "2.4em", borderBottom: "5px solid #10B45F", verticalAlign: "-0.05em" }} />
                ) : CYCLE_WORDS[wordIdx]}
              </span>
            </span>
            로 만나다
          </span>
        </h1>

        <p style={{ fontSize: "15px", color: "#747C78", lineHeight: 1.8, margin: "0 0 36px" }}>
          유튜브의 영상을 실시간으로 인식하고
          <br />
          수어로 변환해주는 서비스
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => navigate("/login")}
            className="hover-primary"
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10B45F", color: "#fff", fontWeight: 700, fontSize: "15px", padding: "14px 26px", border: "none", borderRadius: "999px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            서비스 시작하기
            <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
              <path d={ICON.chevronRight} />
            </svg>
          </button>
          <a
            href="#about"
            style={{ display: "flex", alignItems: "center", border: "1.5px solid #D0D8D4", background: "#fff", color: "#3d4640", fontWeight: 600, fontSize: "15px", padding: "13px 24px", borderRadius: "999px", cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none" }}
          >
            서비스 소개 보기
          </a>
        </div>
      </div>

      {/* Right — video player card */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E5E8E7",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,.08)",
        }}
      >
        {/* Video area */}
        <div style={{ position: "relative", background: "#1a2e1a", aspectRatio: "16/9", cursor: "pointer" }} onClick={togglePlay}>
          <video
            ref={videoRef}
            src={signVideo}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => { setPlaying(true); }}
            autoPlay
            loop
            muted
            playsInline
          />

          {/* 수어 영상 badge */}
          <div style={{ position: "absolute", top: "12px", left: "12px", background: "#10B45F", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px" }}>
            수어 영상
          </div>

          {/* Subtitle overlay */}
          <div style={{ position: "absolute", bottom: "40px", left: "12px", right: "12px", display: "flex", justifyContent: "center" }}>
            <p style={{ background: "rgba(0,0,0,.65)", color: "#fff", fontSize: "12px", fontWeight: 500, margin: 0, padding: "6px 12px", borderRadius: "8px", display: "inline-block", backdropFilter: "blur(4px)", textAlign: "center" }}>
              안녕하세요, 오늘은 공농 서비스에 대해 소개해드리겠습니다.
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 12px 8px" }}>
            <div onClick={(e) => { e.stopPropagation(); seek(e); }} style={{ height: "4px", background: "rgba(255,255,255,.3)", borderRadius: "999px", cursor: "pointer", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, background: "#10B45F", borderRadius: "999px" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#fff" }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                    <path d={playing ? "M6 19h4V5H6v14zm8-14v14h4V5h-4z" : "M8 5v14l11-7z"} />
                  </svg>
                </button>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,.8)", fontVariantNumeric: "tabular-nums" }}>
                  {fmtT(currentTime)} / {fmtT(duration)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "rgba(255,255,255,.7)" }}>
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
                <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "rgba(255,255,255,.7)" }}>
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Below video — subtitle + controls */}
        <div style={{ padding: "16px 16px 12px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 4px", color: "#171C19" }}>자막</p>
          <p style={{ fontSize: "13px", color: "#10B45F", margin: "0 0 14px", lineHeight: 1.5 }}>
            안녕하세요, 오늘은 공농 서비스에 대해 소개해드리겠습니다.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "11px", color: "#B0B8B4", margin: "0 0 2px" }}>재생 속도</p>
              <div style={{ display: "flex", gap: "6px" }}>
                {[0.5, 1, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setVideoSpeed(s)}
                    style={{ fontSize: "12px", fontWeight: speed === s ? 700 : 400, color: speed === s ? "#10B45F" : "#747C78", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                  >
                    {s === 1 ? "1.0x" : `${s}x`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "#B0B8B4", margin: "0 0 4px", textAlign: "right" }}>화면 모드</p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "#747C78" }}>
                  <svg viewBox="0 0 24 24" style={{ width: "18px", height: "18px", fill: "currentColor" }}>
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                </button>
                <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "#B0B8B4" }}>
                  <svg viewBox="0 0 24 24" style={{ width: "18px", height: "18px", fill: "currentColor" }}>
                    <path d={ICON.close} />
                  </svg>
                </button>
                <button onClick={togglePlay} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "#747C78" }}>
                  <svg viewBox="0 0 24 24" style={{ width: "18px", height: "18px", fill: "currentColor" }}>
                    <path d={playing ? "M6 19h4V5H6v14zm8-14v14h4V5h-4z" : "M8 5v14l11-7z"} />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
