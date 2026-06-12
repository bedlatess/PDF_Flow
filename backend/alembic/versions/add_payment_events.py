"""Add payment event ledger."""

from alembic import op
import sqlalchemy as sa


revision = "add_payment_events"
down_revision = "add_payment_domain_models"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "payment_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("provider_event_id", sa.String(), nullable=False),
        sa.Column("merchant_order_id", sa.String(), nullable=False),
        sa.Column("provider_order_id", sa.String(), nullable=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("processing_status", sa.String(), nullable=False, server_default="received"),
        sa.Column("amount_cents", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(), nullable=True),
        sa.Column("raw_summary", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["order_id"], ["payment_orders.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_event_id", name="uq_payment_event_provider_event"),
    )
    op.create_index("idx_payment_event_order", "payment_events", ["order_id"])
    op.create_index(
        "idx_payment_event_provider_status",
        "payment_events",
        ["provider", "processing_status"],
    )
    op.create_index(
        "idx_payment_event_merchant_order",
        "payment_events",
        ["merchant_order_id"],
    )


def downgrade():
    op.drop_index("idx_payment_event_merchant_order", table_name="payment_events")
    op.drop_index("idx_payment_event_provider_status", table_name="payment_events")
    op.drop_index("idx_payment_event_order", table_name="payment_events")
    op.drop_table("payment_events")
