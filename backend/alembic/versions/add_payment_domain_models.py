"""Add provider-agnostic payment domain models."""

from alembic import op
import sqlalchemy as sa


revision = "add_payment_domain_models"
down_revision = "add_api_error_logs"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "payment_provider_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("provider_customer_id", sa.String(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "provider",
            name="uq_payment_provider_account_user_provider",
        ),
    )
    op.create_index(
        "idx_payment_provider_account_user",
        "payment_provider_accounts",
        ["user_id"],
    )
    op.create_index(
        "idx_payment_provider_account_provider",
        "payment_provider_accounts",
        ["provider"],
    )

    op.create_table(
        "payment_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("merchant_order_id", sa.String(), nullable=False),
        sa.Column("provider_order_id", sa.String(), nullable=True),
        sa.Column("plan", sa.String(), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="USD"),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("checkout_url", sa.Text(), nullable=True),
        sa.Column("qr_code_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("merchant_order_id"),
    )
    op.create_index("idx_payment_orders_created_at", "payment_orders", ["created_at"])
    op.create_index("idx_payment_order_user", "payment_orders", ["user_id"])
    op.create_index(
        "idx_payment_order_provider_status",
        "payment_orders",
        ["provider", "status"],
    )
    op.create_index(
        "idx_payment_order_provider_order",
        "payment_orders",
        ["provider", "provider_order_id"],
    )


def downgrade():
    op.drop_index("idx_payment_order_provider_order", table_name="payment_orders")
    op.drop_index("idx_payment_order_provider_status", table_name="payment_orders")
    op.drop_index("idx_payment_order_user", table_name="payment_orders")
    op.drop_index("idx_payment_orders_created_at", table_name="payment_orders")
    op.drop_table("payment_orders")
    op.drop_index("idx_payment_provider_account_provider", table_name="payment_provider_accounts")
    op.drop_index("idx_payment_provider_account_user", table_name="payment_provider_accounts")
    op.drop_table("payment_provider_accounts")
