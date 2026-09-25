import asyncio

from fastapi import APIRouter, HTTPException
from schemas.youtube import YoutubeRequest, YoutubeResponse, SubtitleCorrectionResponse
from services.subtitle_pipeline_service import get_corrected_transcript_data
from services.youtube_service import extract_video_id, get_transcript_data

router = APIRouter()


@router.post("/translate", response_model=YoutubeResponse)
def translate(request: YoutubeRequest):
    video_id = extract_video_id(request.url)

    if video_id is None:
        raise HTTPException(status_code=400, detail="URL에서 영상 ID를 찾을 수 없습니다.")

    try:
        full_text, segments = get_transcript_data(video_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return YoutubeResponse(
        received_url=request.url,
        transcript=full_text,
        segments=segments,
    )


@router.post(
    "/translate/subtitle-correction-test",
    response_model=SubtitleCorrectionResponse,
    summary="LLM 자막 문맥 교정 테스트",
    description="Gloss 변환 없이 영상 제목·설명, 자막 원문과 corrected_text를 확인하는 개발/검증용 API",
)
async def subtitle_correction_test(request: YoutubeRequest):
    """개발/검증용으로 자막 교정까지만 실행하며 Job이나 수어 영상을 생성하지 않는다."""
    try:
        result = await asyncio.to_thread(get_corrected_transcript_data, request.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return SubtitleCorrectionResponse(**result)
