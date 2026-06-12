"""Shared admin audit helpers."""

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.user import AdminAuditLog, User


def write_admin_audit(
    db: Session,
    request: Request,
    admin: User,
    action: str,
    target_type: str,
    target_key: str,
    detail: str | None = None,
) -> None:
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    db.add(
        AdminAuditLog(
            admin_user_id=admin.id,
            action=action,
            target_type=target_type,
            target_key=target_key,
            detail=detail,
            ip_address=client_host,
            user_agent=user_agent,
        )
    )

