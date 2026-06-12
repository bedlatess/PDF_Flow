"""
Pydantic schemas for Enterprise API
API Key management, usage tracking, webhooks
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================================
# API Key Schemas
# ============================================================================

class APIKeyCreate(BaseModel):
    """Request to create a new API key"""
    name: str = Field(..., min_length=1, max_length=100, description="Human-readable name for the API key")
    rate_limit: Optional[int] = Field(-1, description="Requests per hour (-1 for unlimited)")
    expires_in_days: Optional[int] = Field(None, description="Number of days until expiration (None for never)")


class APIKeyResponse(BaseModel):
    """API Key response (includes plain key only on creation)"""
    id: int
    name: str
    key_prefix: str
    is_active: bool
    rate_limit: int
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime

    # Only returned on creation
    api_key: Optional[str] = Field(None, description="Full API key (only shown once)")

    model_config = ConfigDict(from_attributes=True)


class APIKeyUpdate(BaseModel):
    """Update API key settings"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    rate_limit: Optional[int] = None


class APIKeyList(BaseModel):
    """List of API keys"""
    keys: List[APIKeyResponse]
    total: int


# ============================================================================
# Usage Tracking Schemas
# ============================================================================

class UsageLogResponse(BaseModel):
    """Single usage log entry"""
    id: int
    endpoint: str
    method: str
    file_type: Optional[str]
    file_size: Optional[int]
    processing_time: Optional[int]
    success: bool
    error_message: Optional[str]
    tokens_used: int
    cost: int
    ip_address: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UsageStatsResponse(BaseModel):
    """Aggregated usage statistics"""
    # Time period
    period_start: datetime
    period_end: datetime

    # Request stats
    total_requests: int
    successful_requests: int
    failed_requests: int

    # File stats
    total_files_processed: int
    total_bytes_processed: int

    # Cost stats (Enterprise)
    total_tokens_used: int
    total_cost_cents: int

    # Breakdown by endpoint
    endpoint_breakdown: Dict[str, int] = Field(default_factory=dict)

    # Breakdown by day (for charting)
    daily_breakdown: List[Dict[str, Any]] = Field(default_factory=list)


class UsageQuery(BaseModel):
    """Query parameters for usage stats"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    endpoint: Optional[str] = None
    limit: int = Field(100, ge=1, le=1000)
    offset: int = Field(0, ge=0)


# ============================================================================
# Webhook Schemas
# ============================================================================

class WebhookEventType(str):
    """Supported webhook event types"""
    JOB_COMPLETED = "job.completed"
    JOB_FAILED = "job.failed"
    RATE_LIMIT_EXCEEDED = "rate_limit.exceeded"
    QUOTA_WARNING = "quota.warning"
    QUOTA_EXCEEDED = "quota.exceeded"


class WebhookCreate(BaseModel):
    """Request to create a webhook"""
    url: str = Field(..., min_length=1, max_length=500, description="Webhook endpoint URL")
    events: List[str] = Field(..., min_length=1, description="Event types to subscribe to")
    secret: Optional[str] = Field(None, max_length=100, description="Optional secret for signature verification")
    is_active: bool = Field(True, description="Whether webhook is active")

    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        """Ensure URL is HTTPS in production"""
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v

    @field_validator('events')
    @classmethod
    def validate_events(cls, v):
        """Validate event types"""
        valid_events = [
            WebhookEventType.JOB_COMPLETED,
            WebhookEventType.JOB_FAILED,
            WebhookEventType.RATE_LIMIT_EXCEEDED,
            WebhookEventType.QUOTA_WARNING,
            WebhookEventType.QUOTA_EXCEEDED,
        ]
        for event in v:
            if event not in valid_events:
                raise ValueError(f'Invalid event type: {event}. Valid types: {valid_events}')
        return v


class WebhookUpdate(BaseModel):
    """Update webhook settings"""
    url: Optional[str] = Field(None, min_length=1, max_length=500)
    events: Optional[List[str]] = Field(None, min_length=1)
    secret: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        if v and not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


class WebhookResponse(BaseModel):
    """Webhook configuration response"""
    id: int
    url: str
    events: List[str]
    is_active: bool
    last_triggered_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Success/failure stats
    total_deliveries: int = 0
    successful_deliveries: int = 0
    failed_deliveries: int = 0

    model_config = ConfigDict(from_attributes=True)


class WebhookList(BaseModel):
    """List of webhooks"""
    webhooks: List[WebhookResponse]
    total: int


class WebhookPayload(BaseModel):
    """Webhook event payload sent to client"""
    event_type: str
    event_id: str
    timestamp: datetime
    data: Dict[str, Any]

    # Signature for verification (HMAC-SHA256)
    signature: Optional[str] = None


# ============================================================================
# Billing Schemas (Enterprise)
# ============================================================================

class BillingStatsResponse(BaseModel):
    """Billing statistics for Enterprise users"""
    current_period_start: datetime
    current_period_end: datetime

    # Token usage
    tokens_used: int
    tokens_included: int  # In subscription
    tokens_overage: int  # Beyond included

    # Costs (in cents)
    subscription_cost: int
    overage_cost: int
    total_cost: int

    # Next billing
    next_billing_date: datetime
    estimated_next_bill: int


class TokenPricing(BaseModel):
    """Token pricing configuration"""
    free_tier_tokens: int = 0  # Free tier gets 0 API tokens
    pro_tier_tokens: int = 0  # Pro tier gets 0 API tokens (API is Enterprise only)
    enterprise_included_tokens: int = 100000  # 100k tokens included
    overage_price_per_1k_tokens: int = 10  # $0.10 per 1k tokens (10 cents)


# ============================================================================
# Dashboard Stats
# ============================================================================

class DashboardStats(BaseModel):
    """Enterprise dashboard overview statistics"""
    # API Keys
    total_api_keys: int
    active_api_keys: int

    # Usage (last 30 days)
    total_requests_30d: int
    total_files_processed_30d: int
    total_bytes_processed_30d: int

    # Current month costs
    current_month_tokens: int
    current_month_cost_cents: int

    # Webhooks
    total_webhooks: int
    active_webhooks: int

    # Rate limiting
    rate_limit_hits_today: int

    # Recent activity
    last_request_at: Optional[datetime]
    last_api_key_created_at: Optional[datetime]
