import { useSynchronizedPlayback } from "../hooks/useSynchronizedPlayback";
import { resolveVideoUrl } from "../utils/video";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEasyMode } from "../state/AppContext";
import { useUser } from "../state/UserContext";
import { useVideo } from "../state/VideoContext";
import { LAYOUT_FLEX, type LayoutId } from "../constants";
import { vidId } from "../utils/video";
import { MOCK_SUBTITLES, type Subtitle } from "../mocks/subtitles";
import CompletionScreen from "../components/feature/player/CompletionScreen";
import LayoutPicker from "../components/feature/player/LayoutPicker";
import VideoStage from "../components/feature/player/VideoStage";
import ConfidenceBanner from "../components/feature/player/ConfidenceBanner";
import SubtitleOverlay from "../components/feature/player/SubtitleOverlay";
import PlayerControls from "../components/feature/player/PlayerControls";

function deriveDefaultLayout(prefs: string[]): LayoutId {
  if (prefs.includes("원본 영상을 크게 보고 싶어요")) return "original-large";
  if (prefs.includes("수어를 크게 보고 싶어요")) return "sign-large";
  return "side-by-side";
}

export default function PlayerPage() {
  const navigate = useNavigate();
  const easy = useEasyMode();
  const { settings, onboarding } = useUser();
  const { currentUrl, history, currentJob } = useVideo();

  // A freshly-completed conversion carries its result on currentJob (result.video_url, per the
  // backend's Job schema); replaying an older item from HistoryPage instead matches it by URL to
  // read resultVideoUrl off the HistoryItem. Neither is set for an empty/in-progress history, so
  // hasRealVideo is false and the panel below falls back to the original placeholder.
  const matchedHistory = history.find((h) => h.url === currentUrl) ?? null;
  const resultVideoUrl = resolveVideoUrl(currentJob?.result?.video_url ?? matchedHistory?.resultVideoUrl);
  const hasRealVideo = !!resultVideoUrl;
  const playback = useSynchronizedPlayback(currentUrl, resultVideoUrl, parseFloat(settings.defaultSpeed) || 1);
  const { videoRef, time, duration, playing, done, speed } = playback;

  const [layout, setLayout] = useState<LayoutId>(() => deriveDefaultLayout(onboarding.prefs));
  const [showLayout, setShowLayout] = useState(false);
  // Tracks which specific low-confidence segment was dismissed (not just "any dismissed ever"), so
  // dismissing the banner for one segment doesn't permanently hide it for every later segment too.
  const [dismissedSub, setDismissedSub] = useState<Subtitle | null>(null);
  const [viewMode, setViewMode] = useState<"수어" | "자막">("수어");
  const [speedOpen, setSpeedOpen] = useState(false);

  useEffect(() => {
    if (!currentUrl) navigate("/home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  useEffect(() => {
    const sub = MOCK_SUBTITLES.find((s) => time >= s.start && time <= s.end);
    if (sub?.lowConf && settings.autoSwitch) setViewMode("자막");
  }, [time, settings.autoSwitch]);

  const sub = MOCK_SUBTITLES.find((s) => time >= s.start && time <= s.end);
  const showConf = dismissedSub !== sub && !!(sub && sub.lowConf);
  const showSubtitle = settings.subtitles && viewMode === "자막" && !!sub;
  const showOriginal = layout !== "sign-only";
  const showSign = layout !== "original-only";
  const layoutFlex = LAYOUT_FLEX[layout];
  const progressPct = duration > 0 ? (time / duration) * 100 : 0;
  const playerTitle = vidId(currentUrl) ? `YouTube · ${vidId(currentUrl)}` : currentUrl || "영상 없음";
  const watchUrl = vidId(currentUrl) ? `https://www.youtube.com/watch?v=${vidId(currentUrl)}` : "https://www.youtube.com";

  function backHome() {
    playback.pause();
    navigate("/home");
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const next = Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration));
    playback.seekTo(next);
  }

  const barZoom = easy ? 1.5 : 1;
  const recentHistory = history.filter((h) => h.status === "완료").slice(0, 3);

  if (done) {
    return <CompletionScreen navigate={navigate} recentHistory={recentHistory} />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0F1318" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <button
          onClick={backHome}
          className="hover-white"
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "rgba(255,255,255,.6)", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          뒤로
        </button>
        <p style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,.7)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {playerTitle}
        </p>
      </div>

      {showLayout && <LayoutPicker layout={layout} onSelect={(id) => { setLayout(id); setShowLayout(false); }} onClose={() => setShowLayout(false)} />}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px", gap: "12px", position: "relative", minHeight: 0 }}>
        <VideoStage
          layout={layout}
          showOriginal={showOriginal}
          showSign={showSign}
          layoutFlex={layoutFlex}
          currentUrl={currentUrl}
          watchUrl={watchUrl}
          hasRealVideo={hasRealVideo}
          resultVideoUrl={resultVideoUrl}
          videoRef={videoRef}
          playing={playing}
          youtubeEvents={playback.youtubeEvents}
          onTimeUpdate={playback.onTimeUpdate}
          onLoadedMetadata={playback.onLoadedMetadata}
          onWaiting={playback.onWaiting}
          onCanPlay={playback.onCanPlay}
          onVideoError={playback.onVideoError}
          onEnded={playback.onEnded}
        />

        {showConf && <ConfidenceBanner onShowSubtitle={() => setViewMode("자막")} onDismiss={() => setDismissedSub(sub ?? null)} />}

        {showSubtitle && <SubtitleOverlay easy={easy} sub={sub} />}
      </div>

      <PlayerControls
        syncStatus={playback.status}
        time={time}
        duration={duration}
        progressPct={progressPct}
        onSeek={seek}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        playing={playing}
        onTogglePlay={playback.togglePlay}
        onSkip={playback.skip}
        speed={speed}
        onSpeedChange={(v) => {
          playback.changeSpeed(v);
          setSpeedOpen(false);
        }}
        speedOpen={speedOpen}
        onToggleSpeedOpen={() => setSpeedOpen((o) => !o)}
        showLayout={showLayout}
        onToggleLayout={() => setShowLayout((s) => !s)}
        barZoom={barZoom}
      />
    </div>
  );
}
