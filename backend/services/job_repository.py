from datetime import datetime
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.transcript_segment import TranscriptSegment
from models.translation_job import TranslationJob
from models.video import Video
from schemas.job import Job, JobSegment, JobStatus

_jobs: dict[str, Job] = {}


def get_or_create_video_db(
    db: Session,
    source_url: str,
    youtube_video_id: str,
) -> Video:
    statement = select(Video).where(
        Video.youtube_video_id == youtube_video_id
    )
    video = db.execute(statement).scalar_one_or_none()

    if video is not None:
        return video

    video = Video(
        source_url=source_url,
        youtube_video_id=youtube_video_id,
    )

    db.add(video)
    db.commit()
    db.refresh(video)

    return video


def create_translation_job_db(
    db: Session,
    video_id: int,
    user_id: int | None = None,
    status: JobStatus = JobStatus.QUEUED,
) -> TranslationJob:
    translation_job = TranslationJob(
        video_id=video_id,
        user_id=user_id,
        status=status.value,
        progress=0,
    )

    db.add(translation_job)
    db.commit()
    db.refresh(translation_job)

    return translation_job


def get_translation_job_db(
    db: Session,
    job_id: str,
) -> TranslationJob | None:
    try:
        public_id = uuid.UUID(job_id)
    except (ValueError, AttributeError):
        return None

    statement = select(TranslationJob).where(
        TranslationJob.public_id == public_id
    )

    return db.execute(statement).scalar_one_or_none()


def get_translation_job_with_video_db(
    db: Session,
    job_id: str,
) -> tuple[TranslationJob, Video] | None:
    try:
        public_id = uuid.UUID(job_id)
    except (ValueError, AttributeError):
        return None

    statement = (
        select(TranslationJob, Video)
        .join(Video, TranslationJob.video_id == Video.id)
        .where(TranslationJob.public_id == public_id)
    )
    row = db.execute(statement).one_or_none()

    if row is None:
        return None

    return row[0], row[1]


def update_translation_job_db(
    db: Session,
    job_id: str,
    *,
    status: JobStatus | None = None,
    progress: int | None = None,
    error_message: str | None = None,
    completed_at: datetime | None = None,
    failed_stage: str | None = None,
    error_code: str | None = None,
    result_video_url: str | None = None,
) -> TranslationJob | None:
    translation_job = get_translation_job_db(db, job_id)

    if translation_job is None:
        return None

    if status is not None:
        translation_job.status = status.value
    if progress is not None:
        translation_job.progress = progress
    if error_message is not None:
        translation_job.error_message = error_message
    if completed_at is not None:
        translation_job.completed_at = completed_at
    if failed_stage is not None:
        translation_job.failed_stage = failed_stage
    if error_code is not None:
        translation_job.error_code = error_code
    if result_video_url is not None:
        translation_job.result_video_url = result_video_url

    db.commit()
    db.refresh(translation_job)

    return translation_job


def create_transcript_segments_db(
    db: Session,
    translation_job_id: int,
    segments: list[JobSegment],
) -> list[TranscriptSegment]:
    if not segments:
        return []

    transcript_segments = [
        TranscriptSegment(
            translation_job_id=translation_job_id,
            sequence_no=sequence_no,
            start_ms=round(segment.start * 1000),
            end_ms=round(segment.end * 1000),
            source_text=segment.source_text,
            corrected_text=segment.corrected_text,
            ksl_text=segment.ksl_text,
            confidence=None,
        )
        for sequence_no, segment in enumerate(segments)
    ]

    db.add_all(transcript_segments)
    db.commit()

    for transcript_segment in transcript_segments:
        db.refresh(transcript_segment)

    return transcript_segments


def get_transcript_segments_db(
    db: Session,
    translation_job_id: int,
) -> list[TranscriptSegment]:
    statement = (
        select(TranscriptSegment)
        .where(TranscriptSegment.translation_job_id == translation_job_id)
        .order_by(TranscriptSegment.sequence_no.asc())
    )

    return list(db.execute(statement).scalars().all())


def list_translation_jobs_with_video_by_user_db(
    db: Session,
    user_id: int,
) -> list[tuple[TranslationJob, Video]]:
    statement = (
        select(TranslationJob, Video)
        .join(Video, TranslationJob.video_id == Video.id)
        .where(TranslationJob.user_id == user_id)
        .order_by(TranslationJob.created_at.desc())
    )

    return [(row[0], row[1]) for row in db.execute(statement).all()]


def delete_translation_job_db(db: Session, translation_job: TranslationJob) -> None:
    db.delete(translation_job)
    db.commit()


def update_translation_job_group_db(
    db: Session,
    translation_job: TranslationJob,
    group_id: int | None,
) -> TranslationJob:
    translation_job.group_id = group_id
    db.commit()
    db.refresh(translation_job)

    return translation_job


def clear_group_from_jobs_db(db: Session, group_id: int) -> None:
    statement = select(TranslationJob).where(TranslationJob.group_id == group_id)
    for translation_job in db.execute(statement).scalars().all():
        translation_job.group_id = None
    db.commit()


def create_job(url: str) -> Job:
    job_id = str(uuid.uuid4())

    job = Job(
        job_id=job_id,
        status=JobStatus.QUEUED,
        url=url,
    )

    _jobs[job_id] = job

    return job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def update_job(job_id: str, **changes) -> Job | None:
    job = _jobs.get(job_id)

    if job is None:
        return None

    updated = job.model_copy(update=changes)
    _jobs[job_id] = updated

    return updated
