from datetime import datetime

from sqlalchemy import BigInteger, Boolean, String, TIMESTAMP, Text, false, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, server_default=false(), nullable=False
    )
    # "easy" | "standard", chosen in onboarding step 4 / editable later from 마이페이지. Nullable
    # until the user picks one; allowed values are enforced at the API layer (schemas/auth.py).
    screen_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Onboarding steps 1-3, editable later from 마이페이지. topics/prefs are JSON-encoded lists
    # (SQLite/Postgres have no shared native array type here) — encoded/decoded at the API layer
    # (schemas/auth.py, services/auth_service.py), never accessed as raw strings elsewhere.
    age: Mapped[str | None] = mapped_column(String(50), nullable=True)
    topics: Mapped[str | None] = mapped_column(Text, nullable=True)
    prefs: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=False), server_default=func.now(), nullable=False
    )
