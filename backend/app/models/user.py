"""
Database models for PDF-Flow
Following v4.0 specification: User authentication, API keys, usage tracking
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Index
from sqlalchemy.orm import relationship, declarative_base
import enum

Base = declarative_base()


class UserRole(str, enum.Enum):
    """User roles"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    ADMIN = "admin"


class User(Base):
    """
    User model
    Implements S (Spoofing) defense: JWT authentication
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.FREE, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # OAuth fields
    oauth_provider = Column(String, nullable=True)  # google, github
    oauth_id = Column(String, nullable=True)

    # Subscription
    stripe_customer_id = Column(String, nullable=True)
    subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    usage_logs = relationship("UsageLog", back_populates="user", cascade="all, delete-orphan")

    # Indexes for performance
    __table_args__ = (
        Index('idx_email', 'email'),
        Index('idx_oauth', 'oauth_provider', 'oauth_id'),
        Index('idx_stripe_customer', 'stripe_customer_id'),
    )


class APIKey(Base):
    """
    API Key model for Enterprise users
    S (Spoofing): API Keys stored as SHA-256 hashes only
    """
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)  # User-defined name for the key
    key_hash = Column(String, unique=True, nullable=False)  # SHA-256 hash
    key_prefix = Column(String, nullable=False)  # First 8 chars for identification (pdf_xxxxxxxx)

    is_active = Column(Boolean, default=True, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    # Rate limiting
    rate_limit = Column(Integer, default=-1, nullable=False)  # -1 = unlimited

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="api_keys")

    __table_args__ = (
        Index('idx_key_hash', 'key_hash'),
        Index('idx_user_id', 'user_id'),
    )


class UsageLog(Base):
    """
    Usage tracking for rate limiting and billing
    R (Repudiation): Audit logs in read-only stream
    """
    __tablename__ = "usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Request info
    endpoint = Column(String, nullable=False)
    method = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)  # bytes

    # Processing info
    processing_time = Column(Integer, nullable=True)  # milliseconds
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(String, nullable=True)

    # Billing (for Enterprise)
    tokens_used = Column(Integer, default=0, nullable=False)
    cost = Column(Integer, default=0, nullable=False)  # cents

    # Metadata
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="usage_logs")

    __table_args__ = (
        Index('idx_user_created', 'user_id', 'created_at'),
        Index('idx_endpoint', 'endpoint'),
    )


class ProcessingJob(Base):
    """
    Async processing job tracking
    For cloud-based OCR, Office conversion, etc.
    """
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, unique=True, index=True, nullable=False)  # Celery task ID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Job info
    job_type = Column(String, nullable=False)  # ocr, office_convert, compress, etc.
    status = Column(String, default="pending", nullable=False)  # pending, processing, completed, failed
    progress = Column(Integer, default=0, nullable=False)  # 0-100

    # File info
    input_file_name = Column(String, nullable=False)
    input_file_size = Column(Integer, nullable=False)
    output_file_url = Column(String, nullable=True)

    # Result
    result_data = Column(String, nullable=True)  # JSON string for OCR results, etc.
    error_message = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index('idx_job_id', 'job_id'),
        Index('idx_user_status', 'user_id', 'status'),
    )


class Webhook(Base):
    """
    Webhook configuration for Enterprise users
    Allows clients to receive real-time event notifications
    """
    __tablename__ = "webhooks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Webhook config
    url = Column(String, nullable=False)
    events = Column(String, nullable=False)  # JSON array of event types
    secret = Column(String, nullable=True)  # Optional secret for HMAC signature
    is_active = Column(Boolean, default=True, nullable=False)

    # Stats
    total_deliveries = Column(Integer, default=0, nullable=False)
    successful_deliveries = Column(Integer, default=0, nullable=False)
    failed_deliveries = Column(Integer, default=0, nullable=False)
    last_triggered_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User")

    __table_args__ = (
        Index('idx_webhook_user', 'user_id'),
        Index('idx_webhook_active', 'is_active'),
    )
