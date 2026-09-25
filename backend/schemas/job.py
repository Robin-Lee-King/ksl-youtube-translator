from enum import Enum
from typing import Optional
from pydantic import BaseModel


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    TRANSCRIPTING = "TRANSCRIPTING"
    KSL_CONVERTING = "KSL_CONVERTING"
    SIGN_MAPPING = "SIGN_MAPPING"
    TIMELINE_BUILDING = "TIMELINE_BUILDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class JobSegment(BaseModel):
    start: float
    end: float
    source_text: str
    corrected_text: Optional[str] = None
    ksl_text: Optional[str] = None


class JobResult(BaseModel):
    transcript: str
    segments: list[JobSegment]
    video_url: Optional[str] = None


class Job(BaseModel):
    job_id: str
    status: JobStatus
    url: str
    result: Optional[JobResult] = None
    failed_stage: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
