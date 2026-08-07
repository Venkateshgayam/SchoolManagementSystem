"""Alembic script template."""
from alembic import op
import sqlalchemy as sa

revision = "{{ revision }}"
down_revision = "{{ down_revision }}"
branch_labels = {{ branch_labels | tojson }}
depends_on = {{ depends_on | tojson }}


def upgrade() -> None:
    {{ upgrade() }}


def downgrade() -> None:
    {{ downgrade() }}