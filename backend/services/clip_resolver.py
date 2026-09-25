from services.timing import Metrics, emit_metrics

import logging
import os
import re
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from boto3.exceptions import Boto3Error

logger = logging.getLogger(__name__)
# SEN only: its S3 key convention has not been defined yet.
VIDEOS_DIR = Path(__file__).resolve().parent.parent / "static" / "videos"


def resolve_clip_path(code: str, clip_paths: dict[str, Path | None]) -> Path | None:
    """Read the prepared job mapping without downloading or rebuilding paths."""
    return clip_paths.get(code)


def resolve_clips(display_sequence: list[dict], work_dir: Path) -> dict[str, Path | None]:
    """Prepare unique clips before timing. Caller owns work_dir through merging."""
    stats = Metrics()
    try:
        resolved: dict[str, Path | None] = {}
        bucket = os.getenv("S3_CLIP_BUCKET", "").strip()
        client = None
        client_failed = False
        for item in display_sequence:
            if item["type"] != "avatar":
                continue
            stats.counts["avatar_items"] += 1
            code = item["code"]
            if code in resolved:
                continue
            resolved[code] = None
            if re.fullmatch(r"SEN\d+", code):
                path = VIDEOS_DIR / f"{code}.mp4"
                resolved[code] = path if path.is_file() else None
                continue
            if not re.fullmatch(r"WORD\d+", code):
                continue
            stats.counts["unique_words"] += 1
            if not bucket or client_failed:
                logger.warning("Clip unavailable: %s (S3 bucket/client unavailable)", code)
                continue
            path = work_dir / f"{code}.mp4"
            try:
                if client is None:
                    try:
                        client = boto3.client("s3")  # Default AWS credential chain.
                    except (BotoCoreError, ClientError, Boto3Error):
                        client_failed = True
                        raise
                try:
                    with stats.measure("downloads"):
                        client.download_file(bucket, f"clips/word/{code}.mp4", str(path))
                except BaseException:
                    stats.counts["failed"] += 1
                    raise
                else:
                    stats.counts["success"] += 1
                resolved[code] = path
            except (BotoCoreError, ClientError, Boto3Error, OSError) as exc:
                logger.warning("Clip download failed for %s: %s", code, type(exc).__name__)
                path.unlink(missing_ok=True)
        return resolved
    finally:
        emit_metrics("S3 Timing", f"avatar_items={stats.counts['avatar_items']} "
                     f"unique_words={stats.counts['unique_words']} downloads={stats.counts['downloads']} "
                     f"success={stats.counts['success']} failed={stats.counts['failed']} "
                     f"total={stats.seconds['downloads']:.2f}s")
