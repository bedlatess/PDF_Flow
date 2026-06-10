"""Hidden admin console endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.models.user import (
    AdminAuditLog,
    ContentBlock,
    FeatureFlag,
    SiteSetting,
    User,
    UserRole,
)
from app.services.feature_gate import DEFAULT_FEATURE_FLAGS
from app.schemas.admin import (
    AdminAuditLogResponse,
    AdminOverviewResponse,
    ContentBlockResponse,
    ContentBlockUpdate,
    FeatureFlagResponse,
    FeatureFlagUpdate,
    SiteSettingResponse,
    SiteSettingUpdate,
)

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
        "description": "后续可接入前台，用于临时关闭公开服务。",
    },
]

DEFAULT_CONTENT_BLOCKS = [
    ("privacy_policy", "zh", "隐私政策", "由后台接管后，可在这里维护隐私政策正文。"),
    ("terms_of_service", "zh", "服务条款", "由后台接管后，可在这里维护服务条款正文。"),
    ("home_hero", "zh", "首页主标题", "用于后续从后台维护首页首屏文案。"),
    ("pricing_intro", "zh", "定价页说明", "用于后续从后台维护定价页说明。"),
]


def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require an authenticated admin user."""
    if _role_value(current_user) != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def _seed_defaults(db: Session) -> None:
    if db.query(SiteSetting).count() == 0:
        db.add_all(SiteSetting(**item) for item in DEFAULT_SETTINGS)

    if db.query(FeatureFlag).count() == 0:
        db.add_all(
            FeatureFlag(
                key=key,
                label=label,
                description=description,
                enabled=enabled,
                requires_login=requires_login,
                requires_pro=requires_pro,
            )
            for key, label, description, enabled, requires_login, requires_pro in DEFAULT_FEATURE_FLAGS
        )

    if db.query(ContentBlock).count() == 0:
        db.add_all(
            ContentBlock(key=key, locale=locale, title=title, content=content)
            for key, locale, title, content in DEFAULT_CONTENT_BLOCKS
        )

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
        "recent_audit_logs": recent_logs,
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
