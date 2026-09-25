from typing import Optional
from pydantic import BaseModel, field_validator


class YoutubeRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def check_youtube_url(cls, value: str) -> str:
        if not (value.startswith("http://") or value.startswith("https://")):
            raise ValueError("URL은 http:// 또는 https://로 시작해야 합니다.")

        if "youtube.com" not in value and "youtu.be" not in value:
            raise ValueError("유튜브 URL만 입력할 수 있습니다.")

        return value


class Segment(BaseModel):
    start: float
    end: float
    text: str
    corrected_text: Optional[str] = None


class YoutubeResponse(BaseModel):
    received_url: str
    transcript: str
    segments: list[Segment]


class SubtitleCorrectionResponse(BaseModel):
    title: str
    description: str
    transcript: str
    segments: list[Segment]
