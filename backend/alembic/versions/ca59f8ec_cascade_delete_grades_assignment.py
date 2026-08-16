"""cascade delete grades on assignment delete

Revision ID: ca59f8ec
Revises: f0b1caff7a64
Create Date: 2026-08-16 10:37:00.000000

"""
from typing import Set, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ca59f8ec'
down_revision = 'f0b1caff7a64'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('grades') as batch_op:
        batch_op.drop_constraint('grades_assignment_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(
            'grades_assignment_id_fkey',
            'assignments',
            ['assignment_id'],
            ['id'],
            ondelete='CASCADE'
        )


def downgrade() -> None:
    with op.batch_alter_table('grades') as batch_op:
        batch_op.drop_constraint('grades_assignment_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(
            'grades_assignment_id_fkey',
            'assignments',
            ['assignment_id'],
            ['id'],
            ondelete='SET NULL'
        )
