import { useEffect, useRef, useState } from "react";
import type { YouTubePlayer } from "../utils/youtubePlayer";
import type { YouTubeEvents } from "../components/feature/player/YouTubeVideo";

export function useSynchronizedPlayback(currentUrl: string, resultVideoUrl: string | undefined, initialSpeed: number) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const wanted = useRef(false);
  const signBuffering = useRef(false);
  const lastSeek = useRef(0);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [youtubeFailed, setYoutubeFailed] = useState(false);
  const [signReady, setSignReady] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const [message, setMessage] = useState("");
  const hasSign = !!resultVideoUrl;

  function pause() {
    wanted.current = false;
    videoRef.current?.pause();
    youtubePlayerRef.current?.pauseVideo();
    setPlaying(false);
  }

  function playSign() {
    const video = videoRef.current;
    if (!hasSign || !video || !video.paused || !wanted.current) return;
    void video.play().then(() => {
      if (!wanted.current) video.pause();
    }).catch((error: unknown) => {
      // Buffering or a quick pause can interrupt an in-flight play() normally.
      if (error instanceof Error && error.name === "AbortError") return;
      if (!wanted.current) return;
      pause();
      setMessage("재생을 시작하지 못했습니다. 재생 버튼을 다시 눌러 주세요.");
    });
  }

  function seekTo(value: number) {
    if (hasSign && !signReady) return;
    const next = Math.max(0, Math.min(duration, value));
    lastSeek.current = performance.now();
    if (hasSign && videoRef.current) videoRef.current.currentTime = next;
    youtubePlayerRef.current?.seekTo(next, true);
    if (!wanted.current) youtubePlayerRef.current?.pauseVideo();
    setTime(next);
  }

  function changeSpeed(value: number) {
    const player = youtubePlayerRef.current;
    let supported: number[] = [];
    try { supported = player?.getAvailablePlaybackRates() ?? []; } catch { /* Keep the sign speed usable. */ }
    const rate = supported.length ? supported.reduce((best, next) =>
      Math.abs(next - value) < Math.abs(best - value) ? next : best) : value;
    setSpeed(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    try { player?.setPlaybackRate(rate); } catch { /* Some videos cannot change rate. */ }
  }

  const youtubeEvents: YouTubeEvents = {
    onReady(player) {
      youtubePlayerRef.current = player;
      setYoutubeReady(true);
      setYoutubeFailed(false);
      player.unMute();
      player.pauseVideo();
      // The constructor cues at zero. Seeking an unstarted player can autoplay.
      const currentTime = videoRef.current?.currentTime ?? 0;
      if (currentTime > 0) { player.seekTo(currentTime, true); player.pauseVideo(); }
      if (!hasSign) setDuration(player.getDuration());
      changeSpeed(speed);
    },
    onStateChange(state) {
      if (state === 1) {
        if (!wanted.current || signBuffering.current) youtubePlayerRef.current?.pauseVideo();
        else {
          playSign();
          setPlaying(true);
        }
      } else if (state === 3 && wanted.current && hasSign) {
        // Keep the user's play intent while the original buffers.
        videoRef.current?.pause();
      } else if (state === 2 && wanted.current && !signBuffering.current && performance.now() - lastSeek.current > 1500) {
        pause();
      } else if (state === 0) {
        if (!hasSign) { pause(); setDone(true); }
        else playSign(); // Sign video remains the completion authority.
      }
    },
    onRateChange(rate) {
      if (rate > 0) {
        setSpeed(rate);
        if (videoRef.current) videoRef.current.playbackRate = rate;
      }
    },
    onError() {
      pause();
      youtubePlayerRef.current = null;
      setYoutubeReady(false);
      setYoutubeFailed(true);
      setMessage("원본 재생 불가 · 수어 영상은 재생할 수 있습니다.");
    },
    onBlocked() {
      pause();
      setMessage("브라우저가 재생을 차단했습니다. 재생 버튼을 다시 눌러 주세요.");
    },
    onDispose() {
      youtubePlayerRef.current = null;
      setYoutubeReady(false);
      setYoutubeFailed(false);
    },
  };

  function togglePlay() {
    if (wanted.current) { pause(); return; }
    if ((hasSign && !signReady) || (!youtubeReady && !youtubeFailed)) {
      setMessage("영상을 준비 중입니다. 잠시 후 재생해 주세요.");
      return;
    }
    if (!hasSign && !youtubeReady) return;
    wanted.current = true;
    signBuffering.current = false;
    lastSeek.current = performance.now();
    setMessage("");
    youtubePlayerRef.current?.seekTo(videoRef.current?.currentTime ?? time, true);
    youtubePlayerRef.current?.playVideo();
    playSign();
    setPlaying(true);
  }

  useEffect(() => {
    wanted.current = false;
    signBuffering.current = false;
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setDone(false);
    setSignReady(false);
    setMessage("");
    const video = videoRef.current;
    video?.pause();
    youtubePlayerRef.current?.pauseVideo();
    return () => {
      wanted.current = false;
      video?.pause();
    };
  }, [currentUrl, resultVideoUrl]);

  useEffect(() => {
    if (done) return;
    const interval = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player) return;
      if (!hasSign) {
        setTime(player.getCurrentTime());
        setDuration(player.getDuration());
        return;
      }
      const video = videoRef.current;
      if (!wanted.current || !video || video.paused || video.seeking || player.getPlayerState() !== 1) return;
      const now = performance.now();
      if (now - lastSeek.current >= 2000 && Math.abs(player.getCurrentTime() - video.currentTime) > 0.45) {
        player.seekTo(video.currentTime, true);
        lastSeek.current = now;
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, [hasSign, done]);

  return {
    videoRef, youtubeEvents, time, duration, playing, done, speed, changeSpeed, togglePlay, pause, seekTo,
    skip: (delta: number) => seekTo((hasSign ? videoRef.current?.currentTime ?? time : youtubePlayerRef.current?.getCurrentTime() ?? time) + delta),
    status: message || (youtubeFailed ? "원본 재생 불가" : !youtubeReady || (hasSign && !signReady) ? "영상 준비 중" : hasSign ? "동기화 준비됨" : "원본 재생"),
    onLoadedMetadata() {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      video.currentTime = 0;
      video.playbackRate = speed;
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setSignReady(true);
      setTime(0);
      youtubePlayerRef.current?.seekTo(0, true);
      youtubePlayerRef.current?.pauseVideo();
    },
    onTimeUpdate: () => setTime(videoRef.current?.currentTime ?? 0),
    onEnded() { pause(); setDone(true); },
    onWaiting() {
      if (!wanted.current) return;
      signBuffering.current = true;
      youtubePlayerRef.current?.pauseVideo();
    },
    onCanPlay() {
      if (!wanted.current || !signBuffering.current) return;
      signBuffering.current = false;
      lastSeek.current = performance.now();
      youtubePlayerRef.current?.playVideo();
      playSign();
    },
    onVideoError() { pause(); setSignReady(false); setMessage("수어 영상을 불러올 수 없습니다."); },
  };
}
