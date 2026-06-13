"""Admin bootstrap domain tests."""

import pytest

from app.core.security import verify_password
from app.domains.admin.bootstrap import bootstrap_admin_user
from app.models.user import AdminAuditLog, User, UserRole


def _db_session():
    from conftest import TestingSessionLocal

    return TestingSessionLocal()


def test_bootstrap_admin_creates_first_admin(client):
    with _db_session() as db:
        result = bootstrap_admin_user(
            db,
            email="Owner@Example.com",
            password="SecurePass123!",
            full_name="Owner",
        )

        user = db.query(User).filter(User.email == "owner@example.com").first()
        audit = db.query(AdminAuditLog).filter(
            AdminAuditLog.target_key == "owner@example.com"
        ).first()

        assert result.action == "created"
        assert result.role == "admin"
        assert result.password_updated is True
        assert user is not None
        assert user.role == UserRole.ADMIN
        assert user.is_active is True
        assert user.is_verified is True
        assert verify_password("SecurePass123!", user.hashed_password)
        assert audit is not None
        assert "created_admin" in audit.detail


def test_bootstrap_admin_promotes_existing_user_without_password_rotation(client):
    with _db_session() as db:
        user = User(
            email="member@example.com",
            hashed_password="existing-hash",
            full_name="Member",
            role=UserRole.FREE,
            is_active=False,
            is_verified=False,
        )
        db.add(user)
        db.commit()

        result = bootstrap_admin_user(
            db,
            email="member@example.com",
            password="IgnoredPass123!",
        )

        db.refresh(user)
        assert result.action == "updated"
        assert result.password_updated is False
        assert user.role == UserRole.ADMIN
        assert user.is_active is True
        assert user.is_verified is True
        assert user.hashed_password == "existing-hash"


def test_bootstrap_admin_can_rotate_existing_password(client):
    with _db_session() as db:
        user = User(
            email="rotate@example.com",
            hashed_password="old-hash",
            full_name="Rotate",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()

        result = bootstrap_admin_user(
            db,
            email="rotate@example.com",
            password="NewSecurePass123!",
            update_password=True,
        )

        db.refresh(user)
        assert result.action == "updated"
        assert result.password_updated is True
        assert verify_password("NewSecurePass123!", user.hashed_password)


@pytest.mark.parametrize(
    ("email", "password"),
    [
        ("not-an-email", "SecurePass123!"),
        ("admin@example.com", "short"),
    ],
)
def test_bootstrap_admin_validates_inputs(client, email, password):
    with _db_session() as db:
        with pytest.raises(ValueError):
            bootstrap_admin_user(db, email=email, password=password)
