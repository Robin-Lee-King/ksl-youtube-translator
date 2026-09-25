from services.timing import time_stage
from services.llm_subtitle_correction_service import correct_segments
from services.youtube_service import (
    extract_video_id,
    get_transcript_data,
    get_video_metadata,
)


def get_corrected_transcript_data(url: str) -> dict:
    """영상 메타데이터와 원문 자막, 교정된 segments를 반환한다.

    메타데이터 조회 실패는 기존 조회 함수의 빈 문자열 fallback을 사용한다.
    영상 ID 추출 또는 자막 추출 실패는 호출자에게 전달한다.
    """
    video_id = extract_video_id(url)
    if video_id is None:
        raise ValueError("URL에서 영상 ID를 찾을 수 없습니다.")

    with time_stage("TRANSCRIPTING"):
        metadata = get_video_metadata(url)
        transcript, segments = get_transcript_data(video_id)
    with time_stage("SUBTITLE_CORRECTION"):
        corrected_segments = correct_segments(
            segments,
            video_title=metadata["title"],
            video_description=metadata["description"],
        )

    return {
        "title": metadata["title"],
        "description": metadata["description"],
        "transcript": transcript,
        "segments": corrected_segments,
    }
