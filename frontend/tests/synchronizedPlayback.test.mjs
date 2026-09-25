import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real hook with deterministic hook slots and fake media objects.
// No browser/YouTube/S3 requests or extra test dependencies.
function harness() {
  const slots = [], effects = [], intervals = new Map();
  let cursor = 0, nextId = 0, now = 10000;
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = value;
      return [slots[i], (next) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useEffect(fn, deps) {
      const i = cursor++, old = slots[i];
      if (!old || deps.some((v, j) => v !== old.deps[j])) {
        effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  const exports = {};
  const source = fs.readFileSync(new URL('../src/hooks/useSynchronizedPlayback.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require: () => react, performance: { now: () => now },
    window: { setInterval: (fn) => { intervals.set(++nextId, fn); return nextId; }, clearInterval: (id) => intervals.delete(id) } });
  const calls = [];
  const video = { currentTime: 0, duration: 100, playbackRate: 1, paused: true, seeking: false,
    play() { calls.push('sign-play'); this.paused = false; return Promise.resolve(); },
    pause() { calls.push('sign-pause'); this.paused = true; } };
  let ytTime = 0, ytState = 2;
  const youtube = {
    playVideo() { calls.push('yt-play'); ytState = 1; },
    pauseVideo() { calls.push('yt-pause'); ytState = 2; },
    seekTo(t) { calls.push(['seek', t]); ytTime = t; },
    getCurrentTime: () => ytTime, getDuration: () => 100, getPlayerState: () => ytState,
    getAvailablePlaybackRates: () => [0.5, 1, 1.5, 2], getPlaybackRate: () => 1,
    setPlaybackRate: (rate) => calls.push(['rate', rate]), unMute() {},
  };
  const h = {
    calls, video, youtube, intervals,
    render() { cursor = 0; h.api = exports.useSynchronizedPlayback('https://youtu.be/test', '/result.mp4', 1); h.api.videoRef.current = video; effects.splice(0).forEach(fn => fn()); },
    ready() { h.api.onLoadedMetadata(); h.api.youtubeEvents.onReady(youtube); h.render(); calls.length = 0; },
    tick(time, originalTime) { now = time; ytTime = originalTime; intervals.forEach(fn => fn()); },
    cleanup() { slots.forEach(slot => slot?.cleanup?.()); },
  };
  h.render(); return h;
}

test('waits for readiness; controls play/pause, seek, skip and supported speed on both', () => {
  const h = harness(); h.calls.length = 0;
  h.api.togglePlay(); assert.equal(h.calls.length, 0);
  h.ready(); h.api.togglePlay();
  assert.ok(h.calls.includes('yt-play')); assert.ok(h.calls.includes('sign-play'));
  h.render(); h.api.seekTo(24); assert.equal(h.video.currentTime, 24);
  assert.ok(h.calls.some(c => Array.isArray(c) && c[0] === 'seek' && c[1] === 24));
  h.api.skip(10); assert.equal(h.video.currentTime, 34);
  h.api.changeSpeed(1.7); assert.equal(h.video.playbackRate, 1.5);
  h.api.togglePlay(); assert.equal(h.video.paused, true); assert.ok(h.calls.includes('yt-pause'));
  h.cleanup();
});

test('drift correction uses sign clock and throttles seeks', () => {
  const h = harness(); h.ready(); h.api.togglePlay(); h.calls.length = 0;
  h.video.currentTime = 10;
  h.tick(12500, 8); h.tick(13000, 8);
  assert.equal(h.calls.filter(c => Array.isArray(c) && c[0] === 'seek').length, 1);
  h.tick(15000, 9.8);
  assert.equal(h.calls.filter(c => Array.isArray(c) && c[0] === 'seek').length, 1);
  h.cleanup(); assert.equal(h.intervals.size, 0);
});

test('YouTube buffering pauses sign and resumes after original is playing', () => {
  const h = harness(); h.ready(); h.api.togglePlay();
  h.api.youtubeEvents.onStateChange(3); assert.equal(h.video.paused, true);
  h.api.youtubeEvents.onStateChange(1); assert.equal(h.video.paused, false);
  h.api.onWaiting(); assert.equal(h.calls.at(-1), 'yt-pause');
  h.api.onCanPlay(); assert.ok(h.calls.includes('yt-play')); h.cleanup();
});

test('original end does not complete job; sign end does and clears interval', () => {
  const h = harness(); h.ready(); h.api.togglePlay();
  h.api.youtubeEvents.onStateChange(0); h.render(); assert.equal(h.api.done, false);
  h.api.onEnded(); h.render(); assert.equal(h.api.done, true); assert.equal(h.intervals.size, 0);
  h.cleanup();
});

test('embed failure still allows sign playback; autoplay block pauses both', () => {
  const h = harness(); h.ready(); h.api.youtubeEvents.onBlocked();
  assert.equal(h.video.paused, true);
  h.api.youtubeEvents.onError(); h.render(); h.calls.length = 0;
  h.api.togglePlay(); assert.ok(h.calls.includes('sign-play')); assert.ok(!h.calls.includes('yt-play'));
  h.cleanup();
});

function loaderHarness() {
  const scripts = [], timers = new Map();
  let nextId = 0;
  const window = {
    setTimeout(fn) { timers.set(++nextId, fn); return nextId; },
    clearTimeout(id) { timers.delete(id); },
  };
  const document = {
    head: { appendChild(script) { scripts.push(script); } },
    createElement() { return { addEventListener() {}, removeEventListener() {}, remove() { this.removed = true; } }; },
  };
  const exports = {};
  const source = fs.readFileSync(new URL('../src/utils/youtubePlayer.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, window, document });
  return { load: exports.loadYouTubeAPI, window, scripts, timers };
}

test('API loader cancels timers on unmount and supports immediate StrictMode remount', async () => {
  const h = loaderHarness(), first = new AbortController(), second = new AbortController();
  const cancelled = h.load(first.signal).catch(() => 'cancelled');
  first.abort();
  assert.equal(h.timers.size, 0);
  assert.equal(h.scripts[0].removed, true);
  const loaded = h.load(second.signal);
  h.window.YT = { Player: class {} };
  h.window.onYouTubeIframeAPIReady();
  assert.equal(await cancelled, 'cancelled');
  assert.equal(await loaded, h.window.YT);
  assert.equal(h.timers.size, 0);
  assert.equal(h.window.onYouTubeIframeAPIReady, undefined);
});

test('API loader shares a script; one subscriber leaving does not cancel another', async () => {
  const h = loaderHarness(), first = new AbortController(), second = new AbortController();
  const cancelled = h.load(first.signal).catch(() => 'cancelled');
  const loaded = h.load(second.signal);
  assert.equal(h.scripts.length, 1);
  first.abort(); assert.equal(h.timers.size, 1);
  h.window.YT = { Player: class {} };
  h.window.onYouTubeIframeAPIReady();
  assert.equal(await cancelled, 'cancelled');
  assert.equal(await loaded, h.window.YT);
});
