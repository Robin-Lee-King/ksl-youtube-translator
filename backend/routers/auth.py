from fastapi import APIRouter, Depends, Header, HTTPException
from jose import JWTError
from sqlalchemy.orm import Session

from database import get_db
from schemas.auth import AuthResponse, CompleteOnboardingRequest, LoginRequest, SignupRequest, UserOut
from services import auth_service
from models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="인증 정보가 없습니다.")

    token = authorization.split(" ", 1)[1]

    try:
        user_id = auth_service.decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="토큰이 유효하지 않거나 만료되었습니다.")

    user = auth_service.get_user_by_id_db(db, user_id)

    if user is None:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")

    return user


def get_current_user_optional(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User | None:
    """Only the "no credential offered" case is optional: no Authorization header (or a
    non-Bearer one) resolves to None so POST /translate/jobs keeps working for anonymous callers
    (see create_translation_job in routers/job.py). A Bearer token that IS present but invalid,
    expired, or for a deleted user still raises 401, same as get_current_user — silently treating a
    stale token as "anonymous" would let a logged-in user's job get saved with no owner without any
    signal, so it'd quietly never show up in their GET /history."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1]

    try:
        user_id = auth_service.decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="토큰이 유효하지 않거나 만료되었습니다.")

    user = auth_service.get_user_by_id_db(db, user_id)

    if user is None:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")

    return user


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    if auth_service.get_user_by_username_db(db, payload.username):
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.")

    if auth_service.get_user_by_email_db(db, payload.email):
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

    user = auth_service.create_user_db(
        db,
        name=payload.name,
        username=payload.username,
        email=payload.email,
        password=payload.password,
    )
    token = auth_service.create_access_token(user.id)

    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.get_user_by_username_or_email_db(db, payload.username_or_email)

    if user is None or not auth_service.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호를 확인해주세요")

    token = auth_service.create_access_token(user.id)

    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.patch("/me/onboarding", response_model=UserOut)
def complete_onboarding(
    payload: CompleteOnboardingRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = auth_service.complete_onboarding_db(
        db,
        current_user,
        screen_mode=payload.screen_mode if payload else None,
        age=payload.age if payload else None,
        topics=payload.topics if payload else None,
        prefs=payload.prefs if payload else None,
    )
    return UserOut.model_validate(user)
