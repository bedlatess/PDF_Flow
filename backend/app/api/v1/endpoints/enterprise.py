"""
Enterprise API endpoints
API Key management, usage tracking, webhooks, billing
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.core.database import get_db
from app.core.security import generate_api_key, hash_api_key
from app.models.user import User, APIKey, UsageLog, Webhook, UserRole
from app.schemas.enterprise import (
    APIKeyCreate, APIKeyResponse, APIKeyUpdate, APIKeyList,
    UsageLogResponse, UsageStatsResponse, UsageQuery,
    WebhookCreate, WebhookUpdate, WebhookResponse, WebhookList,
    BillingStatsResponse, TokenPricing, DashboardStats
)
from app.api.v1.endpoints.auth import get_current_user
import json

router = APIRouter(prefix="/enterprise", tags=["enterprise"])


# ============================================================================
# Dependency: Require Enterprise User
# ============================================================================

async def require_enterprise_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user has Enterprise role"""
    if current_user.role != UserRole.ENTERPRISE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Enterprise subscription required"
        )
    return current_user


# ============================================================================
# API Key Management
# ============================================================================

@router.post("/api-keys", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """
    Create a new API key for Enterprise user

    **Security**: API key is only shown once on creation
    """
    # Generate API key
    plain_key = generate_api_key()
    key_hash = hash_api_key(plain_key)
    key_prefix = plain_key[:12]  # pdf_xxxxxxxx

    # Calculate expiration
    expires_at = None
    if key_data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=key_data.expires_in_days)

    # Create database record
    db_key = APIKey(
        user_id=current_user.id,
        name=key_data.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        rate_limit=key_data.rate_limit,
        expires_at=expires_at
    )

    db.add(db_key)
    db.commit()
    db.refresh(db_key)

    # Return with plain key (only time it's shown)
    response = APIKeyResponse.from_orm(db_key)
    response.api_key = plain_key

    return response


@router.get("/api-keys", response_model=APIKeyList)
async def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """List all API keys for current user"""
    keys = db.query(APIKey).filter(APIKey.user_id == current_user.id).all()

    return APIKeyList(
        keys=[APIKeyResponse.from_orm(k) for k in keys],
        total=len(keys)
    )


@router.get("/api-keys/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Get specific API key details"""
    key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == current_user.id
    ).first()

    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    return APIKeyResponse.from_orm(key)


@router.patch("/api-keys/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: int,
    key_update: APIKeyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Update API key settings (name, active status, rate limit)"""
    key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == current_user.id
    ).first()

    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    # Update fields
    if key_update.name is not None:
        key.name = key_update.name
    if key_update.is_active is not None:
        key.is_active = key_update.is_active
    if key_update.rate_limit is not None:
        key.rate_limit = key_update.rate_limit

    db.commit()
    db.refresh(key)

    return APIKeyResponse.from_orm(key)


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Delete an API key"""
    key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == current_user.id
    ).first()

    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    db.delete(key)
    db.commit()


# ============================================================================
# Usage Tracking & Statistics
# ============================================================================

@router.get("/usage/logs", response_model=List[UsageLogResponse])
async def get_usage_logs(
    query: UsageQuery = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Get detailed usage logs"""
    q = db.query(UsageLog).filter(UsageLog.user_id == current_user.id)

    # Apply filters
    if query.start_date:
        q = q.filter(UsageLog.created_at >= query.start_date)
    if query.end_date:
        q = q.filter(UsageLog.created_at <= query.end_date)
    if query.endpoint:
        q = q.filter(UsageLog.endpoint == query.endpoint)

    # Order and paginate
    logs = q.order_by(UsageLog.created_at.desc()).offset(query.offset).limit(query.limit).all()

    return [UsageLogResponse.from_orm(log) for log in logs]


@router.get("/usage/stats", response_model=UsageStatsResponse)
async def get_usage_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Get aggregated usage statistics"""
    # Default to last 30 days
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    # Base query
    base_query = db.query(UsageLog).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date
    )

    # Aggregate stats
    total_requests = base_query.count()
    successful_requests = base_query.filter(UsageLog.success == True).count()
    failed_requests = base_query.filter(UsageLog.success == False).count()

    total_files = base_query.filter(UsageLog.file_size.isnot(None)).count()
    total_bytes = db.query(func.sum(UsageLog.file_size)).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date,
        UsageLog.file_size.isnot(None)
    ).scalar() or 0

    total_tokens = db.query(func.sum(UsageLog.tokens_used)).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date
    ).scalar() or 0

    total_cost = db.query(func.sum(UsageLog.cost)).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date
    ).scalar() or 0

    # Endpoint breakdown
    endpoint_stats = db.query(
        UsageLog.endpoint,
        func.count(UsageLog.id)
    ).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date
    ).group_by(UsageLog.endpoint).all()

    endpoint_breakdown = {endpoint: count for endpoint, count in endpoint_stats}

    # Daily breakdown (for charts)
    daily_stats = db.query(
        func.date(UsageLog.created_at).label('date'),
        func.count(UsageLog.id).label('requests'),
        func.sum(UsageLog.tokens_used).label('tokens'),
        func.sum(UsageLog.cost).label('cost')
    ).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= start_date,
        UsageLog.created_at <= end_date
    ).group_by(func.date(UsageLog.created_at)).order_by('date').all()

    daily_breakdown = [
        {
            'date': str(stat.date),
            'requests': stat.requests,
            'tokens': stat.tokens or 0,
            'cost': stat.cost or 0
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
        daily_breakdown=daily_breakdown
    )


# ============================================================================
# Webhook Management
# ============================================================================

@router.post("/webhooks", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    webhook_data: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Create a new webhook configuration"""
    # Check if webhook limit reached (max 5 per user)
    existing_count = db.query(Webhook).filter(Webhook.user_id == current_user.id).count()
    if existing_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 webhooks per user"
        )

    # Create webhook
    webhook = Webhook(
        user_id=current_user.id,
        url=webhook_data.url,
        events=json.dumps(webhook_data.events),
        secret=webhook_data.secret,
        is_active=webhook_data.is_active
    )

    db.add(webhook)
    db.commit()
    db.refresh(webhook)

    # Parse events back for response
    response = WebhookResponse.from_orm(webhook)
    response.events = json.loads(webhook.events)

    return response


@router.get("/webhooks", response_model=WebhookList)
async def list_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """List all webhooks for current user"""
    webhooks = db.query(Webhook).filter(Webhook.user_id == current_user.id).all()

    webhook_responses = []
    for wh in webhooks:
        response = WebhookResponse.from_orm(wh)
        response.events = json.loads(wh.events)
        webhook_responses.append(response)

    return WebhookList(
        webhooks=webhook_responses,
        total=len(webhooks)
    )


@router.get("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Get specific webhook details"""
    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.user_id == current_user.id
    ).first()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    response = WebhookResponse.from_orm(webhook)
    response.events = json.loads(webhook.events)

    return response


@router.patch("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: int,
    webhook_update: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Update webhook configuration"""
    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.user_id == current_user.id
    ).first()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    # Update fields
    if webhook_update.url is not None:
        webhook.url = webhook_update.url
    if webhook_update.events is not None:
        webhook.events = json.dumps(webhook_update.events)
    if webhook_update.secret is not None:
        webhook.secret = webhook_update.secret
    if webhook_update.is_active is not None:
        webhook.is_active = webhook_update.is_active

    webhook.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(webhook)

    response = WebhookResponse.from_orm(webhook)
    response.events = json.loads(webhook.events)

    return response


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Delete a webhook"""
    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.user_id == current_user.id
    ).first()

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )

    db.delete(webhook)
    db.commit()


# ============================================================================
# Billing & Pricing
# ============================================================================

@router.get("/billing/stats", response_model=BillingStatsResponse)
async def get_billing_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Get billing statistics for current billing period"""
    # Current billing period (monthly)
    now = datetime.utcnow()
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Next month
    if now.month == 12:
        next_month = period_start.replace(year=now.year + 1, month=1)
    else:
        next_month = period_start.replace(month=now.month + 1)

    period_end = next_month

    # Get token usage for current period
    tokens_used = db.query(func.sum(UsageLog.tokens_used)).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= period_start,
        UsageLog.created_at < period_end
    ).scalar() or 0

    # Token pricing
    pricing = TokenPricing()
    tokens_included = pricing.enterprise_included_tokens
    tokens_overage = max(0, tokens_used - tokens_included)

    # Calculate costs (in cents)
    subscription_cost = 0  # Enterprise pricing handled by sales
    overage_cost = (tokens_overage // 1000) * pricing.overage_price_per_1k_tokens
    total_cost = subscription_cost + overage_cost

    # Estimate next bill (based on current usage rate)
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
        estimated_next_bill=int(estimated_next_bill)
    )


@router.get("/billing/pricing", response_model=TokenPricing)
async def get_pricing():
    """Get token pricing information"""
    return TokenPricing()


# ============================================================================
# Dashboard Overview
# ============================================================================

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user)
):
    """Get enterprise dashboard overview statistics"""
    # API Keys
    total_keys = db.query(APIKey).filter(APIKey.user_id == current_user.id).count()
    active_keys = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.is_active == True
    ).count()

    # Usage last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    usage_30d = db.query(UsageLog).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= thirty_days_ago
    )

    total_requests_30d = usage_30d.count()
    total_files_30d = usage_30d.filter(UsageLog.file_size.isnot(None)).count()
    total_bytes_30d = db.query(func.sum(UsageLog.file_size)).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= thirty_days_ago,
        UsageLog.file_size.isnot(None)
    ).scalar() or 0

    # Current month costs
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    current_month_tokens = db.query(func.sum(UsageLog.tokens_used)).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= month_start
    ).scalar() or 0

    current_month_cost = db.query(func.sum(UsageLog.cost)).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= month_start
    ).scalar() or 0

    # Webhooks
    total_webhooks = db.query(Webhook).filter(Webhook.user_id == current_user.id).count()
    active_webhooks = db.query(Webhook).filter(
        Webhook.user_id == current_user.id,
        Webhook.is_active == True
    ).count()

    # Rate limiting hits (placeholder - would need separate tracking)
    rate_limit_hits_today = 0

    # Recent activity
    last_log = db.query(UsageLog).filter(
        UsageLog.user_id == current_user.id
    ).order_by(UsageLog.created_at.desc()).first()

    last_key = db.query(APIKey).filter(
        APIKey.user_id == current_user.id
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
        rate_limit_hits_today=rate_limit_hits_today,
        last_request_at=last_log.created_at if last_log else None,
        last_api_key_created_at=last_key.created_at if last_key else None
    )
