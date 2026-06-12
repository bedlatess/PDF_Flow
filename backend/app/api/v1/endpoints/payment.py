"""Provider-agnostic payment endpoints."""

from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.domains.payment import PaymentService
from app.models.user import User
from app.schemas.payment import (
    CheckoutSessionCreate,
    CheckoutSessionResponse,
    PaymentCaptureResponse,
    PaymentProviderList,
    SubscriptionResponse,
)

router = APIRouter()


def _checkout_response(order) -> CheckoutSessionResponse:
    return CheckoutSessionResponse(
        checkout_url=order.checkout_url or "",
        session_id=order.merchant_order_id,
        provider=order.provider,
        order_id=str(order.id),
        merchant_order_id=order.merchant_order_id,
        qr_code_url=order.qr_code_url,
        expires_at=order.expires_at,
    )


@router.get("/providers", response_model=PaymentProviderList)
async def list_payment_providers(db: Session = Depends(get_db)):
    """List configured payment providers for frontend checkout selection."""
    service = PaymentService(db)
    return PaymentProviderList(
        providers=[asdict(provider) for provider in service.list_providers()]
    )


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CheckoutSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a checkout order through the selected provider.

    The route name is kept for frontend compatibility, but the implementation
    now creates a provider-agnostic payment order rather than embedding Stripe
    logic directly in the controller.
    """
    service = PaymentService(db)
    order = service.create_checkout_order(
        user=current_user,
        provider=payload.provider,
        plan=payload.plan,
        success_url=payload.success_url,
        cancel_url=payload.cancel_url,
    )
    return _checkout_response(order)


@router.post("/orders/{merchant_order_id}/capture", response_model=PaymentCaptureResponse)
async def capture_checkout_order(
    merchant_order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Capture a provider order after the user returns from an approval flow."""
    service = PaymentService(db)
    order = service.capture_checkout_order(user=current_user, merchant_order_id=merchant_order_id)
    db.refresh(current_user)
    return PaymentCaptureResponse(
        provider=order.provider,
        order_id=str(order.id),
        merchant_order_id=order.merchant_order_id,
        status=order.status,
        current_period_end=current_user.subscription_end_date,
    )


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return locally trusted subscription state.

    External provider reconciliation belongs in provider adapters/webhooks; this
    read path should be fast and should not call payment networks.
    """
    return SubscriptionResponse(
        has_subscription=bool(
            current_user.subscription_id and current_user.subscription_status == "active"
        ),
        status=current_user.subscription_status,
        plan=current_user.subscription_id,
        current_period_end=current_user.subscription_end_date,
        cancel_at_period_end=False,
    )


@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark the local subscription as canceling at period end.

    Provider-specific recurring billing cancellation will be implemented in
    adapters that support real subscriptions. One-time providers simply let the
    current entitlement expire.
    """
    if not current_user.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found",
        )

    current_user.subscription_status = "cancel_at_period_end"
    db.commit()
    return {
        "message": "Subscription will not renew automatically",
        "cancel_at": (
            current_user.subscription_end_date.isoformat()
            if current_user.subscription_end_date
            else ""
        ),
    }


@router.post("/reactivate-subscription")
async def reactivate_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reactivate the local subscription entitlement when still in period."""
    if not current_user.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No subscription found",
        )

    current_user.subscription_status = "active"
    db.commit()
    return {"message": "Subscription reactivated successfully"}


@router.post("/webhooks/{provider}")
async def payment_provider_webhook(
    provider: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Receive provider webhook notifications through provider adapters."""
    body = await request.body()
    service = PaymentService(db)
    order = service.verify_and_apply_webhook(
        provider=provider,
        headers=request.headers,
        body=body,
        query=request.query_params,
    )
    return {"status": "success", "merchant_order_id": order.merchant_order_id}


@router.post("/webhook")
async def legacy_payment_webhook(request: Request, db: Session = Depends(get_db)):
    """Legacy Stripe webhook path kept as an explicit compatibility shell."""
    return await payment_provider_webhook("stripe", request, db)
