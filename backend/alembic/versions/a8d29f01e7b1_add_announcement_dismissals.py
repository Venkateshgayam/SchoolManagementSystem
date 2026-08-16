"""Add announcement_dismissals table

Revision ID: a8d29f01e7b1
Revises: ca59f8ec
Create Date: 2026-08-16 13:28:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a8d29f01e7b1'
down_revision = 'ca59f8ec'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'announcement_dismissals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('announcement_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['announcement_id'], ['announcements.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_announcement_dismissals_id'), 'announcement_dismissals', ['id'], unique=False)
    op.create_index(op.f('ix_announcement_dismissals_announcement_id'), 'announcement_dismissals', ['announcement_id'], unique=False)
    op.create_index(op.f('ix_announcement_dismissals_user_id'), 'announcement_dismissals', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_announcement_dismissals_user_id'), table_name='announcement_dismissals')
    op.drop_index(op.f('ix_announcement_dismissals_announcement_id'), table_name='announcement_dismissals')
    op.drop_index(op.f('ix_announcement_dismissals_id'), table_name='announcement_dismissals')
    op.drop_table('announcement_dismissals')
