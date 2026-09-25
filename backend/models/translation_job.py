from datetime import datetime
import uuid

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class TranslationJob(Base):
    __tablename__ = "translation_jobs"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True, nullable=False
    )
    public_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4
    )
    video_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("videos.id"), nullable=False
    )
    # Nullable: a job created without a token (see create_translation_job in routers/job.py)
    # has no owner, so it never shows up in anyone's GET /history but still works end to end.
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=True
    )
    group_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("groups.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    failed_stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    result_video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    subtitle_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=False), nullable=True
    )
