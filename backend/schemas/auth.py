from datetime import datetime
from typing import Literal
import json

from pydantic import BaseModel, Field, field_validator

ScreenMode = Literal["easy", "standard"]


class SignupRequest(BaseModel):
    name: str = Field(min_length=1)
    username: str = Field(min_length=4, max_length=50)
    email: str
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    username: str
    email: str
    onboarding_completed: bool
    screen_mode: ScreenMode | None
    age: str | None
    topics: list[str]
    prefs: list[str]
    created_at: datetime

    class Config:
        from_attributes = True

    # topics/prefs are stored as a JSON-encoded string column (see models/user.py) — decode here so
    # the API always exposes them as a real array, never a stringified-JSON string.
    @field_validator("topics", "prefs", mode="before")
    @classmethod
    def _decode_json_list(cls, v: str | list[str] | None) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return json.loads(v)
        return v


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class CompleteOnboardingRequest(BaseModel):
    # All optional: omit any of these to leave that field unchanged (existing screen_mode-only
    # callers keep working). OnboardingPage's finish() sends all four; MyPage's edit UI sends
    # whichever single one the user just changed.
    screen_mode: ScreenMode | None = None
    age: str | None = None
    topics: list[str] | None = None
    prefs: list[str] | None = None
