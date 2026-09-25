"""Request-scoped Gemini clients: ordered quota failover and bounded retries."""
import math
import os
import random
import time
from contextlib import ExitStack
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from google import genai
from google.genai import types

KEY_NAMES = ("JY", "GYU", "RB", "JH")


class GeminiConfigurationError(ValueError):
    """No explicitly configured Gemini credentials are available."""


def load_api_keys() -> list[tuple[str, str]]:
    keys = [(name, os.environ.get(f"GEMINI_API_KEY_{name}", "").strip()) for name in KEY_NAMES]
    keys = [(name, key) for name, key in keys if key]
    if keys:
        return keys
    legacy = os.environ.get("GEMINI_API_KEY", "").strip()
    if legacy:
        return [("LEGACY", legacy)]
    raise GeminiConfigurationError(
        "Gemini API key 설정 누락: GEMINI_API_KEY_JY/GYU/RB/JH 또는 GEMINI_API_KEY가 필요합니다"
    )


def _env_int(name: str, default: int, minimum: int) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
        return value if value >= minimum else default
    except ValueError:
        return default


def _seconds(value) -> float | None:
    try:
        seconds = float(value)
        return seconds if math.isfinite(seconds) and seconds >= 0 else None
    except (TypeError, ValueError):
        return None


def _server_retry_delay(exc: Exception) -> float | None:
    headers = getattr(getattr(exc, "response", None), "headers", {}) or {}
    retry_after = headers.get("retry-after") or headers.get("Retry-After")
    if retry_after is not None:
        seconds = _seconds(retry_after)
        if seconds is not None:
            return seconds
        try:
            return max(0.0, (parsedate_to_datetime(retry_after) - datetime.now(timezone.utc)).total_seconds())
        except (TypeError, ValueError, OverflowError):
            pass
    payload = getattr(exc, "details", None)
    if isinstance(payload, dict):
        error = payload.get("error", payload)
        details = error.get("details", []) if isinstance(error, dict) else []
    else:
        details = payload
    for detail in details if isinstance(details, list) else []:
        if not isinstance(detail, dict):
            continue
        delay = detail.get("retryDelay")
        if isinstance(delay, str) and delay.endswith("s"):
            seconds = _seconds(delay[:-1])
        elif isinstance(delay, dict):
            seconds, nanos = _seconds(delay.get("seconds", 0)), _seconds(delay.get("nanos", 0))
            seconds = seconds + nanos / 1e9 if seconds is not None and nanos is not None else None
        else:
            seconds = None
        if seconds is not None:
            return seconds
    return None


def generate_content(*, model, contents, config, max_retries=None):
    """429 advances keys; 503 retries the same key. Share one backoff budget.

    Clients are lazily created and closed per logical request, avoiding shared
    key cursors across worker threads. At most N * (max_retries + 1) calls.
    max_retries=0 still permits one quota-failover cycle (subtitle policy).
    """
    keys = load_api_keys()
    if max_retries is None:
        max_retries = _env_int("GEMINI_MAX_RETRIES", 3, 0)
    index = retries = 0
    quota_delays = []
    with ExitStack() as stack:
        clients = {}
        while True:
            name, key = keys[index]
            if index not in clients:
                clients[index] = stack.enter_context(genai.Client(
                    api_key=key,
                    http_options=types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1)),
                ))
            print(f"[Gemini Key] {name} 사용", flush=True)
            try:
                return clients[index].models.generate_content(model=model, contents=contents, config=config)
            except Exception as exc:
                code = getattr(exc, "code", None)
                if code not in (429, 503):
                    raise
                delay = _server_retry_delay(exc)
                if code == 429:
                    if delay is not None:
                        quota_delays.append(delay)
                    if index + 1 < len(keys):
                        print(f"[Gemini Failover] {name}에서 429 발생 → {keys[index + 1][0]}로 전환", flush=True)
                        index += 1
                        continue
                    if quota_delays:
                        delay = max(quota_delays)
                if retries >= max_retries:
                    raise
                if delay is None:
                    delay = 2 * (2 ** retries) + random.uniform(0, 0.5)
                retries += 1
                print(f"[Gemini Retry] {code} 발생 - {delay:.1f}초 후 재시도 ({retries}/{max_retries})", flush=True)
                time.sleep(delay)
                if code == 429:
                    index = 0
                    quota_delays.clear()
