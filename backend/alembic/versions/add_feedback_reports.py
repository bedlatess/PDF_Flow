"""Add feedback reports

Revision ID: add_feedback_reports
Revises: add_admin_console_models
Create Date: 2026-06-11
"""
from alembic import op
import sqlalchemy as sa


revision = "add_feedback_reports"
down_revision = "add_admin_console_models"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "feedback_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=False, server_default="bug"),
        sa.Column("severity", sa.String(), nullable=False, server_default="normal"),
        sa.Column("status", sa.String(), nullable=False, server_default="new"),
        sa.Column("page_url", sa.Text(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("diagnostic_code", sa.String(), nullable=True),
        sa.Column("diagnostics", sa.Text(), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_feedback_reports_id", "feedback_reports", ["id"])
    op.create_index("ix_feedback_reports_created_at", "feedback_reports", ["created_at"])
    op.create_index("idx_feedback_status", "feedback_reports", ["status"])
    op.create_index("idx_feedback_created", "feedback_reports", ["created_at"])
    op.create_index("idx_feedback_user", "feedback_reports", ["user_id"])


def downgrade():
    op.drop_index("idx_feedback_user", table_name="feedback_reports")
    op.drop_index("idx_feedback_created", table_name="feedback_reports")
    op.drop_index("idx_feedback_status", table_name="feedback_reports")
    op.drop_index("ix_feedback_reports_created_at", table_name="feedback_reports")
    op.drop_index("ix_feedback_reports_id", table_name="feedback_reports")
    op.drop_table("feedback_reports")
