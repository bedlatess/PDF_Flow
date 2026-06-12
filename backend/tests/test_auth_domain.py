"""Email/password authentication domain tests."""

from fastapi import BackgroundTasks


def test_auth_domain_register_login_refresh_and_current_user(client):
    from app.core.database import get_db
    from app.domains.auth.service import (
        get_current_user_from_token,
        get_optional_user_from_token,
        login_user,
        parse_token_user_id,
        refresh_token_pair,
        register_user,
    )
    from app.models.user import User
    from app.schemas.user import UserCreate

    db = next(client.app.dependency_overrides[get_db]())
    try:
        user = register_user(
            db,
            user_data=UserCreate(
                email="auth-domain@example.com",
                password="SecurePass123!",
                full_name="Auth Domain",
            ),
            background_tasks=BackgroundTasks(),
        )
        assert user.id is not None
        assert user.role.value == "free"

        tokens = login_user(
            db,
            email="auth-domain@example.com",
            password="SecurePass123!",
        )
        assert tokens["token_type"] == "bearer"
        assert parse_token_user_id(tokens["access_token"]) == user.id

        current = get_current_user_from_token(db, tokens["access_token"])
        assert current.email == "auth-domain@example.com"
        assert get_optional_user_from_token(db, None) is None
        assert get_optional_user_from_token(db, "garbage") is None

        refreshed = refresh_token_pair(db, refresh_token=tokens["refresh_token"])
        assert parse_token_user_id(refreshed["access_token"]) == user.id

        persisted = db.query(User).filter(User.email == "auth-domain@example.com").first()
        assert persisted.last_login_at is not None
    finally:
        db.close()


def test_auth_domain_password_reset_and_inactive_user_guards(client):
    import pytest
    from fastapi import HTTPException

    from app.core.database import get_db
    from app.core.security import create_access_token, verify_password
    from app.domains.auth.service import register_user
    from app.domains.auth.service import (
        get_current_user_from_token,
        login_user,
        request_password_reset,
        reset_password,
    )
    from app.models.user import User
    from app.schemas.user import PasswordResetConfirm, PasswordResetRequest, UserCreate

    db = next(client.app.dependency_overrides[get_db]())
    try:
        user = register_user(
            db,
            user_data=UserCreate(
                email="reset-domain@example.com",
                password="SecurePass123!",
                full_name="Reset Domain",
            ),
            background_tasks=BackgroundTasks(),
        )

        response = request_password_reset(
            db,
            request=PasswordResetRequest(email="reset-domain@example.com"),
            background_tasks=BackgroundTasks(),
        )
        assert "password reset link" in response["message"]

        token = create_access_token(data={"sub": user.id, "type": "password_reset"})
        reset_password(
            db,
            request=PasswordResetConfirm(
                token=token,
                new_password="NewSecurePass123!",
            ),
        )
        db.refresh(user)
        assert verify_password("NewSecurePass123!", user.hashed_password)

        inactive_token = create_access_token(data={"sub": user.id})
        user.is_active = False
        db.commit()

        with pytest.raises(HTTPException) as login_error:
            login_user(db, email="reset-domain@example.com", password="NewSecurePass123!")
        assert login_error.value.status_code == 403

        with pytest.raises(HTTPException) as current_error:
            get_current_user_from_token(db, inactive_token)
        assert current_error.value.status_code == 403

        inactive = db.query(User).filter(User.email == "reset-domain@example.com").first()
        assert inactive.is_active is False
    finally:
        db.close()
