"""User feedback endpoints for live testing support."""
import json
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user_optional
from app.core.database import get_db
from app.models.user import FeedbackReport, User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse

router = APIRouter()


def _truncate(value, limit: int) -> str | None:
    if value is None:
        return None
    text = str(value)
    if len(text) <= limit:
        return text
    return f"{text[:limit - 3]}..."


def _client_host(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/feedback", response_model=FeedbackResponse)
async def create_feedback(
    payload: FeedbackCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Store a user-visible issue report with safe diagnostic context."""
    diagnostics = payload.diagnostics or {}
    if diagnostics:
        diagnostics = {
            key: _truncate(value, 1200)
            for key, value in diagnostics.items()
            if key in {
                "path",
                "url",
                "locale",
                "theme",
                "viewport",
                "userAgent",
                "timezone",
                "timestamp",
                "authState",
                "lastErrorCode",
            }
        }

    report = FeedbackReport(
        user_id=current_user.id if current_user else None,
        email=_truncate(payload.email or (current_user.email if current_user else None), 255),
        category=_truncate(payload.category, 40) or "bug",
        severity=_truncate(payload.severity, 40) or "normal",
        page_url=_truncate(payload.page_url, 1200),
        title=_truncate(payload.title, 160) or "Untitled feedback",
        message=payload.message,
        diagnostic_code=_truncate(payload.diagnostic_code, 80),
        diagnostics=json.dumps(diagnostics, ensure_ascii=False) if diagnostics else None,
        ip_address=_client_host(request),
        user_agent=_truncate(request.headers.get("user-agent"), 1000),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
