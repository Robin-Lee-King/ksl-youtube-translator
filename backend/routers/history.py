from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.translation_job import TranslationJob
from models.user import User
from models.video import Video
from routers.auth import get_current_user
from schemas.history import (
    CreateGroupRequest,
    GroupOut,
    HistoryItemOut,
    UpdateJobGroupRequest,
    to_history_status,
)
from services import group_repository, job_repository

router = APIRouter(prefix="/history", tags=["history"])


def _to_history_item(translation_job: TranslationJob, video: Video) -> HistoryItemOut:
    return HistoryItemOut(
        job_id=str(translation_job.public_id),
        url=video.source_url,
        title=video.title,
        status=to_history_status(translation_job.status),
        duration_sec=video.duration_ms / 1000 if video.duration_ms is not None else None,
        group_id=translation_job.group_id,
        result_video_url=translation_job.result_video_url,
        subtitle_url=translation_job.subtitle_url,
        thumbnail_url=translation_job.thumbnail_url,
        created_at=translation_job.created_at,
    )


# Registered before "/{job_id}" so a literal path segment like "groups" is never captured as a
# job_id — FastAPI matches routes in registration order.
@router.get("/groups", response_model=list[GroupOut])
def list_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return group_repository.list_groups_by_user_db(db, current_user.id)


@router.post("/groups", response_model=GroupOut, status_code=201)
def create_group(
    payload: CreateGroupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return group_repository.create_group_db(db, user_id=current_user.id, name=payload.name)


@router.delete("/groups/{group_id}", status_code=204)
def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = group_repository.get_group_db(db, group_id)

    if group is None or group.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="존재하지 않는 그룹입니다.")

    # Ungroup rather than cascade-delete: removing a group shouldn't take its history items with it.
    job_repository.clear_group_from_jobs_db(db, group_id)
    group_repository.delete_group_db(db, group)


@router.get("", response_model=list[HistoryItemOut])
def list_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = job_repository.list_translation_jobs_with_video_by_user_db(db, current_user.id)

    return [_to_history_item(translation_job, video) for translation_job, video in rows]


@router.delete("/{job_id}", status_code=204)
def delete_history_item(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    translation_job = job_repository.get_translation_job_db(db, job_id)

    if translation_job is None or translation_job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="존재하지 않는 기록입니다.")

    job_repository.delete_translation_job_db(db, translation_job)


@router.patch("/{job_id}/group", response_model=HistoryItemOut)
def update_history_item_group(
    job_id: str,
    payload: UpdateJobGroupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job_with_video = job_repository.get_translation_job_with_video_db(db, job_id)

    if job_with_video is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 기록입니다.")

    translation_job, video = job_with_video

    if translation_job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="존재하지 않는 기록입니다.")

    if payload.group_id is not None:
        group = group_repository.get_group_db(db, payload.group_id)
        if group is None or group.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="존재하지 않는 그룹입니다.")

    translation_job = job_repository.update_translation_job_group_db(
        db, translation_job, payload.group_id
    )

    return _to_history_item(translation_job, video)
