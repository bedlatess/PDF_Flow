"""Hidden admin console endpoints."""
from datetime import datetime
import json
import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import (
    AdminAuditLog,
    ApiErrorLog,
    FeedbackReport,
    ProcessingJob,
    User,
    UserRole,
    Webhook,
)
from app.domains.admin.audit import write_admin_audit
from app.domains.admin.content import (
    get_admin_overview_summary,
    get_public_config as get_public_config_payload,
    list_content_blocks as list_content_blocks_service,
    list_feature_flags as list_feature_flags_service,
    list_settings as list_settings_service,
    seed_defaults,
    update_content_block as update_content_block_service,
    update_feature_flag as update_feature_flag_service,
    update_setting as update_setting_service,
)
from app.domains.admin.payment_ops import get_payment_operations_summary
from app.services.file_service import file_processing_service
from app.services.file_retention_service import file_retention_service
from app.celery_worker import celery_app
from app.schemas.admin import (
    AdminAuditLogResponse,
    AdminApiErrorResponse,
    AdminCleanupTestUsersResponse,
    AdminDiagnosticsResponse,
    AdminFeedbackCleanupResponse,
    AdminFileRetentionResponse,
    AdminHealthReportResponse,
    AdminJobResponse,
    AdminMaintenanceResponse,
    AdminOperationsResponse,
    AdminPaymentSummaryResponse,
    AdminOverviewResponse,
    AdminUserResponse,
    AdminUserUpdate,
    ContentBlockResponse,
    ContentBlockUpdate,
    FeatureFlagResponse,
    FeatureFlagUpdate,
    SiteSettingResponse,
    SiteSettingUpdate,
)
from app.schemas.feedback import AdminFeedbackResponse, AdminFeedbackUpdate

router = APIRouter()


def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _is_test_account(user: User) -> bool:
    email = (user.email or "").lower()
    return (
        email.startswith("smoke-")
        or email.startswith("ocr-")
        or email.startswith("office-")
        or email.endswith("@example.com")
    )


def _test_user_query(db: Session, admin: User | None = None):
    query = db.query(User).filter(User.role != UserRole.ADMIN)
    if admin is not None:
        query = query.filter(User.id != admin.id)
    audited_admin_ids = db.query(AdminAuditLog.admin_user_id)
    query = query.filter(~User.id.in_(audited_admin_ids))
    return query.filter(
        (User.email.ilike("smoke-%"))
        | (User.email.ilike("ocr-%"))
        | (User.email.ilike("office-%"))
        | (User.email.ilike("%@example.com"))
    )


def _serialize_admin_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": _role_value(user),
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "is_test_account": _is_test_account(user),
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
    }


def _datetime_from_epoch(value) -> datetime | None:
    try:
        return datetime.fromtimestamp(float(value))
    except (TypeError, ValueError, OSError):
        return None


def _infer_job_type(status_data: dict) -> str:
    message = str(status_data.get("message") or "").lower()
    result = status_data.get("result") or {}
    if "ocr" in message or "text" in result:
        return "ocr_pdf"
    if "office" in message:
        return "office_to_pdf"
    if "merge" in message:
        return "merge_pdf"
    if "split" in message:
        return "split_pdf"
    if "compression" in message or "compress" in message:
        return "compress_pdf"
    if "rotation" in message or "rotate" in message:
        return "rotate_pdf"
    if "image to pdf" in message:
        return "image_to_pdf"
    if "pdf to images" in message:
        return "pdf_to_image"
    return "processing_job"


def _list_redis_jobs(limit: int) -> list[dict]:
    jobs = []
    redis_client = file_processing_service.redis_client
    try:
        keys = list(redis_client.scan_iter("job:*", count=100))
    except AttributeError:
        keys = [key for key in getattr(redis_client, "store", {}).keys() if str(key).startswith("job:")]
    except Exception:
        return jobs

    for index, key in enumerate(keys):
        try:
            raw = redis_client.get(key)
            if not raw:
                continue
            import json

            status_data = json.loads(raw)
        except Exception:
            continue

        created_at = _datetime_from_epoch(status_data.get("created_at"))
        updated_at = _datetime_from_epoch(status_data.get("updated_at")) or created_at
        result = status_data.get("result") or {}
        error = status_data.get("error")
        output_path = result.get("output_path") or ""
        input_file_name = result.get("input_file_name") or output_path.rsplit("/", 1)[-1] or "Redis task"
        jobs.append({
            "id": None,
            "job_id": status_data.get("job_id") or str(key).replace("job:", ""),
            "user_id": None,
            "user_email": None,
            "job_type": _infer_job_type(status_data),
            "status": status_data.get("status", "unknown"),
            "progress": int(status_data.get("progress") or (100 if status_data.get("status") == "completed" else 0)),
            "input_file_name": input_file_name,
            "input_file_size": int(result.get("file_size") or 0),
            "error_message": str(error) if error else None,
            "created_at": created_at or datetime.fromtimestamp(0),
            "started_at": None,
            "completed_at": updated_at if status_data.get("status") in ("completed", "failed") else None,
            "_sort": created_at.timestamp() if created_at else time.time() - index,
        })

    jobs.sort(key=lambda item: item["_sort"], reverse=True)
    for item in jobs:
        item.pop("_sort", None)
    return jobs[:limit]


def _check_services(db: Session) -> dict:
    services = {}
    try:
        db.execute(text("SELECT 1"))
        services["database"] = {"status": "healthy", "detail": "Postgres reachable"}
    except Exception as exc:
        services["database"] = {"status": "unhealthy", "detail": str(exc)}

    try:
        file_processing_service.redis_client.ping()
        services["redis"] = {"status": "healthy", "detail": "Redis reachable"}
    except Exception as exc:
        services["redis"] = {"status": "unhealthy", "detail": str(exc)}

    if services.get("redis", {}).get("status") != "healthy":
        services["celery_worker"] = {
            "status": "unhealthy",
            "detail": "Redis broker is unavailable.",
        }
    else:
        try:
            responses = celery_app.control.ping(timeout=1.0)
            services["celery_worker"] = {
                "status": "healthy" if responses else "degraded",
                "detail": f"{len(responses)} worker response(s)" if responses else "No worker responded to Celery ping.",
            }
        except Exception as exc:
            services["celery_worker"] = {
                "status": "degraded",
                "detail": f"Celery ping failed: {exc}",
            }
    return services


def _current_migration_version(db: Session) -> str | None:
    try:
        row = db.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).first()
        return row[0] if row else None
    except Exception:
        return None


def _list_all_jobs_for_admin(db: Session, limit: int, status_filter: str | None = None) -> list[dict]:
    safe_limit = min(max(limit, 1), 100)
    redis_jobs = _list_redis_jobs(safe_limit)
    if status_filter:
        redis_jobs = [job for job in redis_jobs if job["status"] == status_filter]

    query = (
        db.query(ProcessingJob, User.email)
        .outerjoin(User, ProcessingJob.user_id == User.id)
        .order_by(ProcessingJob.created_at.desc())
    )
    if status_filter:
        query = query.filter(ProcessingJob.status == status_filter)

    rows = query.limit(safe_limit).all()
    db_jobs = [
        {
            "id": job.id,
            "job_id": job.job_id,
            "user_id": job.user_id,
            "user_email": email,
            "job_type": job.job_type,
            "status": job.status,
            "progress": job.progress,
            "input_file_name": job.input_file_name,
            "input_file_size": job.input_file_size,
            "error_message": job.error_message,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
        }
        for job, email in rows
    ]
    seen = {job["job_id"] for job in redis_jobs}
    merged = redis_jobs + [job for job in db_jobs if job["job_id"] not in seen]
    merged.sort(key=lambda item: item["created_at"], reverse=True)
    return merged[:safe_limit]


def _safe_diag(value: object | None, fallback: str = "none", max_length: int = 240) -> str:
    if value is None:
        return fallback
    text_value = str(value).replace("\r", " ").replace("\n", " ").strip()
    if not text_value:
        return fallback
    return text_value if len(text_value) <= max_length else f"{text_value[:max_length - 3]}..."


def _build_diagnostic_summary(
    generated_at: datetime,
    services: dict,
    errors: list[ApiErrorLog],
    failed_jobs: list[dict],
    feedback: list[FeedbackReport],
    open_feedback_count: int,
    failed_jobs_count: int,
    api_error_count: int,
) -> str:
    service_status = ", ".join(
        f"{name}={getattr(status, 'status', None) or status.get('status', 'unknown')}"
        for name, status in services.items()
    ) or "none"

    lines = [
        "PDF-Flow diagnostic packet",
        f"Generated: {generated_at.isoformat()}Z",
        f"Environment: {settings.ENVIRONMENT}",
        f"Version: {settings.VERSION}",
        f"Services: {service_status}",
        f"Counts: api_errors={api_error_count}, failed_jobs={failed_jobs_count}, open_feedback={open_feedback_count}",
    ]

    if errors:
        error = errors[0]
        lines.extend([
            "",
            "Latest API error:",
            f"- request_id={_safe_diag(error.request_id)}",
            f"- route={error.method} {_safe_diag(error.path, max_length=180)}",
            f"- status={error.status_code}, type={_safe_diag(error.error_type)}",
            f"- message={_safe_diag(error.error_message or error.traceback_summary, max_length=280)}",
        ])

    if failed_jobs:
        job = failed_jobs[0]
        lines.extend([
            "",
            "Latest failed job:",
            f"- job_id={_safe_diag(job.get('job_id'))}",
            f"- type={_safe_diag(job.get('job_type'))}, status={_safe_diag(job.get('status'))}, progress={job.get('progress', 0)}",
            f"- file={_safe_diag(job.get('input_file_name'), max_length=180)}, size={job.get('input_file_size', 0)}",
            f"- error={_safe_diag(job.get('error_message'), max_length=280)}",
        ])

    if feedback:
        item = feedback[0]
        lines.extend([
            "",
            "Latest open feedback:",
            f"- id={item.id}, status={_safe_diag(item.status)}, severity={_safe_diag(item.severity)}",
            f"- title={_safe_diag(item.title, max_length=180)}",
            f"- page={_safe_diag(item.page_url, max_length=180)}",
            f"- diagnostic_code={_safe_diag(item.diagnostic_code)}",
        ])

    lines.extend([
        "",
        "Privacy note: request bodies and document contents are not included in this packet.",
    ])
    return "\n".join(lines)


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require an authenticated admin user."""
    if _role_value(current_user) != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return admin console summary and seed defaults on first use."""
    return get_admin_overview_summary(db)


@router.get("/operations", response_model=AdminOperationsResponse)
async def get_operations_overview(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return one-shot operational dashboard data for the hidden control room."""
    seed_defaults(db)
    users = db.query(User).order_by(User.created_at.desc()).limit(8).all()
    all_users = db.query(User).all()
    jobs = _list_all_jobs_for_admin(db, limit=50)
    failed_jobs = [job for job in jobs if job["status"] == "failed"]
    running_jobs = [job for job in jobs if job["status"] in ("pending", "processing")]

    return {
        "generated_at": datetime.utcnow(),
        "services": _check_services(db),
        "total_users": len(all_users),
        "active_users": len([user for user in all_users if user.is_active]),
        "banned_users": len([user for user in all_users if not user.is_active]),
        "test_users": len([user for user in all_users if _is_test_account(user)]),
        "total_jobs": db.query(ProcessingJob).count(),
        "visible_jobs": len(jobs),
        "failed_jobs": len(failed_jobs),
        "running_jobs": len(running_jobs),
        "recent_users": [_serialize_admin_user(user) for user in users],
        "recent_failed_jobs": failed_jobs[:5],
        "recent_jobs": jobs[:8],
    }


@router.get("/health-report", response_model=AdminHealthReportResponse)
async def get_health_report(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return a safe copyable live health summary for admin troubleshooting."""
    seed_defaults(db)
    jobs = _list_all_jobs_for_admin(db, limit=50)
    failed_jobs = [job for job in jobs if job["status"] == "failed"]
    running_jobs = [job for job in jobs if job["status"] in ("pending", "processing")]
    recent_error = db.query(ApiErrorLog).order_by(ApiErrorLog.created_at.desc()).first()
    recent_feedback = (
        db.query(FeedbackReport)
        .filter(FeedbackReport.status.in_(["new", "reviewing"]))
        .order_by(FeedbackReport.created_at.desc())
        .first()
    )

    return {
        "generated_at": datetime.utcnow(),
        "app_version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "migration_version": _current_migration_version(db),
        "services": _check_services(db),
        "users_count": db.query(User).count(),
        "active_users_count": db.query(User).filter(User.is_active == True).count(),  # noqa: E712
        "open_feedback_count": db.query(FeedbackReport).filter(FeedbackReport.status.in_(["new", "reviewing"])).count(),
        "api_error_count": db.query(ApiErrorLog).count(),
        "failed_jobs_count": len(failed_jobs),
        "running_jobs_count": len(running_jobs),
        "recent_error_path": recent_error.path if recent_error else None,
        "recent_feedback_title": recent_feedback.title if recent_feedback else None,
    }


@router.get("/payments", response_model=AdminPaymentSummaryResponse)
async def get_payment_operations(
    provider: str | None = None,
    status_filter: str | None = None,
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return read-only payment operations data for reconciliation."""
    return get_payment_operations_summary(
        db,
        provider=provider,
        status_filter=status_filter,
        limit=limit,
    )


@router.get("/public-config")
async def get_public_config(db: Session = Depends(get_db)):
    """Public read-only site configuration used by the frontend."""
    return get_public_config_payload(db)


@router.get("/settings", response_model=list[SiteSettingResponse])
async def list_settings(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return list_settings_service(db)


@router.put("/settings/{key}", response_model=SiteSettingResponse)
async def update_setting(
    key: str,
    payload: SiteSettingUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return update_setting_service(
        db,
        key=key,
        payload=payload,
        request=request,
        admin=admin,
    )


@router.get("/feature-flags", response_model=list[FeatureFlagResponse])
async def list_feature_flags(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return list_feature_flags_service(db)


@router.put("/feature-flags/{key}", response_model=FeatureFlagResponse)
async def update_feature_flag(
    key: str,
    payload: FeatureFlagUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return update_feature_flag_service(
        db,
        key=key,
        payload=payload,
        request=request,
        admin=admin,
    )


@router.get("/content-blocks", response_model=list[ContentBlockResponse])
async def list_content_blocks(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return list_content_blocks_service(db)


@router.put("/content-blocks/{key}/{locale}", response_model=ContentBlockResponse)
async def update_content_block(
    key: str,
    locale: str,
    payload: ContentBlockUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return update_content_block_service(
        db,
        key=key,
        locale=locale,
        payload=payload,
        request=request,
        admin=admin,
    )


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    search: str | None = None,
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return recent users for hidden admin operations."""
    query = db.query(User).order_by(User.created_at.desc())
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            (User.email.ilike(pattern)) | (User.full_name.ilike(pattern))
        )

    users = query.limit(min(max(limit, 1), 100)).all()
    return [_serialize_admin_user(user) for user in users]


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a user's operational status or role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    if user.id == admin.id and (
        data.get("is_active") is False
        or (data.get("role") is not None and data["role"] != UserRole.ADMIN.value)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin access.",
        )

    if "role" in data:
        try:
            user.role = UserRole(data["role"])
        except ValueError as exc:
            allowed = ", ".join(role.value for role in UserRole)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid role. Allowed values: {allowed}",
            ) from exc
    if "is_active" in data:
        user.is_active = data["is_active"]
    if "is_verified" in data:
        user.is_verified = data["is_verified"]

    write_admin_audit(
        db,
        request,
        admin,
        "update",
        "user",
        user.email,
        detail=", ".join(sorted(data.keys())),
    )
    db.commit()
    db.refresh(user)
    return _serialize_admin_user(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a non-current user account and related owned records."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account.",
        )

    email = user.email
    write_admin_audit(db, request, admin, "delete", "user", email)
    db.delete(user)
    db.commit()
    return None


@router.post("/users/cleanup-test-users", response_model=AdminCleanupTestUsersResponse)
async def cleanup_test_users(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete synthetic test accounts while preserving admin and real user accounts."""
    users = _test_user_query(db, admin).all()
    user_ids = [user.id for user in users]
    deleted_emails = [user.email for user in users]

    if user_ids:
        db.query(FeedbackReport).filter(FeedbackReport.user_id.in_(user_ids)).update(
            {FeedbackReport.user_id: None},
            synchronize_session=False,
        )
        db.query(ApiErrorLog).filter(ApiErrorLog.user_id.in_(user_ids)).update(
            {ApiErrorLog.user_id: None},
            synchronize_session=False,
        )
        db.query(ProcessingJob).filter(ProcessingJob.user_id.in_(user_ids)).delete(
            synchronize_session=False
        )
        db.query(Webhook).filter(Webhook.user_id.in_(user_ids)).delete(
            synchronize_session=False
        )

        for user in users:
            db.delete(user)

    write_admin_audit(
        db,
        request,
        admin,
        "cleanup",
        "user",
        "test_accounts",
        detail=f"deleted={len(users)}",
    )
    db.commit()

    return {
        "deleted_count": len(users),
        "deleted_emails": deleted_emails,
        "remaining_test_users_count": _test_user_query(db, admin).count(),
    }


@router.get("/jobs", response_model=list[AdminJobResponse])
async def list_jobs(
    status_filter: str | None = None,
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return recent processing jobs with user context."""
    return _list_all_jobs_for_admin(db, limit=limit, status_filter=status_filter)


@router.get("/feedback", response_model=list[AdminFeedbackResponse])
async def list_feedback(
    status_filter: str | None = None,
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return recent user-submitted feedback reports."""
    safe_limit = min(max(limit, 1), 100)
    query = db.query(FeedbackReport).order_by(FeedbackReport.created_at.desc())
    if status_filter:
        query = query.filter(FeedbackReport.status == status_filter)
    return query.limit(safe_limit).all()


@router.get("/errors", response_model=list[AdminApiErrorResponse])
async def list_api_errors(
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return recent API 500-level error summaries."""
    safe_limit = min(max(limit, 1), 100)
    return (
        db.query(ApiErrorLog)
        .order_by(ApiErrorLog.created_at.desc())
        .limit(safe_limit)
        .all()
    )


@router.get("/diagnostics", response_model=AdminDiagnosticsResponse)
async def get_diagnostics(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return combined live-testing signals for quick production triage."""
    generated_at = datetime.utcnow()
    errors = (
        db.query(ApiErrorLog)
        .order_by(ApiErrorLog.created_at.desc())
        .limit(20)
        .all()
    )
    jobs = _list_all_jobs_for_admin(db, limit=50)
    failed_jobs = [job for job in jobs if job["status"] == "failed"][:10]
    failed_jobs_count = len([job for job in jobs if job["status"] == "failed"])
    feedback = (
        db.query(FeedbackReport)
        .filter(FeedbackReport.status.in_(["new", "reviewing"]))
        .order_by(FeedbackReport.created_at.desc())
        .limit(10)
        .all()
    )
    open_feedback_count = db.query(FeedbackReport).filter(
        FeedbackReport.status.in_(["new", "reviewing"])
    ).count()
    api_error_count = db.query(ApiErrorLog).count()
    services = _check_services(db)

    return {
        "generated_at": generated_at,
        "recent_errors": errors,
        "recent_failed_jobs": failed_jobs,
        "recent_feedback": [
            {
                "id": item.id,
                "title": item.title,
                "status": item.status,
                "severity": item.severity,
                "page_url": item.page_url,
                "diagnostic_code": item.diagnostic_code,
                "created_at": item.created_at,
            }
            for item in feedback
        ],
        "diagnostic_summary": _build_diagnostic_summary(
            generated_at=generated_at,
            services=services,
            errors=errors,
            failed_jobs=failed_jobs,
            feedback=feedback,
            open_feedback_count=open_feedback_count,
            failed_jobs_count=failed_jobs_count,
            api_error_count=api_error_count,
        ),
        "open_feedback_count": open_feedback_count,
        "failed_jobs_count": failed_jobs_count,
        "api_error_count": api_error_count,
    }


@router.get("/maintenance", response_model=AdminMaintenanceResponse)
async def get_maintenance_summary(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return safe cleanup counts for hidden admin maintenance actions."""
    jobs = _list_all_jobs_for_admin(db, limit=50)
    return {
        "test_users_count": _test_user_query(db, admin).count(),
        "live_acceptance_feedback_count": db.query(FeedbackReport).filter(
            FeedbackReport.status.in_(["new", "reviewing"]),
            FeedbackReport.title.ilike("live acceptance%"),
        ).count(),
        "open_feedback_count": db.query(FeedbackReport).filter(
            FeedbackReport.status.in_(["new", "reviewing"])
        ).count(),
        "api_error_count": db.query(ApiErrorLog).count(),
        "failed_jobs_count": len([job for job in jobs if job["status"] == "failed"]),
        "running_jobs_count": len([job for job in jobs if job["status"] in ("pending", "processing")]),
        "file_retention": file_retention_service.preview(),
    }


@router.post("/files/cleanup-expired", response_model=AdminFileRetentionResponse)
async def cleanup_expired_files(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete expired temporary upload/result/download directories under UPLOAD_DIR."""
    result = file_retention_service.cleanup()
    write_admin_audit(
        db,
        request,
        admin,
        "cleanup",
        "file_retention",
        settings.UPLOAD_DIR,
        detail=f"removed={result['removed_count']}, bytes={result['removed_bytes']}",
    )
    db.commit()
    return result


@router.patch("/feedback/{feedback_id}", response_model=AdminFeedbackResponse)
async def update_feedback(
    feedback_id: int,
    payload: AdminFeedbackUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update feedback triage status or internal admin note."""
    report = db.query(FeedbackReport).filter(FeedbackReport.id == feedback_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        allowed = {"new", "reviewing", "resolved", "closed"}
        if data["status"] not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid feedback status. Allowed values: {', '.join(sorted(allowed))}",
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


@router.post("/feedback/cleanup-live-acceptance", response_model=AdminFeedbackCleanupResponse)
async def cleanup_live_acceptance_feedback(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Close synthetic live-acceptance feedback probes without touching real user reports."""
    reports = (
        db.query(FeedbackReport)
        .filter(
            FeedbackReport.status.in_(["new", "reviewing"]),
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
        FeedbackReport.status.in_(["new", "reviewing"])
    ).count()
    return {
        "closed_count": len(reports),
        "remaining_open_count": remaining_open,
    }


@router.get("/audit-logs", response_model=list[AdminAuditLogResponse])
async def list_audit_logs(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(50)
        .all()
    )
