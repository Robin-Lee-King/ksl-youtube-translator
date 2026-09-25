"""Job-local timing, propagated automatically by asyncio.to_thread."""
import time
from contextlib import contextmanager
from contextvars import ContextVar
from functools import wraps
from collections import defaultdict


_job_id = ContextVar("timing_job_id", default=None)
render_metrics = ContextVar("render_metrics", default=None)
ffmpeg_metrics = ContextVar("ffmpeg_metrics", default=None)


def emit_metrics(category: str, message: str, job_id=None) -> None:
    identifier = job_id if job_id is not None else _job_id.get()
    prefix = f"[{category}]" + (f"[{identifier}]" if identifier is not None else "")
    try:
        print(f"{prefix} {message}", flush=True)
    except Exception:
        pass


class Metrics:
    def __init__(self):
        self.counts = defaultdict(int)
        self.seconds = defaultdict(float)
        self.sources = set()

    @contextmanager
    def measure(self, name):
        self.counts[name] += 1
        started = time.perf_counter()
        try:
            yield
        finally:
            self.seconds[name] += time.perf_counter() - started


@contextmanager
def measure(context, name):
    metrics = context.get()
    if metrics is None:
        yield
    else:
        with metrics.measure(name):
            yield


def measure_ffmpeg(name):
    def decorate(function):
        @wraps(function)
        def wrapped(*args, **kwargs):
            metrics = ffmpeg_metrics.get()
            if metrics is not None and name == "normalize":
                # Paths are compared only, never printed.
                metrics.sources.add(args[1] if len(args) > 1 else kwargs["src"])
            with measure(ffmpeg_metrics, name):
                return function(*args, **kwargs)
        return wrapped
    return decorate


def profile_merge(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        metrics = Metrics()
        token = ffmpeg_metrics.set(metrics)
        started = time.perf_counter()
        try:
            return function(*args, **kwargs)
        finally:
            total = time.perf_counter() - started
            ffmpeg_metrics.reset(token)
            lines = [f"{name}: count={metrics.counts[name]} total={metrics.seconds[name]:.2f}s"
                     for name in ("normalize", "idle_pose", "black", "speed", "concat")]
            lines += [f"normalize_calls={metrics.counts['normalize']} "
                      f"normalize_unique_sources={len(metrics.sources)}", f"merge_total={total:.2f}s"]
            emit_metrics("FFmpeg Timing", "\n" + "\n".join(lines))
    return wrapped


def profile_render(function):
    @wraps(function)
    def wrapped(job_id, *args, **kwargs):
        metrics = Metrics()
        token = render_metrics.set(metrics)
        job_token = _job_id.set(job_id)
        try:
            return function(job_id, *args, **kwargs)
        finally:
            render_metrics.reset(token)
            for name in ("DISPLAY_SEQUENCE_PREP", "S3_CLIP_RESOLVE", "FFPROBE_DURATION", "TIMELINE_CALC", "VIDEO_MERGE"):
                seconds = metrics.seconds[name]
                if name == "TIMELINE_CALC":
                    # Probe runs inside the timeline callback; avoid double-counting.
                    seconds = max(0.0, seconds - metrics.seconds["FFPROBE_DURATION"])
                emit_metrics("Render Timing", f"{name} - {seconds:.2f}s count={metrics.counts[name]}", job_id)
            emit_metrics("FFprobe Timing", f"executions={metrics.counts['FFPROBE_DURATION']} "
                         f"cache_hits={metrics.counts['cache_hits']} total={metrics.seconds['FFPROBE_DURATION']:.2f}s", job_id)
            _job_id.reset(job_token)
    return wrapped


def _emit(stage: str, message: str, job_id: str | None = None) -> None:
    identifier = job_id if job_id is not None else _job_id.get()
    prefix = f"[Timing][{identifier}]" if identifier is not None else "[Timing]"
    try:
        print(f"{prefix} {stage} {message}", flush=True)
    except Exception:
        # Instrumentation must never change pipeline success/failure behavior.
        pass


class StageTimer:
    failed = False


@contextmanager
def time_stage(stage: str, job_id: str | None = None):
    started = time.perf_counter()
    timer = StageTimer()
    _emit(stage, "시작", job_id)
    try:
        yield timer
    except BaseException:
        timer.failed = True
        raise
    finally:
        outcome = "실패/중단" if timer.failed else "완료"
        _emit(stage, f"{outcome} - {time.perf_counter() - started:.2f}s", job_id)


def time_job(function):
    @wraps(function)
    async def wrapped(job_id: str, *args, **kwargs):
        token = _job_id.set(job_id)
        started = time.perf_counter()
        _emit("TOTAL", "시작")
        try:
            return await function(job_id, *args, **kwargs)
        finally:
            _emit("TOTAL", f"- {time.perf_counter() - started:.2f}s")
            _job_id.reset(token)
    return wrapped
