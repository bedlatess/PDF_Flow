"""
Pydantic schemas for payment and subscription
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CheckoutSessionCreate(BaseModel):
    """创建结账会话的请求"""
    plan: str = Field(..., description="订阅计划: monthly 或 yearly")
    success_url: str = Field(..., description="支付成功后的回调URL")
    cancel_url: str = Field(..., description="取消支付后的回调URL")


class CheckoutSessionResponse(BaseModel):
    """结账会话响应"""
    checkout_url: str = Field(..., description="Stripe结账页面URL")
    session_id: str = Field(..., description="会话ID")


class SubscriptionResponse(BaseModel):
    """订阅信息响应"""
    has_subscription: bool
    status: Optional[str] = None  # active, past_due, canceled, etc.
    plan: Optional[str] = None  # price_id
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False


class WebhookEvent(BaseModel):
    """Stripe Webhook事件"""
    type: str
    data: dict
