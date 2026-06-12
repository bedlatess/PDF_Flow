"""Enterprise domain logic for API keys, usage, webhooks, billing, and dashboard."""

from datetime import datetime, timedelta
import json
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import generate_api_key, hash_api_key
from app.models.user import APIKey, UsageLog, User, Webhook
from app.schemas.enterprise import (
    APIKeyCreate,
    APIKeyList,
    APIKeyResponse,
    APIKeyUpdate,
    BillingStatsResponse,
    DashboardStats,
    TokenPricing,
    UsageLogResponse,
    UsageQuery,
    UsageStatsResponse,
    WebhookCreate,
    WebhookList,
    WebhookResponse,
    WebhookUpdate,
)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _api_key_query(db: Session, user: User, key_id: int):
    return db.query(APIKey).filter(APIKey.id == key_id, APIKey.user_id == user.id)


def _webhook_query(db: Session, user: User, webhook_id: int):
    return db.query(Webhook).filter(Webhook.id == webhook_id, Webhook.user_id == user.id)


def _webhook_response(webhook: Webhook) -> WebhookResponse:
    return WebhookResponse(
        id=webhook.id,
        url=webhook.url,
        events=json.loads(webhook.events),
        is_active=webhook.is_active,
        last_triggered_at=webhook.last_triggered_at,
        created_at=webhook.created_at,
        updated_at=webhook.updated_at,
        total_deliveries=webhook.total_deliveries,
        successful_deliveries=webhook.successful_deliveries,
        failed_deliveries=webhook.failed_deliveries,
    )


def create_api_key(db: Session, user: User, payload: APIKeyCreate) -> APIKeyResponse:
    plain_key = generate_api_key()
    db_key = APIKey(
        user_id=user.id,
        name=payload.name,
        key_hash=hash_api_key(plain_key),
        key_prefix=plain_key[:12],
        rate_limit=payload.rate_limit,
        expires_at=(
            datetime.utcnow() + timedelta(days=payload.expires_in_days)
            if payload.expires_in_days
            else None
        ),
    )

    db.add(db_key)
    db.commit()
    db.refresh(db_key)

    response = APIKeyResponse.model_validate(db_key)
    response.api_key = plain_key
    return response


def list_api_keys(db: Session, user: User) -> APIKeyList:
    keys = db.query(APIKey).filter(APIKey.user_id == user.id).all()
    return APIKeyList(keys=[APIKeyResponse.model_validate(key) for key in keys], total=len(keys))


def get_api_key(db: Session, user: User, key_id: int) -> APIKeyResponse:
    key = _api_key_query(db, user, key_id).first()
    if not key:
        raise _not_found("API key not found")
    return APIKeyResponse.model_validate(key)


def update_api_key(
    db: Session,
    user: User,
    key_id: int,
    payload: APIKeyUpdate,
) -> APIKeyResponse:
    key = _api_key_query(db, user, key_id).first()
    if not key:
        raise _not_found("API key not found")

    if payload.name is not None:
        key.name = payload.name
    if payload.is_active is not None:
        key.is_active = payload.is_active
    if payload.rate_limit is not None:
        key.rate_limit = payload.rate_limit

    db.commit()
    db.refresh(key)
    return APIKeyResponse.model_validate(key)


def delete_api_key(db: Session, user: User, key_id: int) -> None:
    key = _api_key_query(db, user, key_id).first()
    if not key:
        raise _not_found("API key not found")

    db.delete(key)
    db.commit()


def get_usage_logs(db: Session, user: User, query: UsageQuery) -> list[UsageLogResponse]:
    db_query = db.query(UsageLog).filter(UsageLog.user_id == user.id)

    if query.start_date:
        db_query = db_query.filter(UsageLog.created_at >= query.start_date)
    if query.end_date:
        db_query = db_query.filter(UsageLog.created_at <= query.end_date)
    if query.endpoint:
        db_query = db_query.filter(UsageLog.endpoint == query.endpoint)

    logs = (
        db_query.order_by(UsageLog.created_at.desc())
        .offset(query.offset)
        .limit(query.limit)
        .all()
    )
    return [UsageLogResponse.model_validate(log) for log in logs]


def get_usage_stats(
    db: Session,
    user: User,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> UsageStatsResponse:
    start_date = start_date or (datetime.utcnow() - timedelta(days=30))
    end_date = end_date or datetime.utcnow()

    base_query = db.query(UsageLog).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date,
    )

    total_requests = base_query.count()
    successful_requests = base_query.filter(UsageLog.success == True).count()
    failed_requests = base_query.filter(UsageLog.success == False).count()
    total_files = base_query.filter(UsageLog.file_size.isnot(None)).count()

    total_bytes = db.query(func.sum(UsageLog.file_size)).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date,
        UsageLog.file_size.isnot(None),
    ).scalar() or 0
    total_tokens = db.query(func.sum(UsageLog.tokens_used)).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date,
    ).scalar() or 0
    total_cost = db.query(func.sum(UsageLog.cost)).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date,
    ).scalar() or 0

    endpoint_stats = db.query(UsageLog.endpoint, func.count(UsageLog.id)).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date,
    ).group_by(UsageLog.endpoint).all()
    endpoint_breakdown = {endpoint: count for endpoint, count in endpoint_stats}

    daily_stats = db.query(
        func.date(UsageLog.created_at).label("date"),
        func.count(UsageLog.id).label("requests"),
        func.sum(UsageLog.tokens_used).label("tokens"),
        func.sum(UsageLog.cost).label("cost"),
    ).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date,
    ).group_by(func.date(UsageLog.created_at)).order_by("date").all()
    daily_breakdown = [
        {
            "date": str(stat.date),
            "requests": stat.requests,
            "tokens": stat.tokens or 0,
            "cost": stat.cost or 0,
        }
        for stat in daily_stats
    ]

    return UsageStatsResponse(
        period_start=start_date,
        period_end=end_date,
        total_requests=total_requests,
        successful_requests=successful_requests,
        failed_requests=failed_requests,
        total_files_processed=total_files,
        total_bytes_processed=int(total_bytes),
        total_tokens_used=int(total_tokens),
        total_cost_cents=int(total_cost),
        endpoint_breakdown=endpoint_breakdown,
        daily_breakdown=daily_breakdown,
    )


def create_webhook(db: Session, user: User, payload: WebhookCreate) -> WebhookResponse:
    existing_count = db.query(Webhook).filter(Webhook.user_id == user.id).count()
    if existing_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 webhooks per user",
        )

    webhook = Webhook(
        user_id=user.id,
        url=payload.url,
        events=json.dumps(payload.events),
        secret=payload.secret,
        is_active=payload.is_active,
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return _webhook_response(webhook)


def list_webhooks(db: Session, user: User) -> WebhookList:
    webhooks = db.query(Webhook).filter(Webhook.user_id == user.id).all()
    responses = [_webhook_response(webhook) for webhook in webhooks]
    return WebhookList(webhooks=responses, total=len(responses))


def get_webhook(db: Session, user: User, webhook_id: int) -> WebhookResponse:
    webhook = _webhook_query(db, user, webhook_id).first()
    if not webhook:
        raise _not_found("Webhook not found")
    return _webhook_response(webhook)


def update_webhook(
    db: Session,
    user: User,
    webhook_id: int,
    payload: WebhookUpdate,
) -> WebhookResponse:
    webhook = _webhook_query(db, user, webhook_id).first()
    if not webhook:
        raise _not_found("Webhook not found")

    if payload.url is not None:
        webhook.url = payload.url
    if payload.events is not None:
        webhook.events = json.dumps(payload.events)
    if payload.secret is not None:
        webhook.secret = payload.secret
    if payload.is_active is not None:
        webhook.is_active = payload.is_active
    webhook.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(webhook)
    return _webhook_response(webhook)


def delete_webhook(db: Session, user: User, webhook_id: int) -> None:
    webhook = _webhook_query(db, user, webhook_id).first()
    if not webhook:
        raise _not_found("Webhook not found")

    db.delete(webhook)
    db.commit()


def _current_billing_period(now: datetime) -> tuple[datetime, datetime]:
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        return period_start, period_start.replace(year=now.year + 1, month=1)
    return period_start, period_start.replace(month=now.month + 1)


def get_billing_stats(db: Session, user: User) -> BillingStatsResponse:
    now = datetime.utcnow()
    period_start, period_end = _current_billing_period(now)

    tokens_used = db.query(func.sum(UsageLog.tokens_used)).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= period_start,
        UsageLog.created_at < period_end,
    ).scalar() or 0

    pricing = TokenPricing()
    tokens_included = pricing.enterprise_included_tokens
    tokens_overage = max(0, tokens_used - tokens_included)
    subscription_cost = 0
    overage_cost = (tokens_overage // 1000) * pricing.overage_price_per_1k_tokens
    total_cost = subscription_cost + overage_cost

    days_in_period = (period_end - period_start).days
    days_elapsed = (now - period_start).days + 1
    daily_rate = tokens_used / days_elapsed if days_elapsed > 0 else 0
    estimated_month_tokens = int(daily_rate * days_in_period)
    estimated_overage = max(0, estimated_month_tokens - tokens_included)
    estimated_next_bill = (estimated_overage // 1000) * pricing.overage_price_per_1k_tokens

    return BillingStatsResponse(
        current_period_start=period_start,
        current_period_end=period_end,
        tokens_used=int(tokens_used),
        tokens_included=tokens_included,
        tokens_overage=int(tokens_overage),
        subscription_cost=subscription_cost,
        overage_cost=int(overage_cost),
        total_cost=int(total_cost),
        next_billing_date=period_end,
        estimated_next_bill=int(estimated_next_bill),
    )


def get_dashboard_stats(db: Session, user: User) -> DashboardStats:
    total_keys = db.query(APIKey).filter(APIKey.user_id == user.id).count()
    active_keys = db.query(APIKey).filter(
        APIKey.user_id == user.id,
        APIKey.is_active == True,
    ).count()

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    usage_30d = db.query(UsageLog).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= thirty_days_ago,
    )
    total_requests_30d = usage_30d.count()
    total_files_30d = usage_30d.filter(UsageLog.file_size.isnot(None)).count()
    total_bytes_30d = db.query(func.sum(UsageLog.file_size)).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= thirty_days_ago,
        UsageLog.file_size.isnot(None),
    ).scalar() or 0

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_month_tokens = db.query(func.sum(UsageLog.tokens_used)).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= month_start,
    ).scalar() or 0
    current_month_cost = db.query(func.sum(UsageLog.cost)).filter(
        UsageLog.user_id == user.id,
        UsageLog.created_at >= month_start,
    ).scalar() or 0

    total_webhooks = db.query(Webhook).filter(Webhook.user_id == user.id).count()
    active_webhooks = db.query(Webhook).filter(
        Webhook.user_id == user.id,
        Webhook.is_active == True,
    ).count()

    last_log = db.query(UsageLog).filter(
        UsageLog.user_id == user.id,
    ).order_by(UsageLog.created_at.desc()).first()
    last_key = db.query(APIKey).filter(
        APIKey.user_id == user.id,
    ).order_by(APIKey.created_at.desc()).first()

    return DashboardStats(
        total_api_keys=total_keys,
        active_api_keys=active_keys,
        total_requests_30d=total_requests_30d,
        total_files_processed_30d=total_files_30d,
        total_bytes_processed_30d=int(total_bytes_30d),
        current_month_tokens=int(current_month_tokens),
        current_month_cost_cents=int(current_month_cost),
        total_webhooks=total_webhooks,
        active_webhooks=active_webhooks,
        rate_limit_hits_today=0,
        last_request_at=last_log.created_at if last_log else None,
        last_api_key_created_at=last_key.created_at if last_key else None,
    )
