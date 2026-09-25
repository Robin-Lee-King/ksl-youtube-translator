from services.timing import measure_ffmpeg, profile_merge

import itertools
import subprocess
import tempfile
from pathlib import Path


RESULTS_DIR = (
    Path(__file__).resolve().parent.parent
    / "static"
    / "results"
)

IDLE_IMAGE_PATH = (
    Path(__file__).resolve().parent.parent
    / "static"
    / "images"
    / "idle_pose.png"
)

WIDTH, HEIGHT, FPS = 1920, 1080, 30


# 실제 파일이 없는 avatar 항목은
# 임시로 이 길이만큼 idle pose로 대체한다.
#
# 이후 해당 item의 playback_speed가 적용되므로
# 예:
#   fallback 1.0초 + playback_speed 2.0x
#   -> 최종 약 0.5초
MISSING_CLIP_FALLBACK_SECONDS = 1.0

_GAP_EPSILON = 1e-3
_SPEED_EPSILON = 1e-6


def _run_ffmpeg(args: list[str]) -> None:
    result = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            *args,
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed: {' '.join(args)}\n"
            f"{result.stderr}"
        )


@measure_ffmpeg("black")
def _make_black(
    tmp: Path,
    duration: float,
    idx: int,
) -> Path:
    out = tmp / f"black_{idx}.mp4"

    _run_ffmpeg(
        [
            "-f",
            "lavfi",
            "-i",
            (
                f"color=c=black:"
                f"s={WIDTH}x{HEIGHT}:"
                f"r={FPS}:"
                f"d={duration:.3f}"
            ),
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(out),
        ]
    )

    return out


@measure_ffmpeg("idle_pose")
def _make_idle_pose(
    tmp: Path,
    duration: float,
    idx: int,
) -> Path:
    """
    기본 포즈 정지 이미지를 duration만큼 재생되는 영상으로 만든다.

    이미지가 없으면 검은 화면으로 자동 대체한다.
    """

    if not IDLE_IMAGE_PATH.is_file():
        return _make_black(
            tmp,
            duration,
            idx,
        )

    out = tmp / f"idle_{idx}.mp4"

    vf = (
        f"scale={WIDTH}:{HEIGHT}:"
        f"force_original_aspect_ratio=decrease,"
        f"pad={WIDTH}:{HEIGHT}:"
        f"(ow-iw)/2:(oh-ih)/2,"
        f"fps={FPS}"
    )

    _run_ffmpeg(
        [
            "-loop",
            "1",
            "-i",
            str(IDLE_IMAGE_PATH),
            "-t",
            f"{duration:.3f}",
            "-vf",
            vf,
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(out),
        ]
    )

    return out


@measure_ffmpeg("normalize")
def _normalize_clip(
    tmp: Path,
    src: Path,
    idx: int,
) -> Path:
    """
    실제 클립을 1920x1080 / 30fps / 무음으로 통일한다.
    """

    out = tmp / f"norm_{idx}.mp4"

    vf = (
        f"scale={WIDTH}:{HEIGHT}:"
        f"force_original_aspect_ratio=decrease,"
        f"pad={WIDTH}:{HEIGHT}:"
        f"(ow-iw)/2:(oh-ih)/2,"
        f"fps={FPS}"
    )

    _run_ffmpeg(
        [
            "-i",
            str(src),
            "-vf",
            vf,
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(out),
        ]
    )

    return out


@measure_ffmpeg("speed")
def _apply_speed(
    tmp: Path,
    src: Path,
    speed: float,
    idx: int,
) -> Path:
    out = tmp / f"speed_{idx}.mp4"

    _run_ffmpeg(
        [
            "-i",
            str(src),
            "-vf",
            f"setpts=PTS/{speed}",
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(out),
        ]
    )

    return out


def _probe_duration(
    path: Path,
    fallback: float | None = None,
) -> float:
    """
    실제로 생성된 mp4 길이를 읽는다.

    production에서는 ffprobe 결과를 사용한다.
    테스트처럼 실제 파일이 없을 때만 fallback을 사용한다.
    """

    if not path.is_file():
        if fallback is not None:
            return max(
                0.0,
                fallback,
            )

        raise RuntimeError(
            f"ffprobe target does not exist: {path}"
        )

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"ffprobe failed: {path}\n"
            f"{result.stderr}"
        )

    try:
        return max(
            0.0,
            float(result.stdout.strip()),
        )

    except ValueError as exc:
        raise RuntimeError(
            f"ffprobe returned invalid duration "
            f"for {path}: "
            f"{result.stdout!r}"
        ) from exc


@measure_ffmpeg("concat")
def _concat(
    tmp: Path,
    parts: list[Path],
    idx: int,
    out_path: Path | None = None,
) -> Path:
    out = (
        out_path
        if out_path is not None
        else tmp / f"concat_{idx}.mp4"
    )

    list_file = tmp / f"concat_{idx}.txt"

    lines = []

    for part in parts:
        escaped = (
            str(part.resolve())
            .replace("\\", "/")
            .replace("'", "'\\''")
        )

        lines.append(
            f"file '{escaped}'"
        )

    list_file.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )

    _run_ffmpeg(
        [
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c",
            "copy",
            str(out),
        ]
    )

    return out


def _get_item_speed(
    item: dict,
    segment: dict,
) -> float:
    """
    새 timeline_builder.py:
        item["playback_speed"] 사용

    오래된 timeline:
        segment["speed"] 사용

    따라서 이전 형식과도 호환된다.
    """

    speed = item.get(
        "playback_speed",
        segment.get(
            "speed",
            1.0,
        ),
    )

    try:
        speed = float(speed)
    except (TypeError, ValueError):
        speed = 1.0

    if speed <= 0.0:
        speed = 1.0

    return speed


def _build_speed_groups(
    tmp: Path,
    segment: dict,
    clip_paths: dict[str, Path | None],
    counter,
) -> list[tuple[float, list[Path]]]:
    """
    연속된 avatar item 중 playback_speed가 같은 것끼리 묶는다.

    예:

        일반 WORD 1.8x
        일반 WORD 1.8x
        일반 WORD 1.8x
        자모      2.25x
        자모      2.25x
        자모      2.25x
        일반 WORD 1.8x

    ->

        group 1: 1.8x
        group 2: 2.25x
        group 3: 1.8x

    WORD 하나마다 FFmpeg speed를 호출하지 않기 위한 최적화다.
    """

    groups: list[tuple[float, list[Path]]] = []

    for item in segment["items"]:

        if item["type"] != "avatar":
            continue

        item_speed = _get_item_speed(
            item,
            segment,
        )

        src = clip_paths.get(
            item["code"]
        )

        if src is None:
            # 1초짜리 fallback을 만든 뒤,
            # 아래 group speed에서 동일하게 가속한다.
            base_part = _make_idle_pose(
                tmp,
                MISSING_CLIP_FALLBACK_SECONDS,
                next(counter),
            )

        else:
            base_part = _normalize_clip(
                tmp,
                src,
                next(counter),
            )

        if (
            groups
            and abs(
                groups[-1][0]
                - item_speed
            )
            <= _SPEED_EPSILON
        ):
            groups[-1][1].append(
                base_part
            )

        else:
            groups.append(
                (
                    item_speed,
                    [base_part],
                )
            )

    return groups


def _render_speed_groups(
    tmp: Path,
    groups: list[tuple[float, list[Path]]],
    counter,
) -> list[Path]:
    """
    같은 속도인 연속 clip들을 먼저 concat한 뒤
    speed를 그룹당 한 번만 적용한다.
    """

    rendered_groups: list[Path] = []

    for speed, group_parts in groups:

        if len(group_parts) > 1:
            group_base = _concat(
                tmp,
                group_parts,
                next(counter),
            )
        else:
            group_base = group_parts[0]

        if (
            abs(
                speed - 1.0
            )
            > _SPEED_EPSILON
        ):
            group_base = _apply_speed(
                tmp,
                group_base,
                speed,
                next(counter),
            )

        rendered_groups.append(
            group_base
        )

    return rendered_groups


@profile_merge
def merge_timeline_to_video(
    timeline: list[dict],
    output_filename: str,
    clip_paths: dict[str, Path | None],
) -> str:

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path = (
        RESULTS_DIR
        / output_filename
    )

    counter = itertools.count()

    with tempfile.TemporaryDirectory(
        prefix="video_merger_"
    ) as tmp_str:

        tmp = Path(tmp_str)

        master_parts: list[Path] = []

        # 실제 최종 영상의 현재 누적 재생 위치
        output_cursor = 0.0

        for segment in timeline:

            # --------------------------------------------------
            # 1. 원본 문장 시작 전 공백
            # --------------------------------------------------

            gap = (
                segment["stt_start"]
                - output_cursor
            )

            if gap > _GAP_EPSILON:

                gap_part = _make_idle_pose(
                    tmp,
                    gap,
                    next(counter),
                )

                master_parts.append(
                    gap_part
                )

                output_cursor += _probe_duration(
                    gap_part,
                    fallback=gap,
                )

            # --------------------------------------------------
            # 2. Avatar items를 실제 playback_speed별로 처리
            # --------------------------------------------------

            speed_groups = _build_speed_groups(
                tmp,
                segment,
                clip_paths,
                counter,
            )

            rendered_groups = _render_speed_groups(
                tmp,
                speed_groups,
                counter,
            )

            # --------------------------------------------------
            # 3. 처리된 speed group들을 다시 한 문장으로 연결
            # --------------------------------------------------

            if rendered_groups:

                if len(rendered_groups) > 1:

                    seg_base = _concat(
                        tmp,
                        rendered_groups,
                        next(counter),
                    )

                else:

                    seg_base = rendered_groups[0]

                # 중요:
                #
                # 예전 코드처럼 여기에서
                # segment["speed"]를 또 적용하면 안 된다.
                #
                # 이미 각 speed group에
                # item["playback_speed"]가 적용되어 있다.

                master_parts.append(
                    seg_base
                )

                output_cursor += _probe_duration(
                    seg_base,
                    fallback=segment.get(
                        "rendered_sign_duration"
                    ),
                )

            # --------------------------------------------------
            # 4. 실제 영상이 문장 end보다 빨리 끝나면 idle
            # --------------------------------------------------

            stt_end = segment.get(
                "stt_end"
            )

            if stt_end is not None:

                idle_to_sentence_end = (
                    stt_end
                    - output_cursor
                )

                if (
                    idle_to_sentence_end
                    > _GAP_EPSILON
                ):

                    idle_part = _make_idle_pose(
                        tmp,
                        idle_to_sentence_end,
                        next(counter),
                    )

                    master_parts.append(
                        idle_part
                    )

                    output_cursor += _probe_duration(
                        idle_part,
                        fallback=idle_to_sentence_end,
                    )

            # --------------------------------------------------
            # 오래된 / 수동 timeline 호환
            # --------------------------------------------------

            elif (
                segment.get(
                    "idle_duration",
                    0.0,
                )
                > _GAP_EPSILON
            ):

                idle_duration = segment[
                    "idle_duration"
                ]

                idle_part = _make_idle_pose(
                    tmp,
                    idle_duration,
                    next(counter),
                )

                master_parts.append(
                    idle_part
                )

                output_cursor += _probe_duration(
                    idle_part,
                    fallback=idle_duration,
                )

        # ------------------------------------------------------
        # 아무 영상도 없는 경우
        # ------------------------------------------------------

        if not master_parts:

            master_parts.append(
                _make_black(
                    tmp,
                    MISSING_CLIP_FALLBACK_SECONDS,
                    next(counter),
                )
            )

        # ------------------------------------------------------
        # Final concat
        # ------------------------------------------------------

        _concat(
            tmp,
            master_parts,
            next(counter),
            out_path=output_path,
        )

    return (
        f"/static/results/"
        f"{output_filename}"
    )


if __name__ == "__main__":

    from backend.routers.job_old import _render_job_video

    print(
        _render_job_video(
            "demo_result",
            [
                {
                    "start": 0.5,
                    "end": 6.0,
                    "gloss_sequence": [
                        "첫번째",
                        "고민",
                        "나",
                    ],
                },
                {
                    "start": 7.0,
                    "end": 9.0,
                    "gloss_sequence": [
                        "두번째",
                    ],
                },
            ],
        )
    )
