from datetime import datetime, timedelta, timezone
import json
import os

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from models.user import User

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set. Check the project root .env file.")

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24  # 1일

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """Returns the user id encoded in the token. Raises jose.JWTError if invalid/expired."""
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

    return int(payload["sub"])


def get_user_by_username_or_email_db(db: Session, identifier: str) -> User | None:
    statement = select(User).where(
        (User.username == identifier) | (User.email == identifier)
    )

    return db.execute(statement).scalar_one_or_none()


def get_user_by_username_db(db: Session, username: str) -> User | None:
    statement = select(User).where(User.username == username)

    return db.execute(statement).scalar_one_or_none()


def get_user_by_email_db(db: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)

    return db.execute(statement).scalar_one_or_none()


def get_user_by_id_db(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def complete_onboarding_db(
    db: Session,
    user: User,
    screen_mode: str | None = None,
    age: str | None = None,
    topics: list[str] | None = None,
    prefs: list[str] | None = None,
) -> User:
    user.onboarding_completed = True
    if screen_mode is not None:
        user.screen_mode = screen_mode
    if age is not None:
        user.age = age
    if topics is not None:
        user.topics = json.dumps(topics, ensure_ascii=False)
    if prefs is not None:
        user.prefs = json.dumps(prefs, ensure_ascii=False)
    db.commit()
    db.refresh(user)

    return user


def create_user_db(
    db: Session, *, name: str, username: str, email: str, password: str
) -> User:
    user = User(
        name=name,
        username=username,
        email=email,
        password_hash=hash_password(password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user
