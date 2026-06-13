"""First-admin bootstrap helpers for trusted operator workflows."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import re

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import AdminAuditLog, User, UserRole


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MIN_PASSWORD_LENGTH = 8


@dataclass(frozen=True)
class AdminBootstrapResult:
    """Summary returned by admin bootstrap operations."""

    action: str
    user_id: int
    email: str
    role: str
    password_updated: bool


def normalize_admin_email(email: str) -> str:
    """Normalize and validate the operator-provided admin email."""
    normalized = (email or "").strip().lower()
    if not EMAIL_PATTERN.match(normalized):
        raise ValueError("Admin email must be a valid email address.")
    return normalized


def validate_admin_password(password: str) -> None:
    """Validate the initial admin password before hashing."""
    if len(password or "") < MIN_PASSWORD_LENGTH:
        raise ValueError(
            f"Admin password must be at least {MIN_PASSWORD_LENGTH} characters."
        )


def bootstrap_admin_user(
    db: Session,
    *,
    email: str,
    password: str,
    full_name: str | None = None,
    update_password: bool = False,
) -> AdminBootstrapResult:
    """Create or promote an admin account from a trusted CLI context.

    Existing accounts keep their current password unless ``update_password`` is
    explicitly requested. This lets operators safely promote a registered user
    without surprising them, while still supporting emergency password rotation.
    """
    normalized_email = normalize_admin_email(email)
    validate_admin_password(password)

    user = db.query(User).filter(User.email == normalized_email).first()
    password_updated = False
    changes: list[str] = []

    if user is None:
        user = User(
            email=normalized_email,
            hashed_password=get_password_hash(password),
            full_name=full_name or "PDF-Flow Admin",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow(),
        )
        db.add(user)
        db.flush()
        action = "created"
        password_updated = True
        changes.append("created_admin")
    else:
        action = "updated"
        if user.role != UserRole.ADMIN:
            user.role = UserRole.ADMIN
            changes.append("promoted_to_admin")
        if not user.is_active:
            user.is_active = True
            changes.append("reactivated")
        if not user.is_verified:
            user.is_verified = True
            changes.append("verified")
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            changes.append("updated_name")
        if update_password:
            user.hashed_password = get_password_hash(password)
            password_updated = True
            changes.append("updated_password")
        if not changes:
            action = "unchanged"

    if changes:
        db.add(
            AdminAuditLog(
                admin_user_id=user.id,
                action="bootstrap_admin",
                target_type="user",
                target_key=normalized_email,
                status="success",
                detail=", ".join(changes),
                ip_address="cli",
                user_agent="pdf-flow-admin-bootstrap",
            )
        )

    db.commit()
    db.refresh(user)

    return AdminBootstrapResult(
        action=action,
        user_id=user.id,
        email=user.email,
        role=UserRole.ADMIN.value,
        password_updated=password_updated,
    )
