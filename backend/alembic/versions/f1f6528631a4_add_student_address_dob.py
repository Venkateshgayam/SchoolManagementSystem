"""add address and date_of_birth to students

Revision ID: f1f6528631a4
Revises: f0f6528631a3
Create Date: 2026-08-14 10:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f1f6528631a4'
down_revision = 'f0f6528631a3'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('students', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('date_of_birth', sa.Date(), nullable=True))

def downgrade() -> None:
    op.drop_column('students', 'date_of_birth')
    op.drop_column('students', 'address')