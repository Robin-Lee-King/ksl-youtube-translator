from datetime import datetime

from sqlalchemy import BigInteger, Integer, String, Text, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True, nullable=False
    )
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    youtube_video_id: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False
    )
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript_source: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False), server_default=func.now(), nullable=False
    )
