"""
Core configuration settings for PDF-Flow backend
Based on v4.0 specification: Enterprise-grade architecture with STRIDE security model
"""
import json
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    # Project Info
    PROJECT_NAME: str = "PDF-Flow API"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")

    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_PUBLIC_URL: str = Field(default="http://localhost:8000", env="BACKEND_PUBLIC_URL")

    # Security - JWT
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS_RAW: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        alias="ALLOWED_ORIGINS"
    )
    ALLOWED_HOSTS_RAW: str = Field(
        default="localhost,127.0.0.1",
        alias="ALLOWED_HOSTS"
    )

    # Database (Supabase PostgreSQL)
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Redis Configuration
    REDIS_URL: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    REDIS_QUEUE_NAME: str = "pdf_processing_queue"

    # File Storage
    UPLOAD_DIR: str = "/tmp/pdf-flow/uploads"
    MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024  # 500MB for Pro users
    FREE_TIER_MAX_SIZE: int = 20 * 1024 * 1024  # 20MB for free users
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "jpg", "jpeg", "png", "docx", "xlsx", "pptx"]
    CLOUD_FILE_UPLOAD_TTL_SECONDS: int = Field(default=3600, env="CLOUD_FILE_UPLOAD_TTL_SECONDS")
    CLOUD_FILE_RESULT_TTL_SECONDS: int = Field(default=3600, env="CLOUD_FILE_RESULT_TTL_SECONDS")
    CLOUD_FILE_DOWNLOAD_TTL_SECONDS: int = Field(default=1800, env="CLOUD_FILE_DOWNLOAD_TTL_SECONDS")
    CLOUD_FILE_CLEANUP_INTERVAL_SECONDS: int = Field(default=300, env="CLOUD_FILE_CLEANUP_INTERVAL_SECONDS")

    # Rate Limiting (Redis sliding window)
    RATE_LIMIT_FREE: int = 3  # 3 requests per day for free users
    RATE_LIMIT_PRO: int = -1  # Unlimited for Pro users
    RATE_LIMIT_WINDOW: int = 86400  # 24 hours in seconds

    # OCR Configuration
    TESSERACT_PATH: Optional[str] = Field(default=None, env="TESSERACT_PATH")
    OCR_LANGUAGES: List[str] = ["eng", "chi_sim", "spa"]

    # Payment provider registry
    PAYMENT_ENABLED_PROVIDERS_RAW: str = Field(default="stripe", alias="PAYMENT_ENABLED_PROVIDERS")
    PAYMENT_PROVIDER_ORDER_RAW: str = Field(
        default="stripe,paypal,epay,alipay,wechat,tokenpay,bepusdt,epusdt,okpay",
        alias="PAYMENT_PROVIDER_ORDER",
    )
    PAYMENT_PROVIDER_CHECKOUT_URLS_RAW: str = Field(default="{}", alias="PAYMENT_PROVIDER_CHECKOUT_URLS")
    PAYMENT_ORDER_TTL_MINUTES: int = Field(default=30, env="PAYMENT_ORDER_TTL_MINUTES")

    # Stripe Configuration (legacy compatibility; will move behind provider adapter)
    STRIPE_SECRET_KEY: Optional[str] = Field(default=None, env="STRIPE_SECRET_KEY")
    STRIPE_PUBLISHABLE_KEY: Optional[str] = Field(default=None, env="STRIPE_PUBLISHABLE_KEY")
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(default=None, env="STRIPE_WEBHOOK_SECRET")
    STRIPE_PRICE_ID_MONTHLY: Optional[str] = Field(default=None, env="STRIPE_PRICE_ID_MONTHLY")
    STRIPE_PRICE_ID_YEARLY: Optional[str] = Field(default=None, env="STRIPE_PRICE_ID_YEARLY")

    # PayPal Configuration
    PAYPAL_CLIENT_ID: Optional[str] = Field(default=None, env="PAYPAL_CLIENT_ID")
    PAYPAL_CLIENT_SECRET: Optional[str] = Field(default=None, env="PAYPAL_CLIENT_SECRET")
    PAYPAL_WEBHOOK_ID: Optional[str] = Field(default=None, env="PAYPAL_WEBHOOK_ID")
    PAYPAL_API_BASE_URL: str = Field(default="https://api-m.sandbox.paypal.com", env="PAYPAL_API_BASE_URL")

    # Alipay Configuration
    ALIPAY_APP_ID: Optional[str] = Field(default=None, env="ALIPAY_APP_ID")
    ALIPAY_PRIVATE_KEY: Optional[str] = Field(default=None, env="ALIPAY_PRIVATE_KEY")
    ALIPAY_PUBLIC_KEY: Optional[str] = Field(default=None, env="ALIPAY_PUBLIC_KEY")
    ALIPAY_GATEWAY_URL: str = Field(default="https://openapi-sandbox.dl.alipaydev.com/gateway.do", env="ALIPAY_GATEWAY_URL")

    # WeChat Pay Configuration
    WECHAT_PAY_APP_ID: Optional[str] = Field(default=None, env="WECHAT_PAY_APP_ID")
    WECHAT_PAY_MCH_ID: Optional[str] = Field(default=None, env="WECHAT_PAY_MCH_ID")
    WECHAT_PAY_SERIAL_NO: Optional[str] = Field(default=None, env="WECHAT_PAY_SERIAL_NO")
    WECHAT_PAY_PRIVATE_KEY: Optional[str] = Field(default=None, env="WECHAT_PAY_PRIVATE_KEY")
    WECHAT_PAY_API_V3_KEY: Optional[str] = Field(default=None, env="WECHAT_PAY_API_V3_KEY")
    WECHAT_PAY_PLATFORM_CERT: Optional[str] = Field(default=None, env="WECHAT_PAY_PLATFORM_CERT")
    WECHAT_PAY_API_BASE_URL: str = Field(default="https://api.mch.weixin.qq.com", env="WECHAT_PAY_API_BASE_URL")

    # Hosted gateway / crypto gateway configuration.
    # JSON object keyed by provider: epay, tokenpay, bepusdt, epusdt, okpay.
    PAYMENT_GATEWAY_CONFIGS_RAW: str = Field(default="{}", alias="PAYMENT_GATEWAY_CONFIGS")

    # Email Configuration (Resend)
    RESEND_API_KEY: Optional[str] = Field(default=None, env="RESEND_API_KEY")
    EMAIL_FROM: str = Field(default="PDF-Flow <noreply@pdf-flow.com>", env="EMAIL_FROM")
    FRONTEND_URL: str = Field(default="http://localhost:5173", env="FRONTEND_URL")
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1

    # OAuth Configuration
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None, env="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None, env="GOOGLE_CLIENT_SECRET")
    GITHUB_CLIENT_ID: Optional[str] = Field(default=None, env="GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: Optional[str] = Field(default=None, env="GITHUB_CLIENT_SECRET")
    OAUTH_REDIRECT_URL: str = Field(default="http://localhost:8000", env="OAUTH_REDIRECT_URL")

    # Monitoring & Analytics
    SENTRY_DSN: Optional[str] = Field(default=None, env="SENTRY_DSN")
    POSTHOG_API_KEY: Optional[str] = Field(default=None, env="POSTHOG_API_KEY")

    # AI / Gemini
    GEMINI_API_KEY: Optional[str] = Field(default=None, env="GEMINI_API_KEY")

    # Celery Configuration
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0", env="CELERY_BROKER_URL")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/1", env="CELERY_RESULT_BACKEND")

    # Security - STRIDE Model Implementation
    # S (Spoofing): API Keys stored as SHA-256 hashes only
    # T (Tampering): Magic number validation for all uploads
    # R (Repudiation): Audit logs in read-only stream
    # I (Information Disclosure): CSP headers, Tmpfs storage
    # D (Denial of Service): Cloudflare + Redis rate limiting
    # E (Elevation of Privilege): Non-root containers, minimum permissions

    @staticmethod
    def _parse_list_setting(value: str) -> List[str]:
        value = (value or "").strip()
        if not value:
            return []
        if value.startswith("["):
            return [item.strip() for item in json.loads(value) if str(item).strip()]
        return [item.strip() for item in value.split(",") if item.strip()]

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        return self._parse_list_setting(self.ALLOWED_ORIGINS_RAW)

    @property
    def ALLOWED_HOSTS(self) -> List[str]:
        return self._parse_list_setting(self.ALLOWED_HOSTS_RAW)

    @property
    def PAYMENT_ENABLED_PROVIDERS(self) -> List[str]:
        return self._parse_list_setting(self.PAYMENT_ENABLED_PROVIDERS_RAW)

    @property
    def PAYMENT_PROVIDER_ORDER(self) -> List[str]:
        return self._parse_list_setting(self.PAYMENT_PROVIDER_ORDER_RAW)

    @property
    def PAYMENT_PROVIDER_CHECKOUT_URLS(self) -> dict[str, str]:
        value = (self.PAYMENT_PROVIDER_CHECKOUT_URLS_RAW or "").strip()
        if not value:
            return {}
        parsed = json.loads(value)
        return {str(key): str(url) for key, url in parsed.items() if str(url).strip()}

    @property
    def PAYMENT_GATEWAY_CONFIGS(self) -> dict[str, dict]:
        value = (self.PAYMENT_GATEWAY_CONFIGS_RAW or "").strip()
        if not value:
            return {}
        parsed = json.loads(value)
        return {str(key): dict(config) for key, config in parsed.items()}


# Create settings instance
settings = Settings()
