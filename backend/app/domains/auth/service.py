"""Core email/password authentication domain."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User, UserRole
from app.schemas.user import PasswordResetConfirm, PasswordResetRequest, UserCreate
from app.services.email_service import email_service


def credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def parse_token_user_id(token: str, *, expected_type: str | None = None) -> int | None:
    payload = decode_token(token)
    if payload is None:
        return None
    if expected_type is not None and payload.get("type") != expected_type:
        return None
    user_id = payload.get("sub")
    try:
        return int(user_id)
    except (ValueError, TypeError):
        return None


def get_current_user_from_token(db: Session, token: str | None) -> User:
    if not token:
        raise credentials_exception()

    user_id = parse_token_user_id(token)
    if user_id is None:
        raise credentials_exception()

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def get_optional_user_from_token(db: Session, token: str | None) -> User | None:
    if not token:
        return None

    try:
        return get_current_user_from_token(db, token)
    except HTTPException:
        return None


def token_pair_for_user(user: User) -> dict:
    return {
        "access_token": create_access_token(data={"sub": user.id}),
        "refresh_token": create_refresh_token(data={"sub": user.id}),
        "token_type": "bearer",
    }


def register_user(
    db: Session,
    *,
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
) -> User:
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=UserRole.FREE,
        is_active=True,
        is_verified=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    background_tasks.add_task(
        email_service.send_welcome_email,
        to=new_user.email,
        username=new_user.full_name or new_user.email.split("@")[0],
    )

    return new_user


def login_user(db: Session, *, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    user.last_login_at = datetime.utcnow()
    db.commit()

    return token_pair_for_user(user)


def refresh_token_pair(db: Session, *, refresh_token: str) -> dict:
    user_id = parse_token_user_id(refresh_token, expected_type="refresh")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user",
        )

    return token_pair_for_user(user)


def request_password_reset(
    db: Session,
    *,
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
) -> dict:
    user = db.query(User).filter(User.email == request.email).first()

    if user and user.is_active:
        reset_token = create_access_token(
            data={"sub": user.id, "type": "password_reset"},
            expires_delta=timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS),
        )

        background_tasks.add_task(
            email_service.send_password_reset_email,
            to=user.email,
            username=user.full_name or user.email.split("@")[0],
            reset_token=reset_token,
        )

    return {
        "message": "If an account exists with that email, a password reset link has been sent"
    }


def reset_password(db: Session, *, request: PasswordResetConfirm) -> dict:
    user_id = parse_token_user_id(request.token, expected_type="password_reset")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    user.hashed_password = get_password_hash(request.new_password)
    db.commit()

    return {"message": "Password successfully reset"}
