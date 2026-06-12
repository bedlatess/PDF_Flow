"""Admin feedback triage and audit-log operations."""

from __future__ import annotations

import json

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.domains.admin.audit import write_admin_audit
from app.models.user import AdminAuditLog, FeedbackReport, User
from app.schemas.feedback import AdminFeedbackUpdate

OPEN_FEEDBACK_STATUSES = ("new", "reviewing")
ALLOWED_FEEDBACK_STATUSES = {"new", "reviewing", "resolved", "closed"}


def list_feedback(
    db: Session,
    *,
    status_filter: str | None = None,
    limit: int = 50,
) -> list[FeedbackReport]:
    safe_limit = min(max(limit, 1), 100)
    query = db.query(FeedbackReport).order_by(FeedbackReport.created_at.desc())
    if status_filter:
        query = query.filter(FeedbackReport.status == status_filter)
    return query.limit(safe_limit).all()


def update_feedback(
    db: Session,
    *,
    feedback_id: int,
    payload: AdminFeedbackUpdate,
    request: Request,
    admin: User,
) -> FeedbackReport:
    report = db.query(FeedbackReport).filter(FeedbackReport.id == feedback_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        if data["status"] not in ALLOWED_FEEDBACK_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid feedback status. Allowed values: {', '.join(sorted(ALLOWED_FEEDBACK_STATUSES))}",
            )
        report.status = data["status"]
    if "admin_note" in data:
        report.admin_note = data["admin_note"]

    write_admin_audit(
        db,
        request,
        admin,
        "update",
        "feedback",
        str(report.id),
        detail=json.dumps(data, ensure_ascii=False),
    )
    db.commit()
    db.refresh(report)
    return report


def cleanup_live_acceptance_feedback(
    db: Session,
    *,
    request: Request,
    admin: User,
) -> dict:
    reports = (
        db.query(FeedbackReport)
        .filter(
            FeedbackReport.status.in_(OPEN_FEEDBACK_STATUSES),
            FeedbackReport.title.ilike("live acceptance%"),
        )
        .all()
    )

    for report in reports:
        report.status = "closed"
        report.admin_note = "Closed automatically by live acceptance cleanup."

    write_admin_audit(
        db,
        request,
        admin,
        "cleanup",
        "feedback",
        "live_acceptance",
        detail=f"closed={len(reports)}",
    )
    db.commit()

    remaining_open = db.query(FeedbackReport).filter(
        FeedbackReport.status.in_(OPEN_FEEDBACK_STATUSES)
    ).count()
    return {
        "closed_count": len(reports),
        "remaining_open_count": remaining_open,
    }


def list_audit_logs(db: Session, *, limit: int = 50) -> list[AdminAuditLog]:
    safe_limit = min(max(limit, 1), 100)
    return (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(safe_limit)
        .all()
    )
