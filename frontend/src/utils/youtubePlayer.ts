export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getAvailablePlaybackRates(): number[];
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  unMute(): void;
  destroy(): void;
}

interface PlayerEvent { target: YouTubePlayer }
interface PlayerOptions {
  width: string;
  height: string;
  videoId: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady(event: PlayerEvent): void;
    onStateChange(event: PlayerEvent & { data: number }): void;
    onPlaybackRateChange(event: PlayerEvent & { data: number }): void;
    onError(event: PlayerEvent & { data: number }): void;
    onAutoplayBlocked(event: PlayerEvent): void;
  };
}
interface YouTubeAPI { Player: new (element: HTMLElement, options: PlayerOptions) => YouTubePlayer }

declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeAPI> | undefined;
let subscribers = 0;
let cancelLoad: (() => void) | undefined;

// Shared script, but every mounted player has its own lifetime and cancellation.
function sharedAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    const cleanup = () => {
      cancelLoad = undefined;
      window.clearTimeout(timeout);
      script.removeEventListener("error", fail);
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous;
    };
    const fail = () => {
      cleanup();
      script.remove();
      apiPromise = undefined;
      reject(new Error("YouTube player API could not be loaded"));
    };
    const ready = () => {
      cleanup();
      if (window.YT?.Player) resolve(window.YT);
      else {
        apiPromise = undefined;
        reject(new Error("YouTube player API unavailable"));
      }
      previous?.();
    };
    const timeout = window.setTimeout(fail, 15000);
    cancelLoad = fail;
    window.onYouTubeIframeAPIReady = ready;
    script.addEventListener("error", fail);
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function loadYouTubeAPI(signal: AbortSignal): Promise<YouTubeAPI> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("Player unmounted")); return; }
    subscribers += 1;
    let settled = false;
    const release = () => {
      if (settled) return false;
      settled = true;
      signal.removeEventListener("abort", abort);
      subscribers -= 1;
      return true;
    };
    const abort = () => {
      if (!release()) return;
      reject(new Error("Player unmounted"));
      if (subscribers === 0) cancelLoad?.();
    };
    signal.addEventListener("abort", abort);
    void sharedAPI().then((api) => { if (release()) resolve(api); },
      (error: unknown) => { if (release()) reject(error); });
  });
}
