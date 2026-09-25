import asyncio
import subprocess
import tempfile

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models.user import User
from routers.auth import get_current_user_optional

from schemas.youtube import YoutubeRequest
from schemas.job import Job, JobStatus, JobResult, JobSegment

from services import job_repository
from services.timing import (
    time_job,
    time_stage,
    profile_render,
    measure,
    render_metrics,
    emit_metrics,
)

from services.youtube_service import extract_video_id
from services.subtitle_pipeline_service import get_corrected_transcript_data

from services.demo_gloss_override import (
    DEMO_GLOSS_OVERRIDE,
    build_display_sequence_from_codes,
)

from services.ksl_converter import KSLConversionError

from services.llm_gloss_service import (
    GeminiKSLConverter,
    get_gloss_batch_size,
)

from services.clip_resolver import (
    resolve_clip_path,
    resolve_clips,
)

from services.gloss_matcher import build_display_sequence

from services.timeline_builder import build_timeline

from services.video_merger import (
    merge_timeline_to_video,
    MISSING_CLIP_FALLBACK_SECONDS,
)


router = APIRouter()

ksl_converter: GeminiKSLConverter = GeminiKSLConverter()


# ============================================================
# Clip duration
# ============================================================

def _get_clip_duration(
    code: str,
    clip_paths: dict[str, Path | None],
) -> float:
    """
    준비된 avatar clip의 실제 길이를 ffprobe로 읽는다.

    clip이 없으면 video_merger.py와 동일한
    missing fallback 길이를 사용한다.
    """

    clip_path = resolve_clip_path(
        code,
        clip_paths,
    )

    if clip_path is None:
        return MISSING_CLIP_FALLBACK_SECONDS

    with measure(
        render_metrics,
        "FFPROBE_DURATION",
    ):
        probe = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(clip_path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )

    return float(
        probe.stdout.strip()
    )


# ============================================================
# Render
# ============================================================

@profile_render
def _render_job_video(
    job_id: str,
    segments: list[dict],
) -> str:
    """
    Gloss sequence
        -> display sequence
        -> clip resolve
        -> timeline
        -> video merge
    """

    with tempfile.TemporaryDirectory(
        prefix="ksl_job_"
    ) as temp_dir:

        # ----------------------------------------------------
        # SIGN MAPPING
        # ----------------------------------------------------

        with (
            time_stage(
                "SIGN_MAPPING",
                job_id,
            ),
            measure(
                render_metrics,
                "DISPLAY_SEQUENCE_PREP",
            ),
        ):

            prepared = [
                {
                    **seg,
                    "display_sequence": (
                        seg["display_sequence"]
                        if "display_sequence" in seg
                        else build_display_sequence(
                            seg["gloss_sequence"]
                        )
                    ),
                }
                for seg in segments
            ]

        # ----------------------------------------------------
        # TIMELINE BUILDING
        # ----------------------------------------------------

        with time_stage(
            "TIMELINE_BUILDING",
            job_id,
        ):

            with measure(
                render_metrics,
                "S3_CLIP_RESOLVE",
            ):

                clip_paths = resolve_clips(
                    [
                        item
                        for seg in prepared
                        for item in seg[
                            "display_sequence"
                        ]
                    ],
                    Path(temp_dir),
                )

            avatar_items = [
                item
                for seg in prepared
                for item in seg[
                    "display_sequence"
                ]
                if item["type"] == "avatar"
            ]

            emit_metrics(
                "Render Stats",
                (
                    f"segments={len(prepared)} "
                    f"avatar_items={len(avatar_items)} "
                    f"unique_avatar_codes="
                    f"{len({item['code'] for item in avatar_items})} "
                    f"missing_clips="
                    f"{sum(clip_paths.get(item['code']) is None for item in avatar_items)}"
                ),
                job_id,
            )

            # WORD ID별 duration cache
            durations: dict[str, float] = {}

            def get_duration(
                code: str,
            ) -> float:

                if code not in durations:

                    durations[
                        code
                    ] = _get_clip_duration(
                        code,
                        clip_paths,
                    )

                else:

                    render_metrics.get().counts[
                        "cache_hits"
                    ] += 1

                return durations[
                    code
                ]

            with measure(
                render_metrics,
                "TIMELINE_CALC",
            ):

                timeline = build_timeline(
                    prepared,
                    get_duration,
                )

            # ==================================================
            # DEBUG
            # ==================================================

            print(
                "\n" + "=" * 90,
                flush=True,
            )

            print(
                f"[KSL DEBUG] "
                f"job_id={job_id} / "
                f"문장 수={len(prepared)}",
                flush=True,
            )

            print(
                "=" * 90,
                flush=True,
            )

            previous_actual_end = 0.0

            for idx, (
                seg,
                timing,
            ) in enumerate(
                zip(
                    prepared,
                    timeline,
                ),
                start=1,
            ):

                display_sequence = seg[
                    "display_sequence"
                ]

                glosses: list[str] = []
                word_ids: list[str] = []
                unmatched: list[str] = []
                missing_codes: list[str] = []

                # ----------------------------------------------
                # 실제 display sequence 분석
                # ----------------------------------------------

                for item in display_sequence:

                    if item["type"] == "avatar":

                        glosses.append(
                            item.get("gloss")
                            or item.get("code")
                            or ""
                        )

                        word_ids.append(
                            item["code"]
                        )

                        if (
                            clip_paths.get(
                                item["code"]
                            )
                            is None
                        ):

                            missing_codes.append(
                                item["code"]
                            )

                    elif item[
                        "type"
                    ] == "caption":

                        text_value = (
                            item.get("text")
                            or ""
                        )

                        if text_value:

                            glosses.append(
                                text_value
                            )

                            unmatched.append(
                                text_value
                            )

                # ----------------------------------------------
                # 기본 정보
                # ----------------------------------------------

                print(
                    (
                        f"\n[문장 "
                        f"{idx}/{len(prepared)}] "
                        f"{seg['start']:.2f}s ~ "
                        f"{seg['end']:.2f}s "
                        f"(원본 "
                        f"{max(0.0, seg['end'] - seg['start']):.2f}s)"
                    ),
                    flush=True,
                )

                print(
                    f"  원문       : "
                    f"{seg.get('source_text') or ''}",
                    flush=True,
                )

                corrected = seg.get(
                    "corrected_text"
                )

                if (
                    corrected
                    and corrected
                    != seg.get(
                        "source_text"
                    )
                ):

                    print(
                        f"  교정문     : "
                        f"{corrected}",
                        flush=True,
                    )

                # ----------------------------------------------
                # 새 Gemini 수어용 재구성 문장
                # ----------------------------------------------

                ksl_text = seg.get(
                    "ksl_text"
                )

                if ksl_text:

                    print(
                        f"  수어용 문장: "
                        f"{ksl_text}",
                        flush=True,
                    )

                print(
                    f"  Gloss      : "
                    f"{glosses}",
                    flush=True,
                )

                print(
                    f"  연결 ID    : "
                    f"{word_ids}",
                    flush=True,
                )

                # ----------------------------------------------
                # Match / clip warnings
                # ----------------------------------------------

                if unmatched:

                    print(
                        f"  ⚠ 미매칭   : "
                        f"{unmatched}",
                        flush=True,
                    )

                if missing_codes:

                    print(
                        f"  ⚠ 영상없음 : "
                        f"{missing_codes}",
                        flush=True,
                    )

                # ----------------------------------------------
                # Timing
                # ----------------------------------------------

                gap_before = max(
                    0.0,
                    timing[
                        "actual_start"
                    ]
                    - previous_actual_end,
                )

                print(
                    (
                        f"  재생       : "
                        f"{timing['actual_start']:.2f}s ~ "
                        f"{timing['actual_end']:.2f}s | "
                        f"speed="
                        f"{timing['speed']:.3f}x | "
                        f"jamo="
                        f"{timing.get('jamo_count', 0)} | "
                        f"idle="
                        f"{timing['idle_duration']:.3f}s | "
                        f"overflow="
                        f"{timing['overflow_seconds']:.3f}s"
                    ),
                    flush=True,
                )

                if gap_before > 0.05:

                    print(
                        (
                            f"  ⏸ 문장 전 공백: "
                            f"약 {gap_before:.2f}초 "
                            f"(원본 자막/발화 사이의 공백)"
                        ),
                        flush=True,
                    )

                if (
                    timing[
                        "idle_duration"
                    ]
                    > 0.05
                ):

                    print(
                        (
                            f"  ⏸ 문장 끝 idle: "
                            f"약 "
                            f"{timing['idle_duration']:.2f}초 "
                            f"(수어가 문장 시간보다 먼저 끝남)"
                        ),
                        flush=True,
                    )

                previous_actual_end = timing[
                    "actual_end"
                ]

            print(
                "\n" + "=" * 90,
                flush=True,
            )

            print(
                "[KSL DEBUG] "
                "문장별 분석 출력 완료",
                flush=True,
            )

            print(
                "=" * 90 + "\n",
                flush=True,
            )

            # ------------------------------------------------
            # VIDEO MERGE
            # ------------------------------------------------

            with measure(
                render_metrics,
                "VIDEO_MERGE",
            ):

                return merge_timeline_to_video(
                    timeline,
                    f"{job_id}.mp4",
                    clip_paths,
                )


# ============================================================
# Job processing
# ============================================================

@time_job
async def process_job(
    job_id: str,
    url: str,
) -> None:

    db = SessionLocal()

    try:

        # ----------------------------------------------------
        # URL 확인
        # ----------------------------------------------------

        video_id = extract_video_id(
            url
        )

        if video_id is None:

            job_repository.update_translation_job_db(
                db,
                job_id,
                status=JobStatus.FAILED,
                failed_stage="TRANSCRIPTING",
                error_code="INVALID_URL",
                error_message=(
                    "URL에서 영상 ID를 찾을 수 없습니다."
                ),
            )

            return

        # ----------------------------------------------------
        # TRANSCRIPTING
        # ----------------------------------------------------

        job_repository.update_translation_job_db(
            db,
            job_id,
            status=JobStatus.TRANSCRIPTING,
        )

        try:

            transcript_data = await asyncio.to_thread(
                get_corrected_transcript_data,
                url,
            )

        except ValueError as e:

            job_repository.update_translation_job_db(
                db,
                job_id,
                status=JobStatus.FAILED,
                failed_stage="TRANSCRIPTING",
                error_code="TRANSCRIPT_ERROR",
                error_message=str(e),
            )

            return

        full_text = transcript_data[
            "transcript"
        ]

        raw_segments = transcript_data[
            "segments"
        ]

        # ----------------------------------------------------
        # JobSegment 생성
        #
        # 이 시점:
        # source_text     = 원문
        # corrected_text  = STT/맞춤법 교정문
        # ksl_text        = 아직 None
        # ----------------------------------------------------

        segments = [
            JobSegment(
                start=seg["start"],
                end=seg["end"],
                source_text=seg["text"],
                corrected_text=seg.get(
                    "corrected_text"
                ),
            )
            for seg in raw_segments
        ]

        translation_job = (
            job_repository
            .get_translation_job_db(
                db,
                job_id,
            )
        )

        if translation_job is None:
            return

        # ====================================================
        # KSL_CONVERTING
        # ====================================================

        job_repository.update_translation_job_db(
            db,
            job_id,
            status=JobStatus.KSL_CONVERTING,
        )

        with time_stage(
            "KSL_CONVERTING"
        ) as gloss_timer:

            # 렌더러에 넘길 segment
            timeline_segments: list[
                dict
            ] = [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "source_text": (
                        seg.source_text
                    ),
                    "corrected_text": (
                        seg.corrected_text
                    ),
                    "ksl_text": None,
                }
                for seg in segments
            ]

            # Gemini가 실제로 처리해야 하는 segment
            pending: list[
                tuple[int, str]
            ] = []

            # ------------------------------------------------
            # DEMO override 확인
            # ------------------------------------------------

            for index, seg in enumerate(
                segments
            ):

                override_codes = (
                    DEMO_GLOSS_OVERRIDE.get(
                        seg.source_text
                    )
                )

                if (
                    override_codes
                    is not None
                ):

                    print(
                        (
                            f"[Gloss] "
                            f"{index + 1}/"
                            f"{len(segments)} "
                            f"DEMO override 적용"
                        ),
                        flush=True,
                    )

                    timeline_segments[
                        index
                    ][
                        "display_sequence"
                    ] = (
                        build_display_sequence_from_codes(
                            override_codes
                        )
                    )

                    # DEMO override는 Gemini를 거치지 않으므로
                    # 별도의 simplified_text가 없다.
                    # DB/API 표시용으로 교정문을 사용한다.
                    demo_ksl_text = (
                        seg.corrected_text
                        or seg.source_text
                    )

                    segments[
                        index
                    ].ksl_text = (
                        demo_ksl_text
                    )

                    timeline_segments[
                        index
                    ][
                        "ksl_text"
                    ] = (
                        demo_ksl_text
                    )

                else:

                    pending.append(
                        (
                            index,
                            (
                                seg.corrected_text
                                or seg.source_text
                            ),
                        )
                    )

            # ------------------------------------------------
            # Gemini batch
            # ------------------------------------------------

            batch_size = (
                get_gloss_batch_size()
            )

            batch_count = (
                (
                    len(pending)
                    + batch_size
                    - 1
                )
                // batch_size
            )

            for offset in range(
                0,
                len(pending),
                batch_size,
            ):

                chunk = pending[
                    offset:
                    offset + batch_size
                ]

                batch_number = (
                    offset
                    // batch_size
                    + 1
                )

                positions = [
                    index + 1
                    for index, _
                    in chunk
                ]

                if (
                    positions
                    == list(
                        range(
                            positions[0],
                            positions[-1] + 1,
                        )
                    )
                ):

                    label = (
                        f"{positions[0]}-"
                        f"{positions[-1]}"
                    )

                else:

                    label = ",".join(
                        map(
                            str,
                            positions,
                        )
                    )

                print(
                    (
                        f"[Gloss Batch] "
                        f"{batch_number}/"
                        f"{batch_count} "
                        f"변환 시작 "
                        f"(segments {label})"
                    ),
                    flush=True,
                )

                try:

                    # ========================================
                    # 중요:
                    # 기존 convert_batch()가 아니라
                    # convert_batch_detailed() 사용
                    #
                    # 결과:
                    #
                    # {
                    #   "simplified_text": "...",
                    #   "glosses": [...]
                    # }
                    # ========================================

                    detailed_results = (
                        await asyncio.to_thread(
                            ksl_converter
                            .convert_batch_detailed,
                            [
                                text
                                for _, text
                                in chunk
                            ],
                        )
                    )

                    if (
                        len(
                            detailed_results
                        )
                        != len(chunk)
                    ):

                        raise KSLConversionError(
                            "입력과 출력 "
                            "segment 수가 다릅니다"
                        )

                except KSLConversionError as e:

                    gloss_timer.failed = True

                    job_repository.update_translation_job_db(
                        db,
                        job_id,
                        status=JobStatus.FAILED,
                        failed_stage=(
                            "KSL_CONVERTING"
                        ),
                        error_code=(
                            "GLOSS_CONVERSION_ERROR"
                        ),
                        error_message=str(e),
                    )

                    return

                # --------------------------------------------
                # simplified_text + glosses 연결
                # --------------------------------------------

                for (
                    (
                        index,
                        _,
                    ),
                    result,
                ) in zip(
                    chunk,
                    detailed_results,
                ):

                    simplified_text = (
                        result[
                            "simplified_text"
                        ]
                    )

                    gloss_sequence = (
                        result[
                            "glosses"
                        ]
                    )

                    # ----------------------------------------
                    # DB/API용
                    # ----------------------------------------

                    segments[
                        index
                    ].ksl_text = (
                        simplified_text
                    )

                    # ----------------------------------------
                    # Render/debug용
                    # ----------------------------------------

                    timeline_segments[
                        index
                    ][
                        "ksl_text"
                    ] = (
                        simplified_text
                    )

                    timeline_segments[
                        index
                    ][
                        "gloss_sequence"
                    ] = (
                        gloss_sequence
                    )

                print(
                    (
                        f"[Gloss Batch] "
                        f"{batch_number}/"
                        f"{batch_count} "
                        f"변환 완료"
                    ),
                    flush=True,
                )

        # ====================================================
        # DB segment 저장
        #
        # 중요:
        # Gemini 작업이 끝난 뒤 저장하므로
        # ksl_text에 simplified_text가 들어간다.
        # ====================================================

        job_repository.create_transcript_segments_db(
            db,
            translation_job_id=(
                translation_job.id
            ),
            segments=segments,
        )

        # ====================================================
        # SIGN MAPPING
        # ====================================================

        job_repository.update_translation_job_db(
            db,
            job_id,
            status=JobStatus.SIGN_MAPPING,
        )

        # ====================================================
        # TIMELINE BUILDING
        # ====================================================

        job_repository.update_translation_job_db(
            db,
            job_id,
            status=JobStatus.TIMELINE_BUILDING,
        )

        try:

            video_url = (
                await asyncio.to_thread(
                    _render_job_video,
                    job_id,
                    timeline_segments,
                )
            )

        except Exception as e:

            job_repository.update_translation_job_db(
                db,
                job_id,
                status=JobStatus.FAILED,
                failed_stage=(
                    "TIMELINE_BUILDING"
                ),
                error_code=(
                    "TIMELINE_BUILD_ERROR"
                ),
                error_message=str(e),
            )

            return

        # ====================================================
        # COMPLETED
        # ====================================================

        result = JobResult(
            transcript=full_text,
            segments=segments,
            video_url=video_url,
        )

        job_repository.update_translation_job_db(
            db,
            job_id,
            status=JobStatus.COMPLETED,
            result_video_url=video_url,
            completed_at=datetime.now(),
        )

    finally:

        db.close()


# ============================================================
# POST /translate/jobs
# ============================================================

@router.post(
    "/translate/jobs",
    response_model=Job,
    status_code=202,
)
async def create_translation_job(
    request: YoutubeRequest,
    background_tasks: BackgroundTasks,
    current_user: User | None = Depends(
        get_current_user_optional
    ),
    db: Session = Depends(
        get_db
    ),
):

    video_id = extract_video_id(
        request.url
    )

    if video_id is None:

        raise HTTPException(
            status_code=400,
            detail=(
                "URL에서 영상 ID를 "
                "찾을 수 없습니다."
            ),
        )

    video = (
        job_repository
        .get_or_create_video_db(
            db,
            source_url=request.url,
            youtube_video_id=video_id,
        )
    )

    # 로그인하지 않은 사용자도
    # anonymous job으로 변환 가능
    translation_job = (
        job_repository
        .create_translation_job_db(
            db,
            video_id=video.id,
            user_id=(
                current_user.id
                if current_user
                else None
            ),
        )
    )

    job = Job(
        job_id=str(
            translation_job.public_id
        ),
        status=JobStatus(
            translation_job.status
        ),
        url=request.url,
    )

    background_tasks.add_task(
        process_job,
        job.job_id,
        request.url,
    )

    return job


# ============================================================
# GET /translate/jobs/{job_id}
# ============================================================

@router.get(
    "/translate/jobs/{job_id}",
    response_model=Job,
)
async def get_translation_job(
    job_id: str,
    db: Session = Depends(
        get_db
    ),
):

    job_with_video = (
        job_repository
        .get_translation_job_with_video_db(
            db,
            job_id,
        )
    )

    if job_with_video is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "존재하지 않는 job_id입니다."
            ),
        )

    translation_job, video = (
        job_with_video
    )

    transcript_segments = (
        job_repository
        .get_transcript_segments_db(
            db,
            translation_job.id,
        )
    )

    segments = [
        JobSegment(
            start=(
                segment.start_ms
                / 1000
            ),
            end=(
                segment.end_ms
                / 1000
            ),
            source_text=(
                segment.source_text
            ),
            corrected_text=(
                segment.corrected_text
            ),
            ksl_text=(
                segment.ksl_text
            ),
        )
        for segment
        in transcript_segments
    ]

    status = JobStatus(
        translation_job.status
    )

    result = None

    if (
        status
        == JobStatus.COMPLETED
        or translation_job.result_video_url
    ):

        result = JobResult(
            transcript=" ".join(
                segment.source_text
                for segment
                in segments
            ),
            segments=segments,
            video_url=(
                translation_job
                .result_video_url
            ),
        )

    return Job(
        job_id=str(
            translation_job.public_id
        ),
        status=status,
        url=video.source_url,
        result=result,
        failed_stage=(
            translation_job.failed_stage
        ),
        error_code=(
            translation_job.error_code
        ),
        error_message=(
            translation_job.error_message
        ),
    )
