"""Hidden admin console endpoints."""
from datetime import datetime
import json
import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import (
    AdminAuditLog,
    ApiErrorLog,
    ContentBlock,
    FeatureFlag,
    FeedbackReport,
    PaymentEvent,
    PaymentOrder,
    ProcessingJob,
    SiteSetting,
    User,
    UserRole,
    Webhook,
)
from app.domains.payment import PaymentService
from app.domains.payment.providers import provider_display_name
from app.services.feature_gate import DEFAULT_FEATURE_FLAGS
from app.services.file_service import file_processing_service
from app.services.file_retention_service import file_retention_service
from app.celery_worker import celery_app
from app.schemas.admin import (
    AdminAuditLogResponse,
    AdminApiErrorResponse,
    AdminCleanupTestUsersResponse,
    AdminDiagnosticsResponse,
    AdminFeedbackCleanupResponse,
    AdminFileRetentionResponse,
    AdminHealthReportResponse,
    AdminJobResponse,
    AdminMaintenanceResponse,
    AdminOperationsResponse,
    AdminPaymentSummaryResponse,
    AdminOverviewResponse,
    AdminUserResponse,
    AdminUserUpdate,
    ContentBlockResponse,
    ContentBlockUpdate,
    FeatureFlagResponse,
    FeatureFlagUpdate,
    SiteSettingResponse,
    SiteSettingUpdate,
)
from app.schemas.feedback import AdminFeedbackResponse, AdminFeedbackUpdate

router = APIRouter()


DEFAULT_SETTINGS = [
    {
        "key": "site_name",
        "value": "PDF-Flow",
        "value_type": "text",
        "group": "brand",
        "label": "站点名称",
        "description": "显示在浏览器标题、页脚和品牌区域的名称。",
    },
    {
        "key": "support_contact",
        "value": "请通过页面截图、时间点和错误编号联系管理员。",
        "value_type": "textarea",
        "group": "support",
        "label": "支持说明",
        "description": "用于页脚或错误提示中的支持说明。",
    },
    {
        "key": "support_email",
        "value": "support@pdf-flow.com",
        "value_type": "text",
        "group": "support",
        "label": "支持邮箱",
        "description": "用于页脚、支付结果页和公开支持入口。",
    },
    {
        "key": "global_announcement",
        "value": "",
        "value_type": "textarea",
        "group": "notice",
        "label": "全站公告",
        "description": "留空表示不展示全站公告。",
    },
    {
        "key": "maintenance_mode",
        "value": "false",
        "value_type": "boolean",
        "group": "system",
        "label": "维护模式",
        "description": "开启后公开页面展示维护提示，处理类接口会暂停普通用户访问。",
    },
]

DEFAULT_CONTENT_BLOCKS = [
    (
        "privacy_policy",
        "zh",
        "我们如何保护你的文件与账号信息",
        "我们不会出售你的个人信息，也不会为了广告画像而读取你的文件内容。上传到云端处理的文件仅用于完成你主动发起的任务、排查故障和保障服务安全，并会尽量缩短保留时间。",
    ),
    (
        "privacy_policy",
        "en",
        "How we protect your files and account information",
        "We do not sell your personal information or read your documents for advertising profiles. Files uploaded for cloud processing are used to complete the task you requested, troubleshoot issues, and protect service security, with retention kept as short as practical.",
    ),
    (
        "terms_of_service",
        "zh",
        "使用 PDF-Flow 前请了解这些规则",
        "你可以使用 PDF-Flow 处理合法、合规、属于你或你有权处理的文件。请不要上传违法、侵权、恶意、滥用资源或可能伤害他人的内容。重要文件请自行保留备份并核对处理结果。",
    ),
    (
        "terms_of_service",
        "en",
        "Please understand these rules before using PDF-Flow",
        "You may use PDF-Flow to process legal documents that you own or are allowed to handle. Do not upload unlawful, infringing, malicious, abusive, or harmful content. Keep your own backups and verify important results.",
    ),
    (
        "home_hero",
        "zh",
        "PDF-Flow",
        "隐私优先的 PDF 工作台，合并、拆分、压缩、转换、OCR 和 AI 分析都在一个清晰流程里完成。",
    ),
    (
        "home_hero",
        "en",
        "PDF-Flow",
        "A privacy-first PDF workspace for merging, splitting, compressing, converting, OCR, and AI-assisted document review.",
    ),
    (
        "pricing_intro",
        "zh",
        "先从免费开始，需要云端能力时再升级",
        "基础 PDF 工具适合日常处理；当 OCR、Office 转换、AI 分析或团队流程成为稳定需求时，再开启更高套餐。",
    ),
    (
        "pricing_intro",
        "en",
        "Start free, upgrade when cloud work matters",
        "Core PDF tools cover everyday work. Upgrade when OCR, Office conversion, AI analysis, or team workflows become part of your regular process.",
    ),
]

LEGACY_CONTENT_PLACEHOLDERS = {
    "由后台接管后，可在这里维护隐私政策正文。",
    "由后台接管后，可在这里维护服务条款正文。",
    "用于后续从后台维护首页首屏文案。",
    "用于后续从后台维护定价页说明。",
}

def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _is_test_account(user: User) -> bool:
    email = (user.email or "").lower()
    return (
        email.startswith("smoke-")
        or email.startswith("ocr-")
        or email.startswith("office-")
        or email.endswith("@example.com")
    )


def _test_user_query(db: Session, admin: User | None = None):
    query = db.query(User).filter(User.role != UserRole.ADMIN)
    if admin is not None:
        query = query.filter(User.id != admin.id)
    audited_admin_ids = db.query(AdminAuditLog.admin_user_id)
    query = query.filter(~User.id.in_(audited_admin_ids))
    return query.filter(
        (User.email.ilike("smoke-%"))
        | (User.email.ilike("ocr-%"))
        | (User.email.ilike("office-%"))
        | (User.email.ilike("%@example.com"))
    )


def _serialize_admin_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": _role_value(user),
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "is_test_account": _is_test_account(user),
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
    }


def _datetime_from_epoch(value) -> datetime | None:
    try:
        return datetime.fromtimestamp(float(value))
    except (TypeError, ValueError, OSError):
        return None


def _infer_job_type(status_data: dict) -> str:
    message = str(status_data.get("message") or "").lower()
    result = status_data.get("result") or {}
    if "ocr" in message or "text" in result:
        return "ocr_pdf"
    if "office" in message:
        return "office_to_pdf"
    if "merge" in message:
        return "merge_pdf"
    if "split" in message:
        return "split_pdf"
    if "compression" in message or "compress" in message:
        return "compress_pdf"
    if "rotation" in message or "rotate" in message:
        return "rotate_pdf"
    if "image to pdf" in message:
        return "image_to_pdf"
    if "pdf to images" in message:
        return "pdf_to_image"
    return "processing_job"


def _list_redis_jobs(limit: int) -> list[dict]:
    jobs = []
    redis_client = file_processing_service.redis_client
    try:
        keys = list(redis_client.scan_iter("job:*", count=100))
    except AttributeError:
        keys = [key for key in getattr(redis_client, "store", {}).keys() if str(key).startswith("job:")]
    except Exception:
        return jobs

    for index, key in enumerate(keys):
        try:
            raw = redis_client.get(key)
            if not raw:
                continue
            import json

            status_data = json.loads(raw)
        except Exception:
            continue

        created_at = _datetime_from_epoch(status_data.get("created_at"))
        updated_at = _datetime_from_epoch(status_data.get("updated_at")) or created_at
        result = status_data.get("result") or {}
        error = status_data.get("error")
        output_path = result.get("output_path") or ""
        input_file_name = result.get("input_file_name") or output_path.rsplit("/", 1)[-1] or "Redis task"
        jobs.append({
            "id": None,
            "job_id": status_data.get("job_id") or str(key).replace("job:", ""),
            "user_id": None,
            "user_email": None,
            "job_type": _infer_job_type(status_data),
            "status": status_data.get("status", "unknown"),
            "progress": int(status_data.get("progress") or (100 if status_data.get("status") == "completed" else 0)),
            "input_file_name": input_file_name,
            "input_file_size": int(result.get("file_size") or 0),
            "error_message": str(error) if error else None,
            "created_at": created_at or datetime.fromtimestamp(0),
            "started_at": None,
            "completed_at": updated_at if status_data.get("status") in ("completed", "failed") else None,
            "_sort": created_at.timestamp() if created_at else time.time() - index,
        })

    jobs.sort(key=lambda item: item["_sort"], reverse=True)
    for item in jobs:
        item.pop("_sort", None)
    return jobs[:limit]


def _check_services(db: Session) -> dict:
    services = {}
    try:
        db.execute(text("SELECT 1"))
        services["database"] = {"status": "healthy", "detail": "Postgres reachable"}
    except Exception as exc:
        services["database"] = {"status": "unhealthy", "detail": str(exc)}

    try:
        file_processing_service.redis_client.ping()
        services["redis"] = {"status": "healthy", "detail": "Redis reachable"}
    except Exception as exc:
        services["redis"] = {"status": "unhealthy", "detail": str(exc)}

    if services.get("redis", {}).get("status") != "healthy":
        services["celery_worker"] = {
            "status": "unhealthy",
            "detail": "Redis broker is unavailable.",
        }
    else:
        try:
            responses = celery_app.control.ping(timeout=1.0)
            services["celery_worker"] = {
                "status": "healthy" if responses else "degraded",
                "detail": f"{len(responses)} worker response(s)" if responses else "No worker responded to Celery ping.",
            }
        except Exception as exc:
            services["celery_worker"] = {
                "status": "degraded",
                "detail": f"Celery ping failed: {exc}",
            }
    return services


def _current_migration_version(db: Session) -> str | None:
    try:
        row = db.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).first()
        return row[0] if row else None
    except Exception:
        return None


def _list_all_jobs_for_admin(db: Session, limit: int, status_filter: str | None = None) -> list[dict]:
    safe_limit = min(max(limit, 1), 100)
    redis_jobs = _list_redis_jobs(safe_limit)
    if status_filter:
        redis_jobs = [job for job in redis_jobs if job["status"] == status_filter]

    query = (
        db.query(ProcessingJob, User.email)
        .outerjoin(User, ProcessingJob.user_id == User.id)
        .order_by(ProcessingJob.created_at.desc())
    )
    if status_filter:
        query = query.filter(ProcessingJob.status == status_filter)

    rows = query.limit(safe_limit).all()
    db_jobs = [
        {
            "id": job.id,
            "job_id": job.job_id,
            "user_id": job.user_id,
            "user_email": email,
            "job_type": job.job_type,
            "status": job.status,
            "progress": job.progress,
            "input_file_name": job.input_file_name,
            "input_file_size": job.input_file_size,
            "error_message": job.error_message,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
        }
        for job, email in rows
    ]
    seen = {job["job_id"] for job in redis_jobs}
    merged = redis_jobs + [job for job in db_jobs if job["job_id"] not in seen]
    merged.sort(key=lambda item: item["created_at"], reverse=True)
    return merged[:safe_limit]


def _safe_diag(value: object | None, fallback: str = "none", max_length: int = 240) -> str:
    if value is None:
        return fallback
    text_value = str(value).replace("\r", " ").replace("\n", " ").strip()
    if not text_value:
        return fallback
    return text_value if len(text_value) <= max_length else f"{text_value[:max_length - 3]}..."


def _build_diagnostic_summary(
    generated_at: datetime,
    services: dict,
    errors: list[ApiErrorLog],
    failed_jobs: list[dict],
    feedback: list[FeedbackReport],
    open_feedback_count: int,
    failed_jobs_count: int,
    api_error_count: int,
) -> str:
    service_status = ", ".join(
        f"{name}={getattr(status, 'status', None) or status.get('status', 'unknown')}"
        for name, status in services.items()
    ) or "none"

    lines = [
        "PDF-Flow diagnostic packet",
        f"Generated: {generated_at.isoformat()}Z",
        f"Environment: {settings.ENVIRONMENT}",
        f"Version: {settings.VERSION}",
        f"Services: {service_status}",
        f"Counts: api_errors={api_error_count}, failed_jobs={failed_jobs_count}, open_feedback={open_feedback_count}",
    ]

    if errors:
        error = errors[0]
        lines.extend([
            "",
            "Latest API error:",
            f"- request_id={_safe_diag(error.request_id)}",
            f"- route={error.method} {_safe_diag(error.path, max_length=180)}",
            f"- status={error.status_code}, type={_safe_diag(error.error_type)}",
            f"- message={_safe_diag(error.error_message or error.traceback_summary, max_length=280)}",
        ])

    if failed_jobs:
        job = failed_jobs[0]
        lines.extend([
            "",
            "Latest failed job:",
            f"- job_id={_safe_diag(job.get('job_id'))}",
            f"- type={_safe_diag(job.get('job_type'))}, status={_safe_diag(job.get('status'))}, progress={job.get('progress', 0)}",
            f"- file={_safe_diag(job.get('input_file_name'), max_length=180)}, size={job.get('input_file_size', 0)}",
            f"- error={_safe_diag(job.get('error_message'), max_length=280)}",
        ])

    if feedback:
        item = feedback[0]
        lines.extend([
            "",
            "Latest open feedback:",
            f"- id={item.id}, status={_safe_diag(item.status)}, severity={_safe_diag(item.severity)}",
            f"- title={_safe_diag(item.title, max_length=180)}",
            f"- page={_safe_diag(item.page_url, max_length=180)}",
            f"- diagnostic_code={_safe_diag(item.diagnostic_code)}",
        ])

    lines.extend([
        "",
        "Privacy note: request bodies and document contents are not included in this packet.",
    ])
    return "\n".join(lines)


def _serialize_payment_order(order: PaymentOrder, user_email: str | None = None) -> dict:
    return {
        "id": order.id,
        "user_id": order.user_id,
        "user_email": user_email,
        "provider": order.provider,
        "provider_display_name": provider_display_name(order.provider),
        "merchant_order_id": order.merchant_order_id,
        "provider_order_id": order.provider_order_id,
        "plan": order.plan,
        "amount_cents": order.amount_cents,
        "currency": order.currency,
        "status": order.status,
        "checkout_url_present": bool(order.checkout_url),
        "qr_code_url_present": bool(order.qr_code_url),
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "expires_at": order.expires_at,
        "paid_at": order.paid_at,
    }


def _serialize_payment_event(event: PaymentEvent) -> dict:
    return {
        "id": event.id,
        "order_id": event.order_id,
        "provider": event.provider,
        "provider_event_id": event.provider_event_id,
        "merchant_order_id": event.merchant_order_id,
        "provider_order_id": event.provider_order_id,
        "event_type": event.event_type,
        "processing_status": event.processing_status,
        "amount_cents": event.amount_cents,
        "currency": event.currency,
        "raw_summary": event.raw_summary,
        "error_message": event.error_message,
        "created_at": event.created_at,
    }


def _provider_configured(provider: str) -> bool:
    return not _payment_provider_missing_config(provider)


def _payment_webhook_url(provider: str) -> str:
    return (
        f"{settings.BACKEND_PUBLIC_URL.rstrip('/')}"
        f"{settings.API_V1_PREFIX}/payment/webhooks/{provider}"
    )


def _payment_return_url(path: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


def _payment_provider_required_config(provider: str) -> list[str]:
    if provider == "stripe":
        return [
            "STRIPE_SECRET_KEY",
            "STRIPE_WEBHOOK_SECRET",
            "STRIPE_PRICE_ID_MONTHLY",
            "STRIPE_PRICE_ID_YEARLY",
        ]
    if provider == "paypal":
        return ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID"]
    if provider == "alipay":
        return ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY", "ALIPAY_PUBLIC_KEY"]
    if provider == "wechat":
        return [
            "WECHAT_PAY_APP_ID",
            "WECHAT_PAY_MCH_ID",
            "WECHAT_PAY_SERIAL_NO",
            "WECHAT_PAY_PRIVATE_KEY",
            "WECHAT_PAY_API_V3_KEY",
            "WECHAT_PAY_PLATFORM_CERT",
        ]
    if provider in {"epay", "tokenpay", "bepusdt", "epusdt", "okpay"}:
        return [
            f"PAYMENT_GATEWAY_CONFIGS.{provider}.merchant_id",
            f"PAYMENT_GATEWAY_CONFIGS.{provider}.secret",
            f"PAYMENT_GATEWAY_CONFIGS.{provider}.create_url",
        ]
    return [f"PAYMENT_PROVIDER_CHECKOUT_URLS.{provider}"]


def _payment_provider_missing_config(provider: str) -> list[str]:
    gateway_config = settings.PAYMENT_GATEWAY_CONFIGS.get(provider, {})
    values = {
        "STRIPE_SECRET_KEY": settings.STRIPE_SECRET_KEY,
        "STRIPE_WEBHOOK_SECRET": settings.STRIPE_WEBHOOK_SECRET,
        "STRIPE_PRICE_ID_MONTHLY": settings.STRIPE_PRICE_ID_MONTHLY,
        "STRIPE_PRICE_ID_YEARLY": settings.STRIPE_PRICE_ID_YEARLY,
        "PAYPAL_CLIENT_ID": settings.PAYPAL_CLIENT_ID,
        "PAYPAL_CLIENT_SECRET": settings.PAYPAL_CLIENT_SECRET,
        "PAYPAL_WEBHOOK_ID": settings.PAYPAL_WEBHOOK_ID,
        "ALIPAY_APP_ID": settings.ALIPAY_APP_ID,
        "ALIPAY_PRIVATE_KEY": settings.ALIPAY_PRIVATE_KEY,
        "ALIPAY_PUBLIC_KEY": settings.ALIPAY_PUBLIC_KEY,
        "WECHAT_PAY_APP_ID": settings.WECHAT_PAY_APP_ID,
        "WECHAT_PAY_MCH_ID": settings.WECHAT_PAY_MCH_ID,
        "WECHAT_PAY_SERIAL_NO": settings.WECHAT_PAY_SERIAL_NO,
        "WECHAT_PAY_PRIVATE_KEY": settings.WECHAT_PAY_PRIVATE_KEY,
        "WECHAT_PAY_API_V3_KEY": settings.WECHAT_PAY_API_V3_KEY,
        "WECHAT_PAY_PLATFORM_CERT": settings.WECHAT_PAY_PLATFORM_CERT,
        f"PAYMENT_GATEWAY_CONFIGS.{provider}.merchant_id": gateway_config.get("merchant_id"),
        f"PAYMENT_GATEWAY_CONFIGS.{provider}.secret": gateway_config.get("secret"),
        f"PAYMENT_GATEWAY_CONFIGS.{provider}.create_url": gateway_config.get("create_url"),
        f"PAYMENT_PROVIDER_CHECKOUT_URLS.{provider}": settings.PAYMENT_PROVIDER_CHECKOUT_URLS.get(provider),
    }
    return [
        key for key in _payment_provider_required_config(provider)
        if not values.get(key)
    ]


def _payment_provider_console_hint(provider: str) -> str:
    hints = {
        "stripe": "Stripe Dashboard > Developers > Webhooks",
        "paypal": "PayPal Developer Dashboard > Apps & Credentials > Webhooks",
        "epay": "易支付商户后台 > 支付接口/异步通知地址",
        "alipay": "支付宝开放平台 > 应用信息 > 开发设置 > 授权回调/异步通知",
        "wechat": "微信支付商户平台 > 产品中心/开发配置 > 支付通知地址",
        "tokenpay": "TokenPay 管理后台 > 通知地址/回调地址",
        "bepusdt": "BEPUSDT 管理后台 > 异步通知地址",
        "epusdt": "EPUSDT 管理后台 > 异步通知地址",
        "okpay": "OKPay 商户后台 > 回调/通知地址",
    }
    return hints.get(provider, "Provider merchant console > webhook or notification URL")


def _payment_provider_setup_notes(provider: str) -> list[str]:
    notes = [
        "Use the webhook/notify URL as the provider server callback URL.",
        "Success and cancel URLs are user return pages only; they must not be treated as payment proof.",
        "Keep provider secrets in backend environment variables, not in frontend code.",
    ]
    if provider == "paypal":
        notes.append("After creating the PayPal webhook, copy its webhook id into PAYPAL_WEBHOOK_ID.")
    if provider == "wechat":
        notes.append("WeChat Pay notifications require API v3 key, merchant private key, and platform certificate verification.")
    if provider in {"epay", "tokenpay", "bepusdt", "epusdt", "okpay"}:
        notes.append("If the gateway supports a custom notify_url, leave it unset to use the backend default unless the merchant console requires an override.")
    return notes


def _payment_provider_sandbox_runbook(provider: str) -> list[str]:
    common = [
        "Enable this provider in PAYMENT_ENABLED_PROVIDERS only after required backend config is present.",
        "Create a small monthly test checkout from the Pricing page while signed in as a test account.",
        "Complete the provider sandbox payment and return to the frontend success page.",
        "Refresh this admin payment view and confirm the order becomes paid or an actionable review state.",
        "Confirm a PaymentEvent was recorded with processing_status=applied for the paid order.",
    ]
    provider_steps = {
        "paypal": [
            "Create the PayPal sandbox app webhook and copy the generated webhook id into PAYPAL_WEBHOOK_ID.",
            "After approval, call or trigger backend capture for the returned merchant order if the PayPal flow did not auto-capture.",
        ],
        "alipay": [
            "Use the Alipay sandbox gateway and sandbox buyer account for the first payment.",
            "Verify the Alipay notify payload signature and trade_success/trade_finished state are accepted.",
        ],
        "wechat": [
            "Use WeChat Pay sandbox or a low-value live test because Native pay may depend on merchant account capability.",
            "Verify API v3 notification decryption and platform signature validation before treating the order as paid.",
        ],
        "stripe": [
            "Use Stripe test card 4242 4242 4242 4242 and confirm the checkout.session.completed webhook is delivered.",
        ],
        "epay": [
            "Use the gateway's test merchant if available, otherwise run a low-value live test with a dedicated test order.",
        ],
        "tokenpay": [
            "Use a low-value token payment and wait for the gateway callback instead of trusting the return page.",
        ],
        "bepusdt": [
            "Use a low-value USDT test order and verify the gateway callback amount/currency mapping.",
        ],
        "epusdt": [
            "Use a low-value USDT test order and verify the gateway callback amount/currency mapping.",
        ],
        "okpay": [
            "Use the OKPay sandbox or a low-value live test and verify the callback signature.",
        ],
    }
    return common + provider_steps.get(provider, [])


def _payment_provider_go_live_checklist(provider: str) -> list[str]:
    checklist = [
        "BACKEND_PUBLIC_URL uses the public HTTPS backend domain that the provider can reach.",
        "FRONTEND_URL uses the public HTTPS frontend domain users will return to.",
        "Webhook/notify URL is configured in the provider dashboard exactly as shown here.",
        "Required backend config keys are present in the production environment.",
        "A real paid test order has a matching PaymentOrder and applied PaymentEvent.",
        "Duplicate webhook replay does not create duplicate entitlement time.",
        "Amount and currency mismatches remain in a review state instead of granting access.",
    ]
    if provider == "paypal":
        checklist.append("PayPal API base URL is switched from sandbox to live only after live app credentials are present.")
    if provider == "alipay":
        checklist.append("Alipay gateway URL and public/private keys match the live application.")
    if provider == "wechat":
        checklist.append("WeChat Pay merchant serial, private key, platform certificate, and API v3 key all match the live merchant.")
    if provider in {"epay", "tokenpay", "bepusdt", "epusdt", "okpay"}:
        checklist.append("Gateway create_url, merchant id, secret, and sign_type match the live gateway documentation.")
    return checklist


def _payment_provider_expected_event_flow(provider: str) -> list[str]:
    if provider == "paypal":
        return [
            "checkout_created -> provider approval page",
            "buyer approves payment",
            "backend capture confirms COMPLETED",
            "PaymentEvent processing_status=applied",
            "PaymentOrder status=paid and entitlement extended once",
        ]
    if provider == "stripe":
        return [
            "checkout_created -> Stripe Checkout",
            "checkout.session.completed webhook received",
            "PaymentEvent processing_status=applied",
            "PaymentOrder status=paid and entitlement/subscription state updated once",
        ]
    if provider in {"alipay", "wechat", "epay", "tokenpay", "bepusdt", "epusdt", "okpay"}:
        return [
            "checkout_created -> provider hosted/QR payment page",
            "provider asynchronous notify/webhook received by backend",
            "signature, merchant order id, amount, and currency validated",
            "PaymentEvent processing_status=applied",
            "PaymentOrder status=paid and entitlement extended once",
        ]
    return [
        "checkout_created",
        "provider callback received",
        "PaymentEvent processing_status=applied",
        "PaymentOrder status=paid",
    ]


def _payment_provider_troubleshooting_steps(provider: str) -> list[str]:
    steps = [
        "If no PaymentEvent appears, check provider dashboard delivery logs and BACKEND_PUBLIC_URL reachability.",
        "If verification fails, compare configured secret/certificate/public key with the provider dashboard.",
        "If amount_mismatch or currency_mismatch appears, compare plan pricing, provider currency, and minor-unit conversion.",
        "If checkout opens but never activates Pro, remember the frontend return page is not payment proof; inspect the webhook event.",
        "If the same webhook is delivered repeatedly, confirm provider_event_id stays stable and entitlement is not extended twice.",
    ]
    if provider == "wechat":
        steps.append("For WeChat Pay decrypt failures, verify API v3 key length and platform certificate freshness.")
    if provider == "paypal":
        steps.append("For PayPal webhook failures, confirm PAYPAL_WEBHOOK_ID belongs to the same app as PAYPAL_CLIENT_ID.")
    if provider in {"epay", "tokenpay", "bepusdt", "epusdt", "okpay"}:
        steps.append("For hosted gateway failures, verify sign_type and parameter ordering against the gateway documentation.")
    return steps


def _payment_provider_evidence_fields(provider: str) -> list[str]:
    fields = [
        "provider",
        "merchant_order_id",
        "provider_order_id",
        "provider_event_id",
        "amount_cents",
        "currency",
        "PaymentOrder.status",
        "PaymentEvent.processing_status",
        "paid_at",
        "current_period_end",
    ]
    if provider == "paypal":
        fields.extend(["PayPal capture id", "PayPal webhook id"])
    if provider == "wechat":
        fields.extend(["Wechat transaction_id", "Wechat out_trade_no", "Wechat trade_state"])
    if provider == "alipay":
        fields.extend(["Alipay trade_no", "Alipay out_trade_no", "Alipay trade_status"])
    if provider in {"epay", "tokenpay", "bepusdt", "epusdt", "okpay"}:
        fields.extend(["gateway trade id", "gateway sign_type", "gateway callback timestamp"])
    return fields


def _payment_status_tone(status_value: str) -> str:
    if status_value == "paid":
        return "settled"
    if status_value in {"amount_mismatch", "currency_mismatch"}:
        return "needs_review"
    if status_value in {"failed", "canceled", "cancelled"}:
        return "failed"
    return "open"


def _payment_provider_acceptance_state(
    option,
    configured: bool,
    missing_config_keys: list[str],
    provider_orders: list[PaymentOrder],
    provider_events: list[PaymentEvent],
) -> dict:
    applied_events = [
        event for event in provider_events
        if event.processing_status == "applied"
    ]
    failed_events = [
        event for event in provider_events
        if event.processing_status == "failed"
    ]
    paid_orders = [order for order in provider_orders if order.status == "paid"]
    review_orders = [
        order for order in provider_orders
        if _payment_status_tone(order.status) == "needs_review"
    ]
    pending_orders = [order for order in provider_orders if order.status == "pending"]
    latest_paid_event = max(applied_events, key=lambda item: item.created_at) if applied_events else None

    blockers: list[str] = []
    if not option.enabled:
        blockers.append("Provider is not enabled in PAYMENT_ENABLED_PROVIDERS.")
        return {
            "acceptance_status": "disabled",
            "acceptance_label": "Disabled",
            "acceptance_detail": "Provider is not visible in checkout yet.",
            "acceptance_blockers": blockers,
            "latest_paid_event_at": None,
        }

    if not configured:
        blockers.extend(missing_config_keys or ["Required merchant configuration is missing."])
        return {
            "acceptance_status": "missing_config",
            "acceptance_label": "Missing config",
            "acceptance_detail": "Add backend merchant config before starting sandbox or live smoke tests.",
            "acceptance_blockers": blockers,
            "latest_paid_event_at": None,
        }

    if review_orders or failed_events:
        if review_orders:
            blockers.append("At least one order is in a manual review state.")
        if failed_events:
            blockers.append("At least one payment event failed processing.")
        return {
            "acceptance_status": "needs_review",
            "acceptance_label": "Needs review",
            "acceptance_detail": "Configuration exists, but a payment order or callback needs manual reconciliation.",
            "acceptance_blockers": blockers,
            "latest_paid_event_at": latest_paid_event.created_at if latest_paid_event else None,
        }

    if paid_orders and applied_events:
        return {
            "acceptance_status": "accepted",
            "acceptance_label": "Smoke passed",
            "acceptance_detail": "At least one paid order has a matching applied PaymentEvent.",
            "acceptance_blockers": [],
            "latest_paid_event_at": latest_paid_event.created_at if latest_paid_event else None,
        }

    if pending_orders:
        blockers.append("A checkout exists but no applied provider event has arrived yet.")
        return {
            "acceptance_status": "waiting_callback",
            "acceptance_label": "Waiting callback",
            "acceptance_detail": "A test order exists; finish payment or inspect provider callback delivery.",
            "acceptance_blockers": blockers,
            "latest_paid_event_at": None,
        }

    blockers.append("No test order has been created for this provider yet.")
    return {
        "acceptance_status": "ready_to_test",
        "acceptance_label": "Ready to test",
        "acceptance_detail": "Configuration is present; create a sandbox or low-value live order from Pricing.",
        "acceptance_blockers": blockers,
        "latest_paid_event_at": None,
    }


def _build_payment_reconciliation_summary(
    generated_at: datetime,
    orders: list[PaymentOrder],
    events: list[PaymentEvent],
    provider_rows: list[dict],
    expired_pending_orders: int,
) -> str:
    latest = orders[0] if orders else None
    latest_event = max(events, key=lambda item: item.created_at) if events else None
    provider_status = ", ".join(
        f"{item['key']}={'configured' if item['configured'] else 'missing_config'}"
        for item in provider_rows
        if item["enabled"]
    ) or "none"
    paid_amount = sum(order.amount_cents for order in orders if order.status == "paid")
    review_orders = [
        order for order in orders
        if _payment_status_tone(order.status) == "needs_review"
    ]

    lines = [
        "PDF-Flow payment reconciliation packet",
        f"Generated: {generated_at.isoformat()}Z",
        f"Environment: {settings.ENVIRONMENT}",
        f"Orders: total={len(orders)}, paid={len([order for order in orders if order.status == 'paid'])}, pending={len([order for order in orders if order.status == 'pending'])}, expired_pending={expired_pending_orders}, needs_review={len(review_orders)}",
        f"Events: total={len(events)}, applied={len([event for event in events if event.processing_status == 'applied'])}, failed={len([event for event in events if event.processing_status == 'failed'])}, ignored={len([event for event in events if event.processing_status == 'ignored'])}",
        f"Paid amount cents: {paid_amount}",
        f"Provider config: {provider_status}",
    ]

    if latest:
        lines.extend([
            "",
            "Latest order:",
            f"- merchant_order_id={_safe_diag(latest.merchant_order_id)}",
            f"- provider={_safe_diag(latest.provider)}, status={_safe_diag(latest.status)}, plan={_safe_diag(latest.plan)}",
            f"- amount={latest.amount_cents} {latest.currency}",
            f"- user_id={latest.user_id}, provider_order_id={_safe_diag(latest.provider_order_id)}",
        ])

    if latest_event:
        lines.extend([
            "",
            "Latest payment event:",
            f"- provider_event_id={_safe_diag(latest_event.provider_event_id)}",
            f"- provider={_safe_diag(latest_event.provider)}, status={_safe_diag(latest_event.processing_status)}, type={_safe_diag(latest_event.event_type)}",
            f"- merchant_order_id={_safe_diag(latest_event.merchant_order_id)}",
        ])

    if review_orders:
        review = review_orders[0]
        lines.extend([
            "",
            "First order needing review:",
            f"- merchant_order_id={_safe_diag(review.merchant_order_id)}",
            f"- provider={_safe_diag(review.provider)}, status={_safe_diag(review.status)}",
            f"- amount={review.amount_cents} {review.currency}",
        ])

    lines.extend([
        "",
        "Privacy note: provider raw payloads, document contents, and checkout URLs are not included.",
    ])
    return "\n".join(lines)


def _build_payment_integration_evidence_packet(
    generated_at: datetime,
    orders: list[PaymentOrder],
    events: list[PaymentEvent],
    provider_rows: list[dict],
) -> str:
    lines = [
        "PDF-Flow payment integration evidence packet",
        f"Generated: {generated_at.isoformat()}Z",
        f"Environment: {settings.ENVIRONMENT}",
        f"Backend public URL: {_safe_diag(settings.BACKEND_PUBLIC_URL, max_length=180)}",
        f"Frontend URL: {_safe_diag(settings.FRONTEND_URL, max_length=180)}",
        "",
        "Manual test fields to fill:",
        "- tester=",
        "- provider_dashboard_event_url=",
        "- sandbox_or_live=",
        "- provider_dashboard_status=",
        "- screenshot_or_ticket_ref=",
    ]

    for provider_row in provider_rows:
        provider_key = provider_row["key"]
        provider_orders = [order for order in orders if order.provider == provider_key]
        provider_events = [event for event in events if event.provider == provider_key]
        latest_order = max(provider_orders, key=lambda item: item.created_at) if provider_orders else None
        latest_event = max(provider_events, key=lambda item: item.created_at) if provider_events else None

        lines.extend([
            "",
            f"Provider: {provider_row['display_name']} ({provider_key})",
            f"- enabled={provider_row['enabled']}, configured={provider_row['configured']}, settlement={_safe_diag(provider_row.get('settlement'))}",
            f"- acceptance_status={_safe_diag(provider_row.get('acceptance_status'))}, label={_safe_diag(provider_row.get('acceptance_label'))}",
            f"- acceptance_detail={_safe_diag(provider_row.get('acceptance_detail'), max_length=220)}",
            f"- acceptance_blockers={'; '.join(provider_row.get('acceptance_blockers') or []) or 'none'}",
            f"- webhook_url={_safe_diag(provider_row.get('webhook_url'), max_length=220)}",
            f"- success_return_url={_safe_diag(provider_row.get('success_return_url'), max_length=220)}",
            f"- cancel_return_url={_safe_diag(provider_row.get('cancel_return_url'), max_length=220)}",
            f"- missing_config={', '.join(provider_row.get('missing_config_keys') or []) or 'none'}",
        ])

        if latest_order:
            lines.extend([
                "- latest_order:",
                f"  merchant_order_id={_safe_diag(latest_order.merchant_order_id)}",
                f"  provider_order_id={_safe_diag(latest_order.provider_order_id)}",
                f"  status={_safe_diag(latest_order.status)}, amount={latest_order.amount_cents} {latest_order.currency}",
                f"  paid_at={latest_order.paid_at.isoformat() if latest_order.paid_at else 'none'}",
            ])
        else:
            lines.append("- latest_order=none")

        if latest_event:
            lines.extend([
                "- latest_event:",
                f"  provider_event_id={_safe_diag(latest_event.provider_event_id)}",
                f"  type={_safe_diag(latest_event.event_type)}, processing_status={_safe_diag(latest_event.processing_status)}",
                f"  amount={latest_event.amount_cents if latest_event.amount_cents is not None else 'none'} {latest_event.currency or ''}".rstrip(),
                f"  error={_safe_diag(latest_event.error_message)}",
            ])
        else:
            lines.append("- latest_event=none")

        lines.extend([
            "- expected_event_flow:",
            *[f"  {index + 1}. {_safe_diag(step, max_length=220)}" for index, step in enumerate(provider_row.get("expected_event_flow") or [])],
            "- evidence_fields:",
            f"  {', '.join(provider_row.get('evidence_fields') or []) or 'none'}",
            "- troubleshooting_first_steps:",
            *[f"  {index + 1}. {_safe_diag(step, max_length=220)}" for index, step in enumerate((provider_row.get("troubleshooting_steps") or [])[:3])],
        ])

    lines.extend([
        "",
        "Privacy note: checkout URLs, raw provider payloads, document contents, and secrets are not included.",
    ])
    return "\n".join(lines)


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require an authenticated admin user."""
    if _role_value(current_user) != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def _seed_defaults(db: Session) -> None:
    existing_settings = {
        item[0] for item in db.query(SiteSetting.key).all()
    }
    for item in DEFAULT_SETTINGS:
        if item["key"] not in existing_settings:
            db.add(SiteSetting(**item))

    existing_flags = {
        item[0] for item in db.query(FeatureFlag.key).all()
    }
    for key, label, description, enabled, requires_login, requires_pro in DEFAULT_FEATURE_FLAGS:
        if key not in existing_flags:
            db.add(
                FeatureFlag(
                    key=key,
                    label=label,
                    description=description,
                    enabled=enabled,
                    requires_login=requires_login,
                    requires_pro=requires_pro,
                )
            )

    existing_blocks = {
        (item.key, item.locale): item for item in db.query(ContentBlock).all()
    }
    for key, locale, title, content in DEFAULT_CONTENT_BLOCKS:
        block = existing_blocks.get((key, locale))
        if block is None:
            db.add(ContentBlock(key=key, locale=locale, title=title, content=content))
        elif block.content in LEGACY_CONTENT_PLACEHOLDERS:
            block.title = title
            block.content = content

    db.commit()


def _write_audit(
    db: Session,
    request: Request,
    admin: User,
    action: str,
    target_type: str,
    target_key: str,
    detail: str | None = None,
) -> None:
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    db.add(
        AdminAuditLog(
            admin_user_id=admin.id,
            action=action,
            target_type=target_type,
            target_key=target_key,
            detail=detail,
            ip_address=client_host,
            user_agent=user_agent,
        )
    )


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return admin console summary and seed defaults on first use."""
    _seed_defaults(db)
    recent_logs = (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(8)
        .all()
    )
    return {
        "settings_count": db.query(SiteSetting).count(),
        "feature_flags_count": db.query(FeatureFlag).count(),
        "content_blocks_count": db.query(ContentBlock).count(),
        "users_count": db.query(User).count(),
        "active_users_count": db.query(User).filter(User.is_active == True).count(),  # noqa: E712
        "admin_users_count": db.query(User).filter(User.role == UserRole.ADMIN).count(),
        "jobs_count": db.query(ProcessingJob).count(),
        "failed_jobs_count": db.query(ProcessingJob).filter(ProcessingJob.status == "failed").count(),
        "feedback_count": db.query(FeedbackReport).count(),
        "open_feedback_count": db.query(FeedbackReport).filter(FeedbackReport.status.in_(["new", "reviewing"])).count(),
        "api_error_count": db.query(ApiErrorLog).count(),
        "recent_audit_logs": recent_logs,
    }


@router.get("/operations", response_model=AdminOperationsResponse)
async def get_operations_overview(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return one-shot operational dashboard data for the hidden control room."""
    _seed_defaults(db)
    users = db.query(User).order_by(User.created_at.desc()).limit(8).all()
    all_users = db.query(User).all()
    jobs = _list_all_jobs_for_admin(db, limit=50)
    failed_jobs = [job for job in jobs if job["status"] == "failed"]
    running_jobs = [job for job in jobs if job["status"] in ("pending", "processing")]

    return {
        "generated_at": datetime.utcnow(),
        "services": _check_services(db),
        "total_users": len(all_users),
        "active_users": len([user for user in all_users if user.is_active]),
        "banned_users": len([user for user in all_users if not user.is_active]),
        "test_users": len([user for user in all_users if _is_test_account(user)]),
        "total_jobs": db.query(ProcessingJob).count(),
        "visible_jobs": len(jobs),
        "failed_jobs": len(failed_jobs),
        "running_jobs": len(running_jobs),
        "recent_users": [_serialize_admin_user(user) for user in users],
        "recent_failed_jobs": failed_jobs[:5],
        "recent_jobs": jobs[:8],
    }


@router.get("/health-report", response_model=AdminHealthReportResponse)
async def get_health_report(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return a safe copyable live health summary for admin troubleshooting."""
    _seed_defaults(db)
    jobs = _list_all_jobs_for_admin(db, limit=50)
    failed_jobs = [job for job in jobs if job["status"] == "failed"]
    running_jobs = [job for job in jobs if job["status"] in ("pending", "processing")]
    recent_error = db.query(ApiErrorLog).order_by(ApiErrorLog.created_at.desc()).first()
    recent_feedback = (
        db.query(FeedbackReport)
        .filter(FeedbackReport.status.in_(["new", "reviewing"]))
        .order_by(FeedbackReport.created_at.desc())
        .first()
    )

    return {
        "generated_at": datetime.utcnow(),
        "app_version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "migration_version": _current_migration_version(db),
        "services": _check_services(db),
        "users_count": db.query(User).count(),
        "active_users_count": db.query(User).filter(User.is_active == True).count(),  # noqa: E712
        "open_feedback_count": db.query(FeedbackReport).filter(FeedbackReport.status.in_(["new", "reviewing"])).count(),
        "api_error_count": db.query(ApiErrorLog).count(),
        "failed_jobs_count": len(failed_jobs),
        "running_jobs_count": len(running_jobs),
        "recent_error_path": recent_error.path if recent_error else None,
        "recent_feedback_title": recent_feedback.title if recent_feedback else None,
    }


@router.get("/payments", response_model=AdminPaymentSummaryResponse)
async def get_payment_operations(
    provider: str | None = None,
    status_filter: str | None = None,
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return read-only payment operations data for reconciliation."""
    safe_limit = min(max(limit, 1), 100)
    service = PaymentService(db)
    provider_options = service.list_providers()

    query = db.query(PaymentOrder, User.email).outerjoin(User, PaymentOrder.user_id == User.id)
    if provider:
        query = query.filter(PaymentOrder.provider == provider)
    if status_filter:
        query = query.filter(PaymentOrder.status == status_filter)

    recent_rows = (
        query
        .order_by(PaymentOrder.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    recent_orders = [
        _serialize_payment_order(order, user_email=email)
        for order, email in recent_rows
    ]
    recent_events = (
        db.query(PaymentEvent)
        .order_by(PaymentEvent.created_at.desc())
        .limit(safe_limit)
        .all()
    )

    all_orders = db.query(PaymentOrder).all()
    all_events = db.query(PaymentEvent).all()
    generated_at = datetime.utcnow()
    pending_orders = [order for order in all_orders if order.status == "pending"]
    paid_orders = [order for order in all_orders if order.status == "paid"]
    failed_orders = [
        order for order in all_orders
        if order.status in {"failed", "canceled", "cancelled"}
    ]
    amount_mismatch_orders = [order for order in all_orders if order.status == "amount_mismatch"]
    currency_mismatch_orders = [order for order in all_orders if order.status == "currency_mismatch"]
    expired_pending_orders = [
        order for order in pending_orders
        if order.expires_at is not None and order.expires_at < generated_at
    ]
    currency_breakdown: dict[str, int] = {}
    for order in paid_orders:
        currency = (order.currency or "UNKNOWN").upper()
        currency_breakdown[currency] = currency_breakdown.get(currency, 0) + order.amount_cents

    provider_rows = []
    for option in provider_options:
        provider_orders = [order for order in all_orders if order.provider == option.key]
        provider_events = [event for event in all_events if event.provider == option.key]
        latest_order = max(provider_orders, key=lambda item: item.created_at) if provider_orders else None
        configured = _provider_configured(option.key)
        missing_config_keys = _payment_provider_missing_config(option.key)
        acceptance_state = _payment_provider_acceptance_state(
            option,
            configured,
            missing_config_keys,
            provider_orders,
            provider_events,
        )
        if option.enabled and configured:
            detail = "Enabled and configuration is present."
        elif option.enabled:
            detail = "Enabled but merchant configuration is incomplete."
        else:
            detail = "Disabled in PAYMENT_ENABLED_PROVIDERS."
        provider_rows.append({
            "key": option.key,
            "display_name": option.display_name,
            "enabled": option.enabled,
            "configured": configured,
            **acceptance_state,
            "settlement": option.settlement,
            "supports_subscription": option.supports_subscription,
            "supports_one_time": option.supports_one_time,
            "open_orders": len([order for order in provider_orders if order.status == "pending"]),
            "paid_orders": len([order for order in provider_orders if order.status == "paid"]),
            "failed_orders": len([
                order for order in provider_orders
                if _payment_status_tone(order.status) in {"failed", "needs_review"}
            ]),
            "latest_order_at": latest_order.created_at if latest_order else None,
            "detail": detail,
            "webhook_url": _payment_webhook_url(option.key),
            "success_return_url": _payment_return_url("/payment/success"),
            "cancel_return_url": _payment_return_url("/payment/cancel"),
            "merchant_console_hint": _payment_provider_console_hint(option.key),
            "required_config_keys": _payment_provider_required_config(option.key),
            "missing_config_keys": missing_config_keys,
            "setup_notes": _payment_provider_setup_notes(option.key),
            "sandbox_runbook": _payment_provider_sandbox_runbook(option.key),
            "go_live_checklist": _payment_provider_go_live_checklist(option.key),
            "expected_event_flow": _payment_provider_expected_event_flow(option.key),
            "troubleshooting_steps": _payment_provider_troubleshooting_steps(option.key),
            "evidence_fields": _payment_provider_evidence_fields(option.key),
        })

    return {
        "generated_at": generated_at,
        "total_orders": len(all_orders),
        "pending_orders": len(pending_orders),
        "paid_orders": len(paid_orders),
        "failed_orders": len(failed_orders),
        "amount_mismatch_orders": len(amount_mismatch_orders),
        "currency_mismatch_orders": len(currency_mismatch_orders),
        "expired_pending_orders": len(expired_pending_orders),
        "paid_amount_cents": sum(order.amount_cents for order in paid_orders),
        "currency_breakdown": currency_breakdown,
        "providers": provider_rows,
        "recent_orders": recent_orders,
        "recent_events": [_serialize_payment_event(event) for event in recent_events],
        "reconciliation_summary": _build_payment_reconciliation_summary(
            generated_at,
            all_orders,
            all_events,
            provider_rows,
            len(expired_pending_orders),
        ),
        "integration_evidence_packet": _build_payment_integration_evidence_packet(
            generated_at,
            all_orders,
            all_events,
            provider_rows,
        ),
    }


@router.get("/public-config")
async def get_public_config(db: Session = Depends(get_db)):
    """Public read-only site configuration used by the frontend."""
    _seed_defaults(db)
    settings = db.query(SiteSetting).filter(SiteSetting.is_public == True).all()  # noqa: E712
    feature_flags = db.query(FeatureFlag).order_by(FeatureFlag.key).all()
    content_blocks = db.query(ContentBlock).filter(ContentBlock.is_public == True).all()  # noqa: E712

    return {
        "settings": {
            item.key: {
                "value": item.value,
                "value_type": item.value_type,
                "group": item.group,
                "label": item.label,
            }
            for item in settings
        },
        "feature_flags": {
            item.key: {
                "label": item.label,
                "description": item.description,
                "enabled": item.enabled,
                "requires_login": item.requires_login,
                "requires_pro": item.requires_pro,
                "maintenance_message": item.maintenance_message,
            }
            for item in feature_flags
        },
        "content_blocks": {
            f"{item.key}:{item.locale}": {
                "title": item.title,
                "content": item.content,
                "description": item.description,
            }
            for item in content_blocks
        },
    }


@router.get("/settings", response_model=list[SiteSettingResponse])
async def list_settings(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _seed_defaults(db)
    return db.query(SiteSetting).order_by(SiteSetting.group, SiteSetting.key).all()


@router.put("/settings/{key}", response_model=SiteSettingResponse)
async def update_setting(
    key: str,
    payload: SiteSettingUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _seed_defaults(db)
    setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if not setting:
        setting = SiteSetting(key=key)
        db.add(setting)

    for field, value in payload.model_dump().items():
        setattr(setting, field, value)
    setting.updated_by_id = admin.id
    _write_audit(db, request, admin, "update", "site_setting", key)
    db.commit()
    db.refresh(setting)
    return setting


@router.get("/feature-flags", response_model=list[FeatureFlagResponse])
async def list_feature_flags(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _seed_defaults(db)
    return db.query(FeatureFlag).order_by(FeatureFlag.key).all()


@router.put("/feature-flags/{key}", response_model=FeatureFlagResponse)
async def update_feature_flag(
    key: str,
    payload: FeatureFlagUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _seed_defaults(db)
    flag = db.query(FeatureFlag).filter(FeatureFlag.key == key).first()
    if not flag:
        flag = FeatureFlag(key=key)
        db.add(flag)

    for field, value in payload.model_dump().items():
        setattr(flag, field, value)
    flag.updated_by_id = admin.id
    _write_audit(db, request, admin, "update", "feature_flag", key)
    db.commit()
    db.refresh(flag)
    return flag


@router.get("/content-blocks", response_model=list[ContentBlockResponse])
async def list_content_blocks(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _seed_defaults(db)
    return db.query(ContentBlock).order_by(ContentBlock.key, ContentBlock.locale).all()


@router.put("/content-blocks/{key}/{locale}", response_model=ContentBlockResponse)
async def update_content_block(
    key: str,
    locale: str,
    payload: ContentBlockUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _seed_defaults(db)
    block = (
        db.query(ContentBlock)
        .filter(ContentBlock.key == key, ContentBlock.locale == locale)
        .first()
    )
    if not block:
        block = ContentBlock(key=key, locale=locale)
        db.add(block)

    data = payload.model_dump()
    data["locale"] = locale
    for field, value in data.items():
        setattr(block, field, value)
    block.updated_by_id = admin.id
    _write_audit(db, request, admin, "update", "content_block", f"{key}:{locale}")
    db.commit()
    db.refresh(block)
    return block


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    search: str | None = None,
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return recent users for hidden admin operations."""
    query = db.query(User).order_by(User.created_at.desc())
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            (User.email.ilike(pattern)) | (User.full_name.ilike(pattern))
        )

    users = query.limit(min(max(limit, 1), 100)).all()
    return [_serialize_admin_user(user) for user in users]


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a user's operational status or role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    if user.id == admin.id and (
        data.get("is_active") is False
        or (data.get("role") is not None and data["role"] != UserRole.ADMIN.value)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin access.",
        )

    if "role" in data:
        try:
            user.role = UserRole(data["role"])
        except ValueError as exc:
            allowed = ", ".join(role.value for role in UserRole)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid role. Allowed values: {allowed}",
            ) from exc
    if "is_active" in data:
        user.is_active = data["is_active"]
    if "is_verified" in data:
        user.is_verified = data["is_verified"]

    _write_audit(
        db,
        request,
        admin,
        "update",
        "user",
        user.email,
        detail=", ".join(sorted(data.keys())),
    )
    db.commit()
    db.refresh(user)
    return _serialize_admin_user(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a non-current user account and related owned records."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account.",
        )

    email = user.email
    _write_audit(db, request, admin, "delete", "user", email)
    db.delete(user)
    db.commit()
    return None


@router.post("/users/cleanup-test-users", response_model=AdminCleanupTestUsersResponse)
async def cleanup_test_users(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete synthetic test accounts while preserving admin and real user accounts."""
    users = _test_user_query(db, admin).all()
    user_ids = [user.id for user in users]
    deleted_emails = [user.email for user in users]

    if user_ids:
        db.query(FeedbackReport).filter(FeedbackReport.user_id.in_(user_ids)).update(
            {FeedbackReport.user_id: None},
            synchronize_session=False,
        )
        db.query(ApiErrorLog).filter(ApiErrorLog.user_id.in_(user_ids)).update(
            {ApiErrorLog.user_id: None},
            synchronize_session=False,
        )
        db.query(ProcessingJob).filter(ProcessingJob.user_id.in_(user_ids)).delete(
            synchronize_session=False
        )
        db.query(Webhook).filter(Webhook.user_id.in_(user_ids)).delete(
            synchronize_session=False
        )

        for user in users:
            db.delete(user)

    _write_audit(
        db,
        request,
        admin,
        "cleanup",
        "user",
        "test_accounts",
        detail=f"deleted={len(users)}",
    )
    db.commit()

    return {
        "deleted_count": len(users),
        "deleted_emails": deleted_emails,
        "remaining_test_users_count": _test_user_query(db, admin).count(),
    }


@router.get("/jobs", response_model=list[AdminJobResponse])
async def list_jobs(
    status_filter: str | None = None,
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return recent processing jobs with user context."""
    return _list_all_jobs_for_admin(db, limit=limit, status_filter=status_filter)


@router.get("/feedback", response_model=list[AdminFeedbackResponse])
async def list_feedback(
    status_filter: str | None = None,
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return recent user-submitted feedback reports."""
    safe_limit = min(max(limit, 1), 100)
    query = db.query(FeedbackReport).order_by(FeedbackReport.created_at.desc())
    if status_filter:
        query = query.filter(FeedbackReport.status == status_filter)
    return query.limit(safe_limit).all()


@router.get("/errors", response_model=list[AdminApiErrorResponse])
async def list_api_errors(
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return recent API 500-level error summaries."""
    safe_limit = min(max(limit, 1), 100)
    return (
        db.query(ApiErrorLog)
        .order_by(ApiErrorLog.created_at.desc())
        .limit(safe_limit)
        .all()
    )


@router.get("/diagnostics", response_model=AdminDiagnosticsResponse)
async def get_diagnostics(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return combined live-testing signals for quick production triage."""
    generated_at = datetime.utcnow()
    errors = (
        db.query(ApiErrorLog)
        .order_by(ApiErrorLog.created_at.desc())
        .limit(20)
        .all()
    )
    jobs = _list_all_jobs_for_admin(db, limit=50)
    failed_jobs = [job for job in jobs if job["status"] == "failed"][:10]
    failed_jobs_count = len([job for job in jobs if job["status"] == "failed"])
    feedback = (
        db.query(FeedbackReport)
        .filter(FeedbackReport.status.in_(["new", "reviewing"]))
        .order_by(FeedbackReport.created_at.desc())
        .limit(10)
        .all()
    )
    open_feedback_count = db.query(FeedbackReport).filter(
        FeedbackReport.status.in_(["new", "reviewing"])
    ).count()
    api_error_count = db.query(ApiErrorLog).count()
    services = _check_services(db)

    return {
        "generated_at": generated_at,
        "recent_errors": errors,
        "recent_failed_jobs": failed_jobs,
        "recent_feedback": [
            {
                "id": item.id,
                "title": item.title,
                "status": item.status,
                "severity": item.severity,
                "page_url": item.page_url,
                "diagnostic_code": item.diagnostic_code,
                "created_at": item.created_at,
            }
            for item in feedback
        ],
        "diagnostic_summary": _build_diagnostic_summary(
            generated_at=generated_at,
            services=services,
            errors=errors,
            failed_jobs=failed_jobs,
            feedback=feedback,
            open_feedback_count=open_feedback_count,
            failed_jobs_count=failed_jobs_count,
            api_error_count=api_error_count,
        ),
        "open_feedback_count": open_feedback_count,
        "failed_jobs_count": failed_jobs_count,
        "api_error_count": api_error_count,
    }


@router.get("/maintenance", response_model=AdminMaintenanceResponse)
async def get_maintenance_summary(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return safe cleanup counts for hidden admin maintenance actions."""
    jobs = _list_all_jobs_for_admin(db, limit=50)
    return {
        "test_users_count": _test_user_query(db, admin).count(),
        "live_acceptance_feedback_count": db.query(FeedbackReport).filter(
            FeedbackReport.status.in_(["new", "reviewing"]),
            FeedbackReport.title.ilike("live acceptance%"),
        ).count(),
        "open_feedback_count": db.query(FeedbackReport).filter(
            FeedbackReport.status.in_(["new", "reviewing"])
        ).count(),
        "api_error_count": db.query(ApiErrorLog).count(),
        "failed_jobs_count": len([job for job in jobs if job["status"] == "failed"]),
        "running_jobs_count": len([job for job in jobs if job["status"] in ("pending", "processing")]),
        "file_retention": file_retention_service.preview(),
    }


@router.post("/files/cleanup-expired", response_model=AdminFileRetentionResponse)
async def cleanup_expired_files(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete expired temporary upload/result/download directories under UPLOAD_DIR."""
    result = file_retention_service.cleanup()
    _write_audit(
        db,
        request,
        admin,
        "cleanup",
        "file_retention",
        settings.UPLOAD_DIR,
        detail=f"removed={result['removed_count']}, bytes={result['removed_bytes']}",
    )
    db.commit()
    return result


@router.patch("/feedback/{feedback_id}", response_model=AdminFeedbackResponse)
async def update_feedback(
    feedback_id: int,
    payload: AdminFeedbackUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update feedback triage status or internal admin note."""
    report = db.query(FeedbackReport).filter(FeedbackReport.id == feedback_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        allowed = {"new", "reviewing", "resolved", "closed"}
        if data["status"] not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid feedback status. Allowed values: {', '.join(sorted(allowed))}",
            )
        report.status = data["status"]
    if "admin_note" in data:
        report.admin_note = data["admin_note"]

    _write_audit(
        db,
        request,
        admin,
        "update",
        "feedback",
        str(report.id),
        detail=json.dumps(data, ensure_ascii=False),
    )
    db.commit()
    db.refresh(report)
    return report


@router.post("/feedback/cleanup-live-acceptance", response_model=AdminFeedbackCleanupResponse)
async def cleanup_live_acceptance_feedback(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Close synthetic live-acceptance feedback probes without touching real user reports."""
    reports = (
        db.query(FeedbackReport)
        .filter(
            FeedbackReport.status.in_(["new", "reviewing"]),
            FeedbackReport.title.ilike("live acceptance%"),
        )
        .all()
    )

    for report in reports:
        report.status = "closed"
        report.admin_note = "Closed automatically by live acceptance cleanup."

    _write_audit(
        db,
        request,
        admin,
        "cleanup",
        "feedback",
        "live_acceptance",
        detail=f"closed={len(reports)}",
    )
    db.commit()

    remaining_open = db.query(FeedbackReport).filter(
        FeedbackReport.status.in_(["new", "reviewing"])
    ).count()
    return {
        "closed_count": len(reports),
        "remaining_open_count": remaining_open,
    }


@router.get("/audit-logs", response_model=list[AdminAuditLogResponse])
async def list_audit_logs(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(50)
        .all()
    )
