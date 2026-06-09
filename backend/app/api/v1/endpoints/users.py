"""
User management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, UsageStats
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/me/stats", response_model=UsageStats)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's usage statistics
    """
    from sqlalchemy import func
    from datetime import datetime, timedelta
    from app.models.user import UsageLog

    # Get total requests
    total_requests = db.query(func.count(UsageLog.id)).filter(
        UsageLog.user_id == current_user.id
    ).scalar() or 0

    # Get requests today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    requests_today = db.query(func.count(UsageLog.id)).filter(
        UsageLog.user_id == current_user.id,
        UsageLog.created_at >= today_start
    ).scalar() or 0

    # Calculate quota
    from app.core.config import settings
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value == "free":
        quota_limit = settings.RATE_LIMIT_FREE
        quota_remaining = max(0, quota_limit - requests_today)
    else:
        quota_limit = -1  # Unlimited
        quota_remaining = -1

    return {
        "total_requests": total_requests,
        "requests_today": requests_today,
        "storage_used": 0,  # TODO: Calculate actual storage
        "quota_remaining": quota_remaining,
        "quota_limit": quota_limit,
        "role": role_value
    }


@router.patch("/me", response_model=UserResponse)
async def update_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user information
    """
    from app.core.security import get_password_hash

    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name

    if user_update.password is not None:
        current_user.hashed_password = get_password_hash(user_update.password)

    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete current user account
    I (Information Disclosure): GDPR compliance - user can delete their data
    """
    db.delete(current_user)
    db.commit()

    return None
