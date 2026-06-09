"""Add webhook model

Revision ID: add_webhook_model
Revises: 001_initial
Create Date: 2026-06-09

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_webhook_model'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade():
    # Create webhooks table
    op.create_table(
        'webhooks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('events', sa.String(), nullable=False),
        sa.Column('secret', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('total_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('successful_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_triggered_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_webhook_user', 'webhooks', ['user_id'])
    op.create_index('idx_webhook_active', 'webhooks', ['is_active'])


def downgrade():
    op.drop_index('idx_webhook_active', table_name='webhooks')
    op.drop_index('idx_webhook_user', table_name='webhooks')
    op.drop_table('webhooks')
