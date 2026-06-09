"""
Celery tasks for automated email sending
Handles churn prevention and scheduled email campaigns
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from celery import shared_task
import logging

from app.core.database import SessionLocal
from app.models.user import User
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


@shared_task(name="send_churn_prevention_emails")
def send_churn_prevention_emails():
    """
    Send churn prevention emails to inactive users

    Runs daily to find users who haven't logged in for:
    - 7 days (first reminder)
    - 30 days (second reminder)
    - 90 days (final reminder)

    Returns:
        dict: Summary of emails sent
    """
    db = SessionLocal()

    try:
        now = datetime.utcnow()
        emails_sent = {
            "7_days": 0,
            "30_days": 0,
            "90_days": 0,
            "errors": 0
        }

        # Define inactivity thresholds
        thresholds = [
            (7, "7_days"),
            (30, "30_days"),
            (90, "90_days")
        ]

        for days, key in thresholds:
            # Calculate date range (target users inactive for exactly this many days)
            # This prevents sending duplicate emails
            target_date_start = now - timedelta(days=days, hours=1)
            target_date_end = now - timedelta(days=days)

            # Find users inactive for this period
            inactive_users = db.query(User).filter(
                User.is_active == True,
                User.last_login_at >= target_date_start,
                User.last_login_at < target_date_end,
                User.email.isnot(None)
            ).all()

            logger.info(f"Found {len(inactive_users)} users inactive for ~{days} days")

            # Send churn prevention emails
            for user in inactive_users:
                try:
                    success = email_service.send_churn_prevention_email(
                        to=user.email,
                        username=user.full_name or user.email.split('@')[0],
                        days_inactive=days
                    )

                    if success:
                        emails_sent[key] += 1
                        logger.info(f"Churn email sent to {user.email} ({days} days inactive)")
                    else:
                        emails_sent["errors"] += 1

                except Exception as e:
                    logger.error(f"Error sending churn email to {user.email}: {str(e)}")
                    emails_sent["errors"] += 1

        logger.info(f"Churn prevention emails sent: {emails_sent}")
        return emails_sent

    except Exception as e:
        logger.error(f"Error in send_churn_prevention_emails task: {str(e)}")
        raise
    finally:
        db.close()


@shared_task(name="send_subscription_expiry_reminders")
def send_subscription_expiry_reminders():
    """
    Send reminders to users whose subscriptions are expiring soon

    Sends emails 7 days before subscription ends

    Returns:
        dict: Summary of emails sent
    """
    db = SessionLocal()

    try:
        now = datetime.utcnow()
        reminder_date = now + timedelta(days=7)
        emails_sent = 0

        # Find users with subscriptions expiring in 7 days
        expiring_users = db.query(User).filter(
            User.subscription_end_date >= now,
            User.subscription_end_date <= reminder_date,
            User.subscription_status.in_(["active", "trialing"]),
            User.email.isnot(None)
        ).all()

        logger.info(f"Found {len(expiring_users)} users with expiring subscriptions")

        for user in expiring_users:
            try:
                # TODO: Implement subscription expiry email template
                # For now, just log
                logger.info(f"Would send expiry reminder to {user.email}")
                emails_sent += 1

            except Exception as e:
                logger.error(f"Error sending expiry reminder to {user.email}: {str(e)}")

        logger.info(f"Subscription expiry reminders sent: {emails_sent}")
        return {"emails_sent": emails_sent}

    except Exception as e:
        logger.error(f"Error in send_subscription_expiry_reminders task: {str(e)}")
        raise
    finally:
        db.close()


@shared_task(name="send_weekly_digest")
def send_weekly_digest():
    """
    Send weekly digest emails to active users

    Includes:
    - Usage statistics for the week
    - New features
    - Tips and tricks

    Returns:
        dict: Summary of emails sent
    """
    db = SessionLocal()

    try:
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        emails_sent = 0

        # Find active users (logged in within last 30 days)
        active_users = db.query(User).filter(
            User.is_active == True,
            User.last_login_at >= now - timedelta(days=30),
            User.email.isnot(None)
        ).all()

        logger.info(f"Found {len(active_users)} active users for weekly digest")

        for user in active_users:
            try:
                # TODO: Implement weekly digest email template
                # For now, just log
                logger.info(f"Would send weekly digest to {user.email}")
                emails_sent += 1

            except Exception as e:
                logger.error(f"Error sending weekly digest to {user.email}: {str(e)}")

        logger.info(f"Weekly digests sent: {emails_sent}")
        return {"emails_sent": emails_sent}

    except Exception as e:
        logger.error(f"Error in send_weekly_digest task: {str(e)}")
        raise
    finally:
        db.close()
