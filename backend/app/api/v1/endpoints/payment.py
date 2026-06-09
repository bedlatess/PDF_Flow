"""
Stripe payment endpoints for subscription management
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, Header, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import stripe
import logging

from app.core.database import get_db
from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User, UserRole
from app.schemas.payment import (
    CheckoutSessionCreate,
    CheckoutSessionResponse,
    SubscriptionResponse,
    WebhookEvent
)
from app.services.email_service import email_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CheckoutSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    创建Stripe结账会话

    Args:
        payload: 包含price_id (monthly/yearly)
        current_user: 当前登录用户

    Returns:
        checkout_url: Stripe结账页面URL
    """
    try:
        # 检查Stripe配置
        if not settings.STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Stripe payment is not configured"
            )

        # 确定Price ID
        if payload.plan == "monthly":
            price_id = settings.STRIPE_PRICE_ID_MONTHLY
        elif payload.plan == "yearly":
            price_id = settings.STRIPE_PRICE_ID_YEARLY
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid plan. Must be 'monthly' or 'yearly'"
            )

        if not price_id:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Stripe price ID for {payload.plan} plan is not configured"
            )

        # 创建或获取Stripe Customer
        if current_user.stripe_customer_id:
            customer_id = current_user.stripe_customer_id
        else:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.full_name,
                metadata={
                    "user_id": str(current_user.id)
                }
            )
            current_user.stripe_customer_id = customer.id
            db.commit()
            customer_id = customer.id

        # 创建Checkout Session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=f"{payload.success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=payload.cancel_url,
            metadata={
                "user_id": str(current_user.id),
                "plan": payload.plan
            }
        )

        logger.info(f"Checkout session created for user {current_user.id}: {checkout_session.id}")

        return CheckoutSessionResponse(
            checkout_url=checkout_session.url,
            session_id=checkout_session.id
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create checkout session error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取用户当前订阅信息
    """
    if not current_user.subscription_id:
        return SubscriptionResponse(
            has_subscription=False,
            status=None,
            plan=None,
            current_period_end=None,
            cancel_at_period_end=False
        )

    try:
        subscription = stripe.Subscription.retrieve(current_user.subscription_id)

        return SubscriptionResponse(
            has_subscription=True,
            status=subscription.status,
            plan=subscription.items.data[0].price.id,
            current_period_end=datetime.fromtimestamp(subscription.current_period_end),
            cancel_at_period_end=subscription.cancel_at_period_end
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting subscription: {str(e)}")
        return SubscriptionResponse(
            has_subscription=False,
            status=None,
            plan=None,
            current_period_end=None,
            cancel_at_period_end=False
        )


@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    取消订阅（在当前周期结束时生效）
    """
    if not current_user.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )

    try:
        # 更新订阅为在周期结束时取消
        subscription = stripe.Subscription.modify(
            current_user.subscription_id,
            cancel_at_period_end=True
        )

        logger.info(f"Subscription cancelled for user {current_user.id}")

        return {
            "message": "Subscription will be cancelled at period end",
            "cancel_at": datetime.fromtimestamp(subscription.current_period_end).isoformat()
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error cancelling subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to cancel subscription: {str(e)}"
        )


@router.post("/reactivate-subscription")
async def reactivate_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    重新激活已取消的订阅
    """
    if not current_user.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No subscription found"
        )

    try:
        # 取消订阅的取消计划
        subscription = stripe.Subscription.modify(
            current_user.subscription_id,
            cancel_at_period_end=False
        )

        logger.info(f"Subscription reactivated for user {current_user.id}")

        return {
            "message": "Subscription reactivated successfully",
            "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat()
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error reactivating subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to reactivate subscription: {str(e)}"
        )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """
    处理Stripe Webhook事件

    重要事件：
    - checkout.session.completed: 结账完成
    - customer.subscription.created: 订阅创建
    - customer.subscription.updated: 订阅更新
    - customer.subscription.deleted: 订阅取消
    - invoice.payment_succeeded: 支付成功
    - invoice.payment_failed: 支付失败
    """
    payload = await request.body()

    # 验证webhook签名
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.warning("Stripe webhook secret not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook not configured"
        )

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid webhook signature: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    # 处理事件
    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Received Stripe webhook: {event_type}")

    try:
        if event_type == "checkout.session.completed":
            # 结账完成
            session = data
            user_id = int(session["metadata"]["user_id"])
            user = db.query(User).filter(User.id == user_id).first()

            if user:
                # 获取订阅信息
                subscription_id = session.get("subscription")
                if subscription_id:
                    subscription = stripe.Subscription.retrieve(subscription_id)
                    user.subscription_id = subscription_id
                    user.subscription_status = subscription.status
                    user.subscription_end_date = datetime.fromtimestamp(subscription.current_period_end)
                    user.role = UserRole.PRO
                    db.commit()
                    logger.info(f"User {user_id} upgraded to Pro")

                    # Send subscription confirmation email
                    plan = session["metadata"].get("plan", "monthly")
                    amount = 9.9 if plan == "monthly" else 79.0
                    background_tasks.add_task(
                        email_service.send_subscription_confirmation_email,
                        to=user.email,
                        username=user.full_name or user.email.split('@')[0],
                        plan="Pro",
                        amount=amount,
                        billing_period=plan
                    )

        elif event_type == "customer.subscription.updated":
            # 订阅更新
            subscription = data
            customer_id = subscription["customer"]
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

            if user:
                user.subscription_status = subscription["status"]
                user.subscription_end_date = datetime.fromtimestamp(subscription["current_period_end"])

                # 如果订阅取消，降级用户
                if subscription["status"] in ["canceled", "unpaid"]:
                    user.role = UserRole.FREE
                    user.subscription_id = None
                    logger.info(f"User {user.id} downgraded to Free")

                db.commit()

        elif event_type == "customer.subscription.deleted":
            # 订阅删除（取消）
            subscription = data
            customer_id = subscription["customer"]
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

            if user:
                user.role = UserRole.FREE
                user.subscription_id = None
                user.subscription_status = "canceled"
                db.commit()
                logger.info(f"User {user.id} subscription cancelled")

        elif event_type == "invoice.payment_succeeded":
            # 支付成功（续费）
            invoice = data
            customer_id = invoice["customer"]
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

            if user and invoice.get("subscription"):
                subscription = stripe.Subscription.retrieve(invoice["subscription"])
                user.subscription_end_date = datetime.fromtimestamp(subscription["current_period_end"])
                db.commit()
                logger.info(f"User {user.id} payment succeeded")

        elif event_type == "invoice.payment_failed":
            # 支付失败
            invoice = data
            customer_id = invoice["customer"]
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

            if user:
                user.subscription_status = "past_due"
                db.commit()
                logger.warning(f"User {user.id} payment failed")

        return {"status": "success"}

    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )
