import { useEffect, useRef, useState } from "react";
import { loadYouTubeAPI, type YouTubePlayer } from "../../../utils/youtubePlayer";
import { thumbOf, vidId } from "../../../utils/video";

export interface YouTubeEvents {
  onReady(player: YouTubePlayer): void;
  onStateChange(state: number): void;
  onRateChange(rate: number): void;
  onError(): void;
  onBlocked(): void;
  onDispose(): void;
}

export default function YouTubeVideo({ currentUrl, watchUrl, events }: {
  currentUrl: string;
  watchUrl: string;
  events: YouTubeEvents;
}) {
  const host = useRef<HTMLDivElement>(null);
  const handlers = useRef(events);
  handlers.current = events;
  const [failed, setFailed] = useState(false);
  const videoId = vidId(currentUrl);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let player: YouTubePlayer | undefined;
    let readyTimeout: number | undefined;
    setFailed(false);
    const fail = () => {
      if (cancelled) return;
      window.clearTimeout(readyTimeout);
      setFailed(true);
      handlers.current.onError();
      player?.destroy();
      player = undefined;
    };
    if (!videoId) fail();
    else void loadYouTubeAPI(controller.signal).then((api) => {
      if (cancelled || !host.current) return;
      const target = document.createElement("div");
      host.current.replaceChildren(target);
      readyTimeout = window.setTimeout(fail, 15000);
      player = new api.Player(target, {
        width: "100%", height: "100%", videoId,
        playerVars: {
          enablejsapi: 1, playsinline: 1, controls: 0, rel: 0,
          disablekb: 1, fs: 0, autoplay: 0, origin: window.location.origin,
        },
        events: {
          onReady: ({ target: readyPlayer }) => {
            if (cancelled) return;
            window.clearTimeout(readyTimeout);
            handlers.current.onReady(readyPlayer);
          },
          onStateChange: ({ data }) => { if (!cancelled) handlers.current.onStateChange(data); },
          onPlaybackRateChange: ({ data }) => { if (!cancelled) handlers.current.onRateChange(data); },
          onError: fail,
          onAutoplayBlocked: () => { if (!cancelled) handlers.current.onBlocked(); },
        },
      });
    }).catch(fail);
    const container = host.current;
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(readyTimeout);
      handlers.current.onDispose();
      player?.destroy();
      container?.replaceChildren();
    };
  }, [videoId]);

  return <>
    <div ref={host} style={{ position: "absolute", inset: 0, display: failed ? "none" : "block" }} />
    {failed && <>
      <img src={thumbOf(currentUrl, "maxresdefault")} alt="원본 영상" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
      <div style={{ position: "relative", textAlign: "center", padding: "24px", zIndex: 1 }}>
        <p style={{ color: "white", fontSize: "14px" }}>원본 영상을 이 화면에서 재생할 수 없습니다</p>
        <a href={watchUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#10B45F", color: "white", padding: "10px 16px", borderRadius: "12px", fontSize: "12px", textDecoration: "none" }}>YouTube에서 보기</a>
      </div>
    </>}
  </>;
}
