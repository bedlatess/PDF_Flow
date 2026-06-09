"""
Webhook delivery service
Handles sending webhook events to configured endpoints
"""
import json
import hmac
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Any, List
import httpx
from sqlalchemy.orm import Session

from app.models.user import Webhook, User
from app.schemas.enterprise import WebhookPayload


async def trigger_webhook(
    db: Session,
    user_id: int,
    event_type: str,
    event_data: Dict[str, Any]
):
    """
    Trigger webhooks for a specific event type

    Args:
        db: Database session
        user_id: User ID to send webhooks for
        event_type: Type of event (e.g., "job.completed")
        event_data: Event payload data
    """
    # Get all active webhooks for this user that subscribe to this event
    webhooks = db.query(Webhook).filter(
        Webhook.user_id == user_id,
        Webhook.is_active == True
    ).all()

    for webhook in webhooks:
        # Parse subscribed events
        subscribed_events = json.loads(webhook.events)

        # Check if webhook subscribes to this event
        if event_type not in subscribed_events:
            continue

        # Send webhook
        await send_webhook(db, webhook, event_type, event_data)


async def send_webhook(
    db: Session,
    webhook: Webhook,
    event_type: str,
    event_data: Dict[str, Any]
):
    """
    Send a single webhook request

    Args:
        db: Database session
        webhook: Webhook model instance
        event_type: Event type
        event_data: Event payload
    """
    # Create payload
    event_id = str(uuid.uuid4())
    timestamp = datetime.utcnow()

    payload = WebhookPayload(
        event_type=event_type,
        event_id=event_id,
        timestamp=timestamp,
        data=event_data
    )

    # Generate signature if secret is configured
    if webhook.secret:
        payload_json = payload.model_dump_json()
        signature = generate_webhook_signature(payload_json, webhook.secret)
        payload.signature = signature

    # Send HTTP request
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                webhook.url,
                json=payload.model_dump(),
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": payload.signature if payload.signature else "",
                    "X-Event-Type": event_type,
                    "X-Event-ID": event_id
                }
            )

            # Update webhook stats
            webhook.total_deliveries += 1
            webhook.last_triggered_at = timestamp

            if response.status_code in [200, 201, 202, 204]:
                webhook.successful_deliveries += 1
            else:
                webhook.failed_deliveries += 1

            db.commit()

    except Exception as e:
        # Update failure stats
        webhook.total_deliveries += 1
        webhook.failed_deliveries += 1
        webhook.last_triggered_at = timestamp
        db.commit()

        # Log error (could send to monitoring service)
        print(f"Webhook delivery failed: {webhook.url} - {str(e)}")


def generate_webhook_signature(payload: str, secret: str) -> str:
    """
    Generate HMAC-SHA256 signature for webhook payload

    Args:
        payload: JSON payload as string
        secret: Webhook secret

    Returns:
        Hex-encoded signature
    """
    signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return signature


def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    """
    Verify webhook signature (for clients receiving webhooks)

    Args:
        payload: JSON payload as string
        signature: Signature from X-Webhook-Signature header
        secret: Webhook secret

    Returns:
        True if signature is valid
    """
    expected_signature = generate_webhook_signature(payload, secret)
    return hmac.compare_digest(signature, expected_signature)


# ============================================================================
# Event Type Helpers
# ============================================================================

async def notify_job_completed(db: Session, user_id: int, job_data: Dict[str, Any]):
    """Notify job completion via webhook"""
    await trigger_webhook(db, user_id, "job.completed", job_data)


async def notify_job_failed(db: Session, user_id: int, job_data: Dict[str, Any]):
    """Notify job failure via webhook"""
    await trigger_webhook(db, user_id, "job.failed", job_data)


async def notify_rate_limit_exceeded(db: Session, user_id: int, limit_data: Dict[str, Any]):
    """Notify rate limit exceeded via webhook"""
    await trigger_webhook(db, user_id, "rate_limit.exceeded", limit_data)


async def notify_quota_warning(db: Session, user_id: int, quota_data: Dict[str, Any]):
    """Notify quota warning (e.g., 80% usage) via webhook"""
    await trigger_webhook(db, user_id, "quota.warning", quota_data)


async def notify_quota_exceeded(db: Session, user_id: int, quota_data: Dict[str, Any]):
    """Notify quota exceeded via webhook"""
    await trigger_webhook(db, user_id, "quota.exceeded", quota_data)
