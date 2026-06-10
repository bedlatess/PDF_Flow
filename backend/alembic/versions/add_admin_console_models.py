"""Add hidden admin console models

Revision ID: add_admin_console_models
Revises: add_webhook_model
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa


revision = "add_admin_console_models"
down_revision = "add_webhook_model"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "site_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("value", sa.Text(), nullable=False, server_default=""),
        sa.Column("value_type", sa.String(), nullable=False, server_default="text"),
        sa.Column("setting_group", sa.String(), nullable=False, server_default="general"),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_site_setting_key", "site_settings", ["key"], unique=True)
    op.create_index("idx_site_setting_group", "site_settings", ["setting_group"])

    op.create_table(
        "feature_flags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("requires_login", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("requires_pro", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("maintenance_message", sa.Text(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_feature_flag_key", "feature_flags", ["key"], unique=True)
    op.create_index("idx_feature_flag_enabled", "feature_flags", ["enabled"])

    op.create_table(
        "content_blocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("locale", sa.String(), nullable=False, server_default="zh"),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key", "locale", name="uq_content_block_key_locale"),
    )
    op.create_index("idx_content_block_key", "content_blocks", ["key"])
    op.create_index("idx_content_block_locale", "content_blocks", ["locale"])

    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("admin_user_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(), nullable=False),
        sa.Column("target_key", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="success"),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["admin_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_audit_logs_created_at", "admin_audit_logs", ["created_at"])
    op.create_index("idx_admin_audit_admin", "admin_audit_logs", ["admin_user_id"])
    op.create_index("idx_admin_audit_target", "admin_audit_logs", ["target_type", "target_key"])


def downgrade():
    op.drop_index("idx_admin_audit_target", table_name="admin_audit_logs")
    op.drop_index("idx_admin_audit_admin", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_created_at", table_name="admin_audit_logs")
    op.drop_table("admin_audit_logs")

    op.drop_index("idx_content_block_locale", table_name="content_blocks")
    op.drop_index("idx_content_block_key", table_name="content_blocks")
    op.drop_table("content_blocks")

    op.drop_index("idx_feature_flag_enabled", table_name="feature_flags")
    op.drop_index("idx_feature_flag_key", table_name="feature_flags")
    op.drop_table("feature_flags")

    op.drop_index("idx_site_setting_group", table_name="site_settings")
    op.drop_index("idx_site_setting_key", table_name="site_settings")
    op.drop_table("site_settings")
