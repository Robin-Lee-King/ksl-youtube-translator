from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Collapses the pipeline's 7-stage JobStatus (QUEUED/TRANSCRIPTING/KSL_CONVERTING/SIGN_MAPPING/
# TIMELINE_BUILDING/COMPLETED/FAILED) into the 3 buckets the frontend's HistoryStatus type actually
# has — everything before COMPLETED/FAILED reads as "처리중".
HistoryStatus = Literal["완료", "실패", "처리중"]

_STATUS_MAP: dict[str, HistoryStatus] = {
    "COMPLETED": "완료",
    "FAILED": "실패",
}


def to_history_status(job_status: str) -> HistoryStatus:
    return _STATUS_MAP.get(job_status, "처리중")


class HistoryItemOut(BaseModel):
    job_id: str
    url: str
    title: str | None
    status: HistoryStatus
    duration_sec: float | None
    group_id: int | None
    result_video_url: str | None
    subtitle_url: str | None
    thumbnail_url: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class GroupOut(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class CreateGroupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class UpdateJobGroupRequest(BaseModel):
    # null = remove the job from whatever group it's currently in.
    group_id: int | None = None
