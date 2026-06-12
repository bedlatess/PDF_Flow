"""Enterprise API endpoints."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.domains.enterprise import service as enterprise_service
from app.models.user import User, UserRole
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

router = APIRouter(prefix="/enterprise", tags=["enterprise"])


async def require_enterprise_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure user has Enterprise role."""
    if current_user.role != UserRole.ENTERPRISE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Enterprise subscription required",
        )
    return current_user


@router.post("/api-keys", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Create a new API key for Enterprise user."""
    return enterprise_service.create_api_key(db, current_user, key_data)


@router.get("/api-keys", response_model=APIKeyList)
async def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """List all API keys for current user."""
    return enterprise_service.list_api_keys(db, current_user)


@router.get("/api-keys/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Get specific API key details."""
    return enterprise_service.get_api_key(db, current_user, key_id)


@router.patch("/api-keys/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: int,
    key_update: APIKeyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Update API key settings."""
    return enterprise_service.update_api_key(db, current_user, key_id, key_update)


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Delete an API key."""
    enterprise_service.delete_api_key(db, current_user, key_id)
    return None


@router.get("/usage/logs", response_model=List[UsageLogResponse])
async def get_usage_logs(
    query: UsageQuery = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Get detailed usage logs."""
    return enterprise_service.get_usage_logs(db, current_user, query)


@router.get("/usage/stats", response_model=UsageStatsResponse)
async def get_usage_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Get aggregated usage statistics."""
    return enterprise_service.get_usage_stats(db, current_user, start_date, end_date)


@router.post("/webhooks", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    webhook_data: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Create a new webhook configuration."""
    return enterprise_service.create_webhook(db, current_user, webhook_data)


@router.get("/webhooks", response_model=WebhookList)
async def list_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """List all webhooks for current user."""
    return enterprise_service.list_webhooks(db, current_user)


@router.get("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Get specific webhook details."""
    return enterprise_service.get_webhook(db, current_user, webhook_id)


@router.patch("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: int,
    webhook_update: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Update webhook configuration."""
    return enterprise_service.update_webhook(db, current_user, webhook_id, webhook_update)


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Delete a webhook."""
    enterprise_service.delete_webhook(db, current_user, webhook_id)
    return None


@router.get("/billing/stats", response_model=BillingStatsResponse)
async def get_billing_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Get billing statistics for current billing period."""
    return enterprise_service.get_billing_stats(db, current_user)


@router.get("/billing/pricing", response_model=TokenPricing)
async def get_pricing():
    """Get token pricing information."""
    return TokenPricing()


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_enterprise_user),
):
    """Get enterprise dashboard overview statistics."""
    return enterprise_service.get_dashboard_stats(db, current_user)
